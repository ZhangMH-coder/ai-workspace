/**
 * Service 层（P4-2b）
 *
 * 职责：业务规则（生命周期校验 / 幂等 / 派生统计 / 演示运行时）。
 * - 不写 SQL（走 Repository）；不抛 HTTP 语义（抛 ServiceError，由 Route Handler 映射 ApiError）
 * - 所有 ID 由服务端生成（UUID v4）；前端不生成业务 id
 *
 * 领域规则（对齐已验收规则）：
 * - Capability 生命周期（active/archived）与使用状态（used/unused，派生）分离
 * - 归档 = 软删除：不影响已有装配；归档后不可新装配；恢复后重新可装配
 * - 项目统计全部派生（ProjectAgent → Agent → Run），Run 无 projectId
 * - 时间窗口：服务端只接受显式 from/to，纯执行（前端唯一窗口实现）
 */
import { randomUUID } from "node:crypto";
import * as repo from "./repository";
import { clearAll, runSeed } from "./seed";
import { canTransition } from "@/lib/runtime/contracts";
import type { CapabilitySource, RunLifecycleStatus, RuntimeRequest } from "@/lib/runtime/contracts";
import { createRuntime, createProviderRegistry } from "@/lib/runtime/runtime";
import { mockProvider } from "@/lib/runtime/mock-provider";
import { runDiscoveryScan } from "@/lib/discovery/scanner";
import { ADAPTERS } from "@/lib/discovery/registry";
import { computeInputFingerprint, computeMetaHash } from "@/lib/analysis/fingerprint";
import { readDocument } from "@/lib/analysis/reader";
import { CURRENT_ANALYZER_VERSION, getAnalyzer } from "@/lib/analysis/registry";
import type { AnalysisInput } from "@/lib/analysis/types";
import { randomUUID as uuid } from "node:crypto";
import type {
  AnalysisRunResult,
  AnalysisStatus,
  AnalysisStatusSummary,
  AnalysisStrategy,
  CapabilityCategory,
  CapabilityIndexEntry,
  DiscoveredResource,
  DiscoveryOverview,
  HarnessScanSummary,
  ResourceAnalysis,
  ResourceCapability,
  ResourceInsight,
  RunScanResult,
  ScanRun,
  ScanStatus,
  TaskMatchResult,
} from "@/lib/types";
import type {
  DiscoveredResourceRow,
  HarnessScanRow,
  ResourceAnalysisRow,
  ResourceCapabilityRow,
  ScanRunRow,
} from "./schema";

/** 统一内部错误（code 对齐 ApiErrorCode；CONFLICT 语义由具体业务触发） */
export class ServiceError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** 归一化任意可解析时间为 UTC ISO 字符串（保证存储与查询边界统一比较） */
export function normalizeISO(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ServiceError("VALIDATION_ERROR", `无效时间值: ${value}`);
  }
  return d.toISOString();
}

/* ---------------- Agent ---------------- */

export interface CreateAgentInput {
  name: string;
  description?: string;
  model: string;
  systemPrompt?: string;
}

export function createAgent(input: CreateAgentInput) {
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    name: input.name,
    description: input.description ?? "",
    model: input.model,
    status: "idle",
    systemPrompt: input.systemPrompt ?? "",
    createdAt: now,
    lastRunAt: null,
  };
  return repo.insertAgent(row);
}

/* ================= AI Runtime（P5-2） ================= */

/**
 * Real 模式 CapabilitySource：SQLite 为事实数据源（Repository 查询）。
 * Runtime 经此接口只读消费 Definition(资产) + AgentCapability(装配)。
 */
const realCapabilitySource: CapabilitySource = {
  getAgent(agentId) {
    const a = repo.getAgent(agentId);
    if (!a) return null;
    return { id: a.id, name: a.name, systemPrompt: a.systemPrompt, model: a.model };
  },
  listAssemblies(agentId) {
    return repo.listRuntimeAssemblies(agentId);
  },
};

/** P5-2 唯一 Provider 注册表（mock）；未来 Adapter 在此注册 */
const realRuntime = createRuntime({
  source: realCapabilitySource,
  providers: createProviderRegistry({ mock: mockProvider }),
});

/**
 * 触发 Agent 运行（P5-2 起经 Runtime 编排执行，不再直接随机造数）
 *
 * 执行链：Service.runAgent → Runtime.execute → MockProvider.execute
 *         → RuntimeResult → Service 状态迁移 + 持久化 Run
 *
 * 状态机：queued → running → succeeded|failed|cancelled；
 * 非法转换（succeeded→running 等）在 Service 层拦截（CONFLICT）。
 */
export async function runAgent(agentId: string, input?: string) {
  const agent = repo.getAgent(agentId);
  if (!agent) throw new ServiceError("NOT_FOUND", "Agent 不存在");

  const nowIso = new Date().toISOString();
  const now = Date.now();

  // 并发约束：同一 Agent 存在 queued/running 时拒绝（409）
  const active = repo.listRuns(
    { agentIds: [agentId], status: "queued" },
    { page: 1, pageSize: 1 }
  );
  const active2 = repo.listRuns(
    { agentIds: [agentId], status: "running" },
    { page: 1, pageSize: 1 }
  );
  if (active.total + active2.total > 0) {
    throw new ServiceError("CONFLICT", "该 Agent 已有运行中的任务，请稍后再试");
  }

  // 1) 创建 Run（queued）
  const runId = randomUUID();
  repo.insertRun({
    id: runId,
    agentId,
    status: "queued",
    summary: "任务已排队，等待调度",
    durationMs: null,
    tokensUsed: 0,
    messages: 0,
    startedAt: nowIso,
    finishedAt: null,
  });

  // 2) queued → running（同步执行：先置 running 再执行）
  const running = repo.updateRun(runId, { status: "running" });
  if (!running) throw new ServiceError("NOT_FOUND", "Run 不存在");

  // 3) Runtime 编排执行（Provider 选择在 Runtime 内部，Service 不接触 Provider）
  const req: RuntimeRequest = {
    runId,
    agentId,
    input: input ?? "",
    modelConfig: { provider: "mock", model: agent.model, temperature: 0.7, maxTokens: 4096, timeoutMs: 120_000, retry: { maxAttempts: 2, backoffMs: 1_000 } },
    source: "ui",
  };
  const result = await realRuntime.execute(req);

  // 4) 状态迁移校验（running → 终态；非法转换拦截）
  const target = result.status as RunLifecycleStatus;
  if (!canTransition("running", target)) {
    throw new ServiceError("CONFLICT", `非法状态转换: running → ${target}`);
  }

  // 5) 终态落库（含 usage / model / provider / error）
  const finished = new Date(now + result.durationMs).toISOString();
  repo.updateRun(runId, {
    status: target,
    summary: result.summary,
    durationMs: result.durationMs,
    tokensUsed: result.usage.totalTokens,
    finishedAt: finished,
    model: agent.model,
    provider: "mock",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    errorCode: result.error?.code,
    errorMessage: result.error?.message,
  });

  // 6) 更新 Agent lastRunAt
  repo.updateAgent(agentId, { lastRunAt: nowIso });

  return repo.getRun(runId);
}

/* ---------------- CapabilityDefinition ---------------- */

export type CapabilityType = "skill" | "memory" | "rule" | "tool";
export type CapabilityLifecycle = "active" | "archived";

export interface CreateCapabilityInput {
  type: CapabilityType;
  name: string;
  description?: string;
}

export function createCapability(input: CreateCapabilityInput) {
  const now = new Date().toISOString();
  return repo.insertCapabilityDefinition({
    id: randomUUID(),
    type: input.type,
    name: input.name,
    description: input.description ?? "",
    lifecycle: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export function updateCapability(id: string, patch: { name?: string; description?: string; type?: CapabilityType }) {
  const existing = repo.getCapabilityDefinition(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "Capability 不存在");
  const updated = repo.updateCapabilityDefinition(id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export function setCapabilityLifecycle(id: string, lifecycle: CapabilityLifecycle) {
  const existing = repo.getCapabilityDefinition(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "Capability 不存在");
  return repo.updateCapabilityDefinition(id, {
    lifecycle,
    updatedAt: new Date().toISOString(),
  });
}

/* ---------------- AgentCapability ---------------- */

export function attachCapability(agentId: string, capabilityId: string) {
  if (!repo.getAgent(agentId)) throw new ServiceError("NOT_FOUND", "Agent 不存在");
  const definition = repo.getCapabilityDefinition(capabilityId);
  if (!definition) throw new ServiceError("NOT_FOUND", "Capability 不存在");
  // 归档后不可新装配（领域规则；已装配的不受影响）
  if (definition.lifecycle === "archived") {
    throw new ServiceError("CONFLICT", "该 Capability 已归档，不能装配到新 Agent");
  }
  if (repo.getAgentCapabilityByPair(agentId, capabilityId)) {
    throw new ServiceError("CONFLICT", "该 Capability 已装配到此 Agent");
  }
  return repo.insertAgentCapability({
    id: randomUUID(),
    agentId,
    capabilityId,
    enabled: true,
    createdAt: new Date().toISOString(),
  });
}

export function setCapabilityEnabled(id: string, enabled: boolean) {
  const existing = repo.getAgentCapability(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "装配关系不存在");
  return repo.updateAgentCapability(id, { enabled });
}

export function detachCapability(id: string) {
  const existing = repo.getAgentCapability(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "装配关系不存在");
  repo.deleteAgentCapability(id);
  return existing;
}

/* ---------------- Project ---------------- */

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export function createProject(input: CreateProjectInput) {
  const now = new Date().toISOString();
  return repo.insertProject({
    id: randomUUID(),
    name: input.name,
    description: input.description ?? "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export function attachAgentToProject(projectId: string, agentId: string) {
  if (!repo.getProject(projectId)) throw new ServiceError("NOT_FOUND", "Project 不存在");
  if (!repo.getAgent(agentId)) throw new ServiceError("NOT_FOUND", "Agent 不存在");
  if (repo.getProjectAgentByPair(projectId, agentId)) {
    throw new ServiceError("CONFLICT", "该 Agent 已关联到此项目");
  }
  return repo.insertProjectAgent({
    id: randomUUID(),
    projectId,
    agentId,
    addedAt: new Date().toISOString(),
  });
}

export function detachAgentFromProject(id: string) {
  const existing = repo.getProjectAgent(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "关联关系不存在");
  repo.deleteProjectAgent(id);
  return existing;
}

/* ---------------- Demo Reset ---------------- */

export function resetDemo() {
  clearAll();
  return runSeed();
}
/* ---------------- Resource Discovery（本地资源发现，V1 MVP） ----------------
 *
 * 编排：扫描器（只读）→ 幂等 upsert 索引（by sourcePath）→ 汇总落库。
 * 页面 / Store 不直接接触文件系统；所有发现数据以 SQLite 为事实源。
 */

function adapterNameById(id: string): string {
  return ADAPTERS.find((a) => a.id === id)?.name ?? id;
}

function adapterFrameworkById(id: string): string {
  return ADAPTERS.find((a) => a.id === id)?.framework ?? "";
}

function scanRunToDomain(row: ScanRunRow | null): ScanRun | null {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status as ScanStatus,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    locations: JSON.parse(row.scanRoots) as ScanRun["locations"],
    byHarness: JSON.parse(row.byHarness) as Record<string, number>,
    byType: JSON.parse(row.byType) as Record<string, number>,
    totalResources: row.totalResources,
    parseableCount: row.parseableCount,
  };
}

function harnessScanToDomain(
  row: Pick<
    HarnessScanRow,
    "harnessId" | "harnessName" | "rootPath" | "found" | "resourceCount" | "scannedAt"
  >
): HarnessScanSummary {
  return {
    harnessId: row.harnessId,
    harnessName: row.harnessName,
    rootPath: row.rootPath,
    found: row.found,
    resourceCount: row.resourceCount,
    scannedAt: row.scannedAt,
  };
}

function resourceToDomain(row: DiscoveredResourceRow): DiscoveredResource {
  return {
    id: row.id,
    scanId: row.scanId,
    harnessId: row.harnessId,
    type: row.type as DiscoveredResource["type"],
    name: row.name,
    description: row.description,
    source: row.source,
    sourcePath: row.sourcePath,
    framework: row.framework,
    version: row.version,
    status: row.status === "enabled" ? "enabled" : "unknown",
    parseable: row.parseable,
    parseNote: row.parseNote,
    lastModified: row.lastModified,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
  };
}

/** 执行一次全量只读扫描并更新索引（幂等：by sourcePath upsert） */
export function runResourceScan(): RunScanResult {
  const outcome = runDiscoveryScan();
  const now = new Date().toISOString();
  const scanId = randomUUID();

  const byHarness: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let parseableCount = 0;
  for (const r of outcome.resources) {
    byHarness[r.harnessId] = (byHarness[r.harnessId] ?? 0) + 1;
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    if (r.parseable) parseableCount += 1;
  }

  repo.insertScanRun({
    id: scanId,
    status: (outcome.errors.length > 0 ? "partial" : "completed") as ScanStatus,
    startedAt: now,
    finishedAt: now,
    scanRoots: JSON.stringify(outcome.locations),
    byHarness: JSON.stringify(byHarness),
    byType: JSON.stringify(byType),
    totalResources: outcome.resources.length,
    parseableCount,
  });

  const harnessSummaries: HarnessScanSummary[] = [];
  for (const h of outcome.harnessScans) {
    repo.insertHarnessScan({
      id: randomUUID(),
      scanId,
      harnessId: h.harnessId,
      harnessName: h.harnessName,
      rootPath: h.rootPath,
      found: h.found,
      resourceCount: h.resourceCount,
      scannedAt: h.scannedAt,
    });
    harnessSummaries.push(harnessScanToDomain(h));
  }

  const resources: DiscoveredResource[] = [];
  for (const r of outcome.resources) {
    const row = repo.upsertDiscoveredResource({
      id: randomUUID(),
      scanId,
      harnessId: r.harnessId,
      type: r.type,
      name: r.name,
      description: r.description,
      source: adapterNameById(r.harnessId),
      sourcePath: r.sourcePath,
      framework: adapterFrameworkById(r.harnessId),
      version: r.version ?? null,
      status: r.status ?? "unknown",
      parseable: r.parseable,
      parseNote: r.parseNote ?? null,
      lastModified: r.lastModified,
      metadata: JSON.stringify(r.metadata ?? {}),
    });
    resources.push(resourceToDomain(row));
  }

  return {
    scanRun: scanRunToDomain(repo.getScanRun(scanId))!,
    harnesses: harnessSummaries,
    resources,
  };
}

/** 最新一次扫描的概览（无扫描 → null 区块 + 空统计，供空态展示） */
export function getDiscoveryOverview(): DiscoveryOverview {
  const latest = repo.getLatestScanRun();
  if (!latest) {
    return { scanRun: null, harnesses: [], totalResources: 0, parseableCount: 0, lastScannedAt: null };
  }
  const harnesses = repo.listHarnessScansByScan(latest.id).map(harnessScanToDomain);
  return {
    scanRun: scanRunToDomain(latest),
    harnesses,
    totalResources: latest.totalResources,
    parseableCount: latest.parseableCount,
    lastScannedAt: latest.finishedAt,
  };
}

/** 资源列表（支持搜索 / 类型 / Harness / 可解析过滤 + 分页） */
export function listDiscoveredResources(q: {
  search?: string;
  type?: string;
  harness?: string;
  parseable?: boolean;
  page: number;
  pageSize: number;
}) {
  const { items, total } = repo.listDiscoveredResources(q);
  return { items: items.map(resourceToDomain), total };
}

export function getDiscoveredResource(id: string): DiscoveredResource {
  const row = repo.getDiscoveredResource(id);
  if (!row) throw new ServiceError("NOT_FOUND", "资源不存在");
  return resourceToDomain(row);
}

/* ---------------- Resource Intelligence（Phase 2：能力分析 / 能力索引） ---------------- */

function analysisToDomain(row: ResourceAnalysisRow): ResourceAnalysis {
  return {
    id: row.id,
    resourceId: row.resourceId,
    status: row.status as AnalysisStatus,
    strategy: row.strategy as AnalysisStrategy,
    analyzerVersion: row.analyzerVersion,
    createdAt: row.createdAt,
    analyzedAt: row.analyzedAt,
    inputFingerprint: row.inputFingerprint,
    resourceMtime: row.resourceMtime,
    isCurrent: row.isCurrent,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    summary: row.summary,
  };
}

function capabilityToDomain(row: ResourceCapabilityRow): ResourceCapability {
  return {
    id: row.id,
    analysisId: row.analysisId,
    resourceId: row.resourceId,
    capability: row.capability,
    category: row.category as CapabilityCategory,
    keywords: JSON.parse(row.keywords) as string[],
    confidence: row.confidence,
    evidenceRef: row.evidenceRef,
    evidenceSnippet: row.evidenceSnippet,
    inputContext: JSON.parse(row.inputContext) as Record<string, unknown>,
    executionHint: row.executionHint,
  };
}

/**
 * 增量分析：指纹相同跳过，仅处理 新增 / 变化 / 失败（或 force）资源。
 * 历史保留：同键（resourceId+fingerprint+version）更新不新增；新指纹生成新记录，
 * 旧记录保留为历史（isCurrent=false）。
 */
export function runIncrementalAnalysis(opts?: {
  force?: boolean;
  resourceIds?: string[];
}): AnalysisRunResult {
  const version = CURRENT_ANALYZER_VERSION;
  const analyzer = getAnalyzer();
  const resources = opts?.resourceIds?.length
    ? opts.resourceIds
        .map((id) => repo.getDiscoveredResource(id))
        .filter((r): r is DiscoveredResourceRow => r !== null)
    : repo.listAllDiscoveredResources();
  const result: AnalysisRunResult = { processed: 0, skipped: 0, analyzed: 0, failed: 0 };
  const now = new Date().toISOString();

  for (const row of resources) {
    const metadata = (() => {
      try {
        return JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    })();
    const fp = computeInputFingerprint({
      sourcePath: row.sourcePath,
      lastModified: row.lastModified,
      metaHash: computeMetaHash(metadata),
    });
    const existing = repo.getAnalysisByFingerprint(row.id, fp, version);
    if (!opts?.force && existing?.status === "analyzed") {
      result.skipped += 1;
      continue;
    }

    result.processed += 1;
    const resource = resourceToDomain(row);
    try {
      const doc = readDocument({
        type: row.type as DiscoveredResource["type"],
        sourcePath: row.sourcePath,
        metadata,
      });
      const input: AnalysisInput = { resource, document: doc };
      const outcome = analyzer.analyze(input);
      if (outcome.status === "failed") {
        throw new Error(outcome.errorMessage ?? "ANALYSIS_FAILED");
      }
      const analysisId = existing?.id ?? uuid();
      repo.upsertResourceAnalysis({
        id: analysisId,
        resourceId: row.id,
        status: "analyzed",
        strategy: analyzer.strategy,
        analyzerVersion: version,
        createdAt: existing?.createdAt ?? now,
        analyzedAt: now,
        inputFingerprint: fp,
        resourceMtime: row.lastModified,
        isCurrent: true,
        errorCode: null,
        errorMessage: null,
        summary: outcome.summary,
      });
      // 替换该分析的能力标签（同键更新时旧标签仍存在，先删）
      repo.deleteCapabilitiesByAnalysis(analysisId);
      for (const c of outcome.capabilities) {
        repo.insertResourceCapability({
          id: uuid(),
          analysisId,
          resourceId: row.id,
          capability: c.capability,
          category: c.category,
          keywords: JSON.stringify(c.keywords),
          confidence: c.confidence,
          evidenceRef: c.evidenceRef,
          evidenceSnippet: c.evidenceSnippet,
          inputContext: JSON.stringify({
            headings: doc.headings.slice(0, 5),
            references: doc.references.slice(0, 10),
            fileSize: doc.fileSize,
            mainFile: doc.filePath,
          }),
          executionHint: c.executionHint ?? null,
        });
      }
      repo.markOtherAnalysesNotCurrent(row.id, analysisId);
      result.analyzed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const otherCurrent = repo.getCurrentAnalysis(row.id);
      const code = msg.includes("DOCUMENT_NOT_FOUND")
        ? "DOCUMENT_NOT_FOUND"
        : msg.includes("DOCUMENT_UNREADABLE")
          ? "DOCUMENT_UNREADABLE"
          : "ANALYSIS_FAILED";
      // 同指纹覆盖为 failed：旧标签一并失效（该输入当前已无法解析，不应残留旧规则产物）
      if (existing) repo.deleteCapabilitiesByAnalysis(existing.id);
      repo.upsertResourceAnalysis({
        id: existing?.id ?? uuid(),
        resourceId: row.id,
        status: "failed",
        strategy: analyzer.strategy,
        analyzerVersion: version,
        createdAt: existing?.createdAt ?? now,
        analyzedAt: null,
        inputFingerprint: fp,
        resourceMtime: row.lastModified,
        // 保持旧有效分析可用；无任何 current 时 failed 作为当前状态展示
        isCurrent: existing?.isCurrent ?? (otherCurrent ? false : true),
        errorCode: code,
        errorMessage: msg,
        summary: null,
      });
      result.failed += 1;
    }
  }
  return result;
}

/** 分析状态概览 */
export function getAnalysisStatus(): AnalysisStatusSummary {
  const total = repo.countDiscoveredResources();
  const byStatus = repo.countAnalysisStatus();
  const { caps } = repo.countAnalysisMeta();
  return {
    totalResources: total,
    analyzed: byStatus["analyzed"] ?? 0,
    pending: byStatus["pending"] ?? 0,
    failed: byStatus["failed"] ?? 0,
    expired: byStatus["expired"] ?? 0,
    capabilityCount: caps,
    lastRunAt: repo.getLastAnalysisAt(),
    analyzerVersion: CURRENT_ANALYZER_VERSION,
  };
}

/** 资源洞察（详情页：事实 + 当前分析 + 能力标签 + 历史） */
export function getResourceInsight(resourceId: string): ResourceInsight {
  const row = repo.getDiscoveredResource(resourceId);
  if (!row) throw new ServiceError("NOT_FOUND", "资源不存在");
  const current = repo.getCurrentAnalysis(resourceId);
  const capabilities = current
    ? repo.listCurrentCapabilitiesByResource(resourceId).map(capabilityToDomain)
    : [];
  const history = repo
    .listAnalysesByResource(resourceId)
    .filter((a) => !(current && a.id === current.id))
    .map(analysisToDomain);
  return {
    resource: resourceToDomain(row),
    currentAnalysis: current ? analysisToDomain(current) : null,
    capabilities,
    history,
  };
}

/** 能力索引（按类别分组，来自当前有效分析） */
export function listCapabilityIndex(): CapabilityIndexEntry[] {
  const rows = repo.listAllCurrentCapabilities();
  const map = new Map<CapabilityCategory, CapabilityIndexEntry>();
  for (const { cap, resource } of rows) {
    const cat = cap.category as CapabilityCategory;
    if (!map.has(cat)) map.set(cat, { category: cat, count: 0, items: [] });
    const entry = map.get(cat)!;
    entry.count += 1;
    entry.items.push({
      resourceId: resource.id,
      resourceName: resource.name,
      harnessId: resource.harnessId,
      capability: cap.capability,
      confidence: cap.confidence,
      evidenceRef: cap.evidenceRef,
    });
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ ...e, items: e.items.slice(0, 60) }));
}

/** 任务分词：英文词 + 中文 2-gram / 3-gram（中文无空格，整句无法直接匹配） */
function tokenizeTask(task: string): string[] {
  const s = task.toLowerCase().trim();
  const tokens = new Set<string>();
  for (const t of s.split(/[^a-z0-9]+/)) {
    if (t.length >= 2) tokens.add(t);
  }
  const han = s.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  for (let i = 0; i < han.length - 1; i += 1) tokens.add(han.slice(i, i + 2));
  for (let i = 0; i < han.length - 2; i += 1) tokens.add(han.slice(i, i + 3));
  return [...tokens];
}

/** 任务 → 资源匹配（派生打分，不落库） */
export function matchResourcesForTask(task: string, limit = 10): TaskMatchResult {
  const tokens = tokenizeTask(task);
  const rows = repo.listAllCurrentCapabilities();
  const matches: TaskMatchResult["matches"] = [];
  for (const { cap, resource } of rows) {
    const hay = [
      cap.capability,
      cap.keywords,
      cap.evidenceSnippet,
      resource.name,
      resource.description,
    ]
      .join(" ")
      .toLowerCase();
    const hits = tokens.filter((t) => t.length >= 2 && hay.includes(t)).length;
    // 反向匹配：资源关键词出现在任务文本中
    const kwHits = (JSON.parse(cap.keywords) as string[]).filter(
      (k) => k.length >= 2 && task.toLowerCase().includes(k)
    ).length;
    if (hits === 0 && kwHits === 0) continue;
    const score = Math.min(1, (Math.min(hits + kwHits, 5) / 5) * 0.65 + cap.confidence * 0.35);
    matches.push({
      resourceId: resource.id,
      resourceName: resource.name,
      harnessId: resource.harnessId,
      type: resource.type as DiscoveredResource["type"],
      capability: cap.capability,
      category: cap.category as CapabilityCategory,
      confidence: cap.confidence,
      evidenceRef: cap.evidenceRef,
      score: Math.round(score * 100) / 100,
    });
  }
  matches.sort((a, b) => b.score - a.score);
  return { task, matches: matches.slice(0, limit) };
}
