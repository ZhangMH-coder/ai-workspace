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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as repo from "./repository";
import { clearAll, runSeed } from "./seed";
import { canTransition } from "@/lib/runtime/contracts";
import type { CapabilitySource, RunLifecycleStatus, RuntimeRequest } from "@/lib/runtime/contracts";
import { createRuntime, createProviderRegistry } from "@/lib/runtime/runtime";
import { createLLMProvider } from "@/lib/runtime/llm-provider";
import { runDiscoveryScan } from "@/lib/discovery/scanner";
import { ADAPTERS } from "@/lib/discovery/registry";
import { computeInputFingerprint, computeMetaHash } from "@/lib/analysis/fingerprint";
import { readDocument } from "@/lib/analysis/reader";
import { CURRENT_ANALYZER_VERSION, getAnalyzer } from "@/lib/analysis/registry";
import type { AnalysisInput } from "@/lib/analysis/types";
import { computeTaskFingerprint } from "@/lib/analysis/fingerprint";
import {
  analyzeTask as analyzeTaskCore,
  TASK_ANALYZER_VERSION,
  type RecommendationPlan,
  type RetrievableCapability,
} from "@/lib/task-intelligence";
import { discoverStaticConfig, isLLMConfigured, maskKey, DEFAULT_BASE_URL, DEFAULT_MODEL } from "@/lib/ai/config";
import { llmUnderstandTask } from "@/lib/ai/task-understand";
import { interpretResourceText } from "@/lib/ai/interpret-resource";
import { chatCompletion, listModels } from "@/lib/ai/client";
import type { LLMConfig } from "@/lib/ai/config";
import { randomUUID as uuid } from "node:crypto";
import { heuristicPlanner, PLANNER_VERSION } from "@/lib/task-planning";
import type { PlanCandidate, PlanValidation, TaskPlan } from "@/lib/task-planning";
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
    public code:
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "CONFLICT"
      | "LLM_NOT_CONFIGURED"
      | "INTERNAL_ERROR",
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

/** Provider 注册表：llm（S1.30 真实执行，配置经 getEffectiveLLMConfig 延迟解析） */
const realRuntime = createRuntime({
  source: realCapabilitySource,
  providers: createProviderRegistry({
    llm: createLLMProvider({ resolveConfig: () => getEffectiveLLMConfig().config }),
  }),
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
    modelConfig: {
      provider: "llm",
      model: agent.model,
      temperature: 0.7,
      maxTokens: 4096,
      timeoutMs: 120_000,
      retry: { maxAttempts: 2, backoffMs: 1_000 },
    },
    source: "ui",
    systemPrompt: agent.systemPrompt,
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
    provider: "llm",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    errorCode: result.error?.code,
    errorMessage: result.error?.message,
    // S1.31：真实 LLM 输出落库（可空）
    output: result.output ?? null,
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
  >,
  extraRoots?: string[]
): HarnessScanSummary {
  return {
    harnessId: row.harnessId,
    harnessName: row.harnessName,
    rootPath: row.rootPath,
    found: row.found,
    resourceCount: row.resourceCount,
    scannedAt: row.scannedAt,
    ...(extraRoots && extraRoots.length > 0 ? { extraRoots } : {}),
  };
}

/**
 * 按 harnessId 合并最新扫描的多根记录：同一 Harness 只保留一条主卡
 * （取 resourceCount 最大者），其余候选根放入 extraRoots 供次要展示，
 * 避免「豆包技能」等同一 Harness 因命中多个根目录而重复出现多张卡片。
 */
function mergeHarnessScans(
  rows: Parameters<typeof harnessScanToDomain>[0][]
): HarnessScanSummary[] {
  const byId = new Map<string, Parameters<typeof harnessScanToDomain>[0][]>();
  for (const row of rows) {
    const list = byId.get(row.harnessId) ?? [];
    list.push(row);
    byId.set(row.harnessId, list);
  }
  return [...byId.values()].map((group) => {
    const sorted = [...group].sort((a, b) => b.resourceCount - a.resourceCount);
    const [main, ...rest] = sorted;
    return harnessScanToDomain(main, rest.map((r) => r.rootPath));
  });
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
      createdAt: now, // 首次入索引时间；upsert 不改写 → 用于「本次新增」统计
    });
    resources.push(resourceToDomain(row));
  }

  // 索引同步：删除「本次扫描不再产出」的旧记录（adapter 排除噪声 / 源路径已消失时，
  // 旧索引不得残留，保证索引与真实文件系统一致）。
  repo.deleteDiscoveredResourcesNotInScan(scanId);

  // 自动能力索引：扫描即转换——对新增/变化资源执行启发式分析（能力描述 → 可索引标签）。
  // 幂等：指纹（sourcePath+mtime+metaHash）与 analyzerVersion 未变则跳过；
  // 原始 Harness 文件全程只读，转换只写 resource_analysis / resource_capability 索引表。
  const analysis = runIncrementalAnalysis();

  // S1.49：扫描变更提示——本次扫描首次入索引的资源数（>= 本次扫描开始时间）
  const addedResources = repo.countResourcesCreatedAfter(now);

  return {
    scanRun: scanRunToDomain(repo.getScanRun(scanId))!,
    harnesses: harnessSummaries,
    resources,
    analysis,
    addedResources,
  };
}

/** 最新一次扫描的概览（无扫描 → null 区块 + 空统计，供空态展示） */
export function getDiscoveryOverview(): DiscoveryOverview {
  const latest = repo.getLatestScanRun();
  if (!latest) {
    return { scanRun: null, harnesses: [], totalResources: 0, parseableCount: 0, lastScannedAt: null };
  }
  const harnesses = mergeHarnessScans(repo.listHarnessScansByScan(latest.id));
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

/* ---------------- 相关资源推荐（真实派生，S1.28） ----------------
 * 只读派生：共享 ResourceCapability 能力标签优先，其次同 Harness + 同类型；
 * 不复制任何资源/分析数据；返回的每项均可继续溯源到真实 sourcePath。
 */

export interface RelatedResourceItem {
  id: string;
  name: string;
  type: string;
  harnessId: string;
  sourcePath: string;
  parseable: boolean;
  /** 与目标资源共享的能力标签数（0 = 无共享能力，仅同类补充） */
  sharedCapabilities: number;
  /** 相关理由（真实信号，非推断） */
  reason: string;
}

export function getRelatedResources(id: string): { items: RelatedResourceItem[] } {
  const row = repo.getDiscoveredResource(id);
  if (!row) throw new ServiceError("NOT_FOUND", "资源不存在");
  const rows = repo.findRelatedResources(id, 8);
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type ?? "unknown",
      harnessId: r.harnessId ?? "",
      sourcePath: r.sourcePath,
      parseable: r.parseable,
      sharedCapabilities: r.sharedCapabilities,
      usage: r.usage ?? null,
      reason:
        r.sharedCapabilities > 0
          ? `共享 ${r.sharedCapabilities} 个能力标签`
          : "同 Harness · 同类资源",
    })),
  };
}

/* ---------------- 用户级资源隐藏（展示排除，S1.12） ----------------
 * 语义：按 sourcePath 记录用户隐藏，列表展示过滤；原始文件零改动；
 * 重扫 upsert / 资源 ID 变化均不丢失隐藏状态；资源真实消失后隐藏记录无害残留。
 */

export interface HiddenResourceInfo {
  id: string;
  sourcePath: string;
  hiddenAt: string;
}

export function hideResource(id: string): HiddenResourceInfo {
  const row = repo.getDiscoveredResource(id);
  if (!row) throw new ServiceError("NOT_FOUND", "资源不存在");
  repo.addHiddenResource(row.sourcePath);
  return { id: row.sourcePath, sourcePath: row.sourcePath, hiddenAt: new Date().toISOString() };
}

export function unhideResource(id: string): { sourcePath: string } {
  const row = repo.getDiscoveredResource(id);
  if (!row) throw new ServiceError("NOT_FOUND", "资源不存在");
  repo.removeHiddenResource(row.sourcePath);
  return { sourcePath: row.sourcePath };
}

export function listHiddenResources(): HiddenResourceInfo[] {
  return repo.listHiddenResources();
}

/** Settings 恢复：按隐藏记录 id 删除（资源可能已不在索引中，仍可清除隐藏状态） */
export function unhideResourceRecord(recordId: string): { sourcePath: string } {
  const rows = repo.listHiddenResources();
  const hit = rows.find((r) => r.id === recordId);
  if (!hit) throw new ServiceError("NOT_FOUND", "隐藏记录不存在");
  repo.removeHiddenResourceById(recordId);
  return { sourcePath: hit.sourcePath };
}

export function isResourceHidden(id: string): boolean {
  const row = repo.getDiscoveredResource(id);
  if (!row) return false;
  return repo.listHiddenSourcePaths().has(row.sourcePath);
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

/* ---------------- Task Intelligence（Phase 3） ---------------- */

export interface AnalyzeTaskResult {
  plan: RecommendationPlan;
  /** true = 幂等复用已有分析记录（未重复落库） */
  reused: boolean;
}

function buildRetrievableCapabilities(): RetrievableCapability[] {
  const rows = repo.listAllCurrentCapabilities();
  return rows.map(({ cap, resource }) => ({
    resourceCapabilityId: cap.id,
    resourceId: resource.id,
    resourceName: resource.name,
    harnessId: resource.harnessId,
    type: resource.type as DiscoveredResource["type"],
    capability: cap.capability,
    category: cap.category as CapabilityCategory,
    keywords: JSON.parse(cap.keywords) as string[],
    confidence: cap.confidence,
    evidenceRef: cap.evidenceRef,
    evidenceSnippet: cap.evidenceSnippet,
    sourcePath: resource.sourcePath,
  }));
}

/** repository 行 → 领域 RecommendationPlan（含真实来源快照） */
function taskResultToPlan(
  r: NonNullable<ReturnType<typeof repo.getTaskAnalysisResult>>
): RecommendationPlan {
  const { analysis, requirements, recommendations } = r;
  return {
    analysisId: analysis.id,
    task: analysis.task,
    taskType: (analysis.taskType as RecommendationPlan["taskType"]) ?? "other",
    summary: analysis.summary ?? "",
    requirements: requirements.map((req) => ({
      requirementText: req.requirementText,
      category: req.category as CapabilityCategory,
      keywords: JSON.parse(req.keywords) as string[],
      weight: req.weight,
      derivedFrom: req.derivedFrom ?? req.requirementText,
      isInferred: true,
    })),
    recommendations: recommendations.map(({ reco, cap, resource, requirement }) => ({
      resourceCapabilityId: reco.resourceCapabilityId,
      resourceId: reco.resourceId,
      resourceName: resource.name,
      harnessId: resource.harnessId,
      type: resource.type as DiscoveredResource["type"],
      capability: cap.capability,
      category: cap.category as CapabilityCategory,
      confidence: cap.confidence,
      evidenceRef: reco.evidenceRef,
      evidenceSnippet: cap.evidenceSnippet,
      sourcePath: reco.sourcePath,
      score: reco.score,
      reason: reco.reason ?? "",
      requirementText: requirement.requirementText,
      rank: reco.rank,
    })),
    strategy: "heuristic",
    analyzerVersion: analysis.analyzerVersion,
  };
}

/**
 * 任务分析（唯一写入口）：
 * - fingerprint 幂等：同 (task, fingerprint, version) 已成功 → 复用已有记录，不重复落库
 * - 历史语义：isCurrent 标记当前有效，旧记录保留
 * - 事实/推断分离：需求 isInferred=true；推荐引 resource_capability.id + 真实来源快照
 */
export function analyzeTask(task: string): AnalyzeTaskResult {
  const trimmed = task.trim();
  if (!trimmed) {
    throw new ServiceError("VALIDATION_ERROR", "任务文本不能为空");
  }
  const fingerprint = computeTaskFingerprint(trimmed);
  const version = TASK_ANALYZER_VERSION;

  const existing = repo.getTaskAnalysisByFingerprint(trimmed, fingerprint, version);
  if (existing?.status === "analyzed") {
    const cached = repo.getTaskAnalysisResult(existing.id);
    if (cached) return { plan: taskResultToPlan(cached), reused: true };
  }

  const capabilities = buildRetrievableCapabilities();
  if (capabilities.length === 0) {
    const id = existing?.id ?? uuid();
    const now = new Date().toISOString();
    repo.upsertTaskAnalysis({
      id,
      task: trimmed,
      status: "failed",
      strategy: "heuristic",
      analyzerVersion: version,
      createdAt: existing?.createdAt ?? now,
      analyzedAt: now,
      inputFingerprint: fingerprint,
      isCurrent: true,
      errorCode: "NO_CAPABILITIES",
      errorMessage: "当前没有可用的能力标签，无法执行任务分析",
    });
    repo.markOtherTaskAnalysesNotCurrent(trimmed, id);
    throw new ServiceError("NOT_FOUND", "当前没有可用的能力标签，无法执行任务分析");
  }

  const analysisId = existing?.id ?? uuid();
  const now = new Date().toISOString();

  let plan: RecommendationPlan;
  try {
    // 纯计算（lib/task-intelligence），不触碰 Runtime
    plan = analyzeTaskCore({ task: trimmed, capabilities }, analysisId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    repo.upsertTaskAnalysis({
      id: analysisId,
      task: trimmed,
      status: "failed",
      strategy: "heuristic",
      analyzerVersion: version,
      createdAt: existing?.createdAt ?? now,
      analyzedAt: now,
      inputFingerprint: fingerprint,
      isCurrent: true,
      errorCode: "ANALYSIS_FAILED",
      errorMessage: msg,
    });
    repo.markOtherTaskAnalysesNotCurrent(trimmed, analysisId);
    throw new Error(msg);
  }

  // 落库（先写 analysis，再替换需求与推荐；同键记录走 upsert 更新）
  repo.upsertTaskAnalysis({
    id: analysisId,
    task: trimmed,
    status: "analyzed",
    strategy: "heuristic",
    analyzerVersion: version,
    taskType: plan.taskType,
    createdAt: existing?.createdAt ?? now,
    analyzedAt: now,
    inputFingerprint: fingerprint,
    isCurrent: true,
    summary: plan.summary,
  });
  repo.markOtherTaskAnalysesNotCurrent(trimmed, analysisId);
  repo.deleteTaskRequirementsByAnalysis(analysisId);
  repo.deleteTaskRecommendationsByAnalysis(analysisId);

  const reqIds: string[] = [];
  plan.requirements.forEach((r, i) => {
    const rid = uuid();
    reqIds.push(rid);
    repo.insertTaskRequirement({
      id: rid,
      taskAnalysisId: analysisId,
      requirementText: r.requirementText,
      category: r.category,
      keywords: JSON.stringify(r.keywords),
      weight: r.weight,
      derivedFrom: r.derivedFrom,
      isInferred: r.isInferred,
      sortOrder: i,
    });
  });
  plan.recommendations.forEach((rec) => {
    const idx = plan.requirements.findIndex((r) => r.requirementText === rec.requirementText);
    repo.insertTaskRecommendation({
      id: uuid(),
      taskAnalysisId: analysisId,
      taskRequirementId: reqIds[idx >= 0 ? idx : 0],
      resourceCapabilityId: rec.resourceCapabilityId,
      resourceId: rec.resourceId,
      score: rec.score,
      reason: rec.reason,
      evidenceRef: rec.evidenceRef,
      sourcePath: rec.sourcePath,
      rank: rec.rank,
      source: "heuristic",
    });
  });

  return { plan: { ...plan, analysisId }, reused: false };
}

/**
 * 任务分析 + LLM 增强（场景 A）
 *
 * 先执行 Heuristic 全流程（能力检索 / 推荐 / 落库，保证证据链真实可追溯）；
 * 再尝试用 LLM 覆盖「推断字段」taskType / summary，strategy 标记为 llm-assisted。
 * LLM 未配置 / 失败时静默回退 Heuristic，不影响主流程。
 */
export async function analyzeTaskWithLLM(task: string): Promise<AnalyzeTaskResult> {
  const trimmed = task.trim();
  const base = analyzeTask(trimmed);
  const effective = getEffectiveLLMConfig();
  if (!isLLMConfigured(effective.config)) return base;

  const llm = await llmUnderstandTask(trimmed, effective.config);
  if (!llm) return base;

  const plan = base.plan;
  const newPlan: RecommendationPlan = {
    ...plan,
    taskType: llm.taskType as RecommendationPlan["taskType"],
    summary: llm.summary,
    strategy: "llm-assisted",
  };
  repo.patchTaskAnalysisLlm(plan.analysisId, {
    strategy: "llm-assisted",
    taskType: newPlan.taskType,
    summary: newPlan.summary,
    analyzedAt: new Date().toISOString(),
  });
  return { plan: newPlan, reused: base.reused };
}

/** 技能 AI 解读（场景 B）：服务端调用 LLM 总结资源用途，返回结构化「如何使用」 */
export interface ResourceInterpretResult {
  summary: string;
  whatItDoes: string[];
  howToUse: string[];
  /** 仅当结构化解析失败时非空，前端回退平铺展示 */
  rawMarkdown: string;
  model: string;
  interpretedAt: string;
}

export async function interpretResource(id: string): Promise<ResourceInterpretResult> {
  const res = getDiscoveredResource(id);
  const effective = getEffectiveLLMConfig();
  if (!isLLMConfigured(effective.config)) {
    throw new ServiceError(
      "LLM_NOT_CONFIGURED",
      "未配置 LLM API Key（可在 Settings → AI Provider 中填写，或通过环境变量 / Hermes 自动发现）"
    );
  }
  const usage =
    typeof res.metadata?.usage === "string" && res.metadata.usage.trim()
      ? res.metadata.usage
      : res.description ?? "";
  const { summary, whatItDoes, howToUse, rawMarkdown, model } = await interpretResourceText(
    {
      name: res.name,
      type: res.type,
      description: res.description ?? "",
      sourcePath: res.sourcePath,
      usage,
    },
    effective.config
  );
  return { summary, whatItDoes, howToUse, rawMarkdown, model, interpretedAt: new Date().toISOString() };
}

/* ---------------- 系统提示词润色（S1.44：新建 Agent 表单） ---------------- */

/** 专业提示词工程师 System Prompt：只输出润色后的正文，不做解释 */
const POLISH_SYSTEM_PROMPT = `你是资深 AI 提示词工程师（Prompt Engineer）。请把用户给出的系统提示词草稿润色为专业、完整、可直接用于 AI Agent 的 system prompt。

输出要求：
1. 只输出润色后的提示词正文，不要任何解释、前言、标记或代码块包装；
2. 结构清晰、语义完整：包含角色定位、职责范围、行为边界、工作流程（如适用）、输出规范（如适用）；
3. 保持原意，不臆造用户没有表达的能力；可补全缺失的必要约束（如：不编造信息、遇到不确定时如何处理）；
4. 语言与原文一致（中文草稿输出中文）；
5. 如原文为空或只有无意义字符，如实说明「无法润色」，不要生成虚假内容。`;

export interface PolishPromptResult {
  polished: string;
  model: string;
  polishedAt: string;
}

/** 润色系统提示词：走真实 LLM（OpenAI 兼容 chat/completions）；未配置 Key 如实报错，不伪造 */
export async function polishSystemPrompt(prompt: string): Promise<PolishPromptResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new ServiceError("VALIDATION_ERROR", "系统提示词为空，无法润色");
  }
  const effective = getEffectiveLLMConfig();
  if (!isLLMConfigured(effective.config)) {
    throw new ServiceError(
      "LLM_NOT_CONFIGURED",
      "未配置 LLM API Key（可在 Settings → AI Provider 中填写，或通过环境变量 / Hermes 自动发现）"
    );
  }
  const res = await chatCompletion(
    {
      temperature: 0.3,
      maxTokens: 1600,
      timeoutMs: 30_000,
      messages: [
        { role: "system", content: POLISH_SYSTEM_PROMPT },
        { role: "user", content: trimmed },
      ],
    },
    effective.config
  );
  const polished = res.text.trim();
  if (!polished || polished === "无法润色") {
    throw new ServiceError("INTERNAL_ERROR", "LLM 未能返回润色结果，请检查提示词内容后重试");
  }
  return { polished, model: res.model, polishedAt: new Date().toISOString() };
}

/* ---------------- LLM Provider 配置（S1.20：Settings 手动配置 / 官方连接） ---------------- */

export type LLMConfigSource = "manual" | "env" | "hermes" | "default";

export interface EffectiveLLMConfig {
  config: LLMConfig;
  /** 生效来源：manual=Settings 手动配置；env=环境变量；hermes=Hermes 自动发现；default=内置默认（无 Key） */
  source: LLMConfigSource;
}

/**
 * 生效配置：手动配置（DB）> 环境变量 > Hermes 自动发现 > 内置默认。
 * 手动配置字段允许部分为空：空字段回落到静态发现值。
 */
export function getEffectiveLLMConfig(): EffectiveLLMConfig {
  const staticCfg = discoverStaticConfig();
  const row = repo.getLLMProviderConfigRow();

  if (row) {
    const hasManual = Boolean(row.baseUrl || row.model || row.apiKey);
    if (hasManual) {
      return {
        config: {
          baseUrl: row.baseUrl || staticCfg.baseUrl,
          model: row.model || staticCfg.model,
          apiKey: row.apiKey || staticCfg.apiKey,
        },
        source: "manual",
      };
    }
  }
  return { config: staticCfg, source: staticCfg.source };
}

export interface SaveLLMProviderInput {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

/** 保存手动配置；apiKey 传空 / 未传表示不修改 Key */
export function saveLLMProviderConfig(input: SaveLLMProviderInput): EffectiveLLMConfig {
  repo.upsertLLMProviderConfig({
    baseUrl: input.baseUrl,
    model: input.model,
    apiKey: input.apiKey,
  });
  return getEffectiveLLMConfig();
}

/** 清除手动配置（恢复自动发现） */
export function clearLLMProviderConfig(): EffectiveLLMConfig {
  repo.clearLLMProviderConfig();
  return getEffectiveLLMConfig();
}

export interface TestLLMResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  source: LLMConfigSource;
  error?: string;
  /** 连接成功后顺带拉取的端点可用模型列表；端点不支持 /models 或失败时为 null */
  models?: string[] | null;
}

/** 测试连接：用当前生效配置真实调用一次 LLM（短消息），返回延迟与结果 */
/** 可用模型列表（S1.30：Agent 创建表单等拉取真实端点模型；未配置返回 null 由前端引导） */
export async function listAvailableLLMModels(): Promise<{
  models: string[] | null;
  model: string;
  configured: boolean;
}> {
  const effective = getEffectiveLLMConfig();
  if (!isLLMConfigured(effective.config)) {
    return { models: null, model: effective.config.model, configured: false };
  }
  const models = await listModels(effective.config);
  return { models, model: effective.config.model, configured: true };
}

export async function testLLMProviderConfig(): Promise<TestLLMResult> {
  const effective = getEffectiveLLMConfig();
  if (!isLLMConfigured(effective.config)) {
    return {
      ok: false,
      latencyMs: 0,
      model: effective.config.model,
      source: effective.source,
      error: "未配置 API Key（可在表单中填写，或通过环境变量 / Hermes 自动发现）",
    };
  }
  const started = Date.now();
  try {
    const res = await chatCompletion(
      {
        temperature: 0,
        maxTokens: 16,
        timeoutMs: 20_000,
        messages: [
          { role: "system", content: "只回复两个字：正常" },
          { role: "user", content: "连接测试" },
        ],
      },
      effective.config
    );
    const models = await listModels(effective.config);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      model: res.model,
      source: effective.source,
      models,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      model: effective.config.model,
      source: effective.source,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** 页面回显用：当前生效配置（Key 只回显掩码，绝不返回原文） */
export function getLLMProviderConfigView() {
  const effective = getEffectiveLLMConfig();
  const row = repo.getLLMProviderConfigRow();
  return {
    effective: {
      source: effective.source,
      baseUrl: effective.config.baseUrl,
      model: effective.config.model,
      keyConfigured: isLLMConfigured(effective.config),
      keyMasked: isLLMConfigured(effective.config)
        ? maskKey(effective.config.apiKey)
        : null,
      defaults: { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL },
    },
    manual: row
      ? {
          baseUrl: row.baseUrl ?? "",
          model: row.model ?? "",
          keyConfigured: Boolean(row.apiKey),
        }
      : null,
  };
}

/* ---------------- 用户资料（S1.45） ---------------- */

export interface ProfileUser {
  displayName: string | null;
  title: string | null;
  bio: string | null;
  avatarColor: string | null;
  /** 本地上传头像的可访问 URL（无头像时为 null） */
  avatarUrl: string | null;
  updatedAt: string;
}

/** 本机真实事实信息（只读派生，不落库；消除硬编码假身份） */
export interface MachineInfo {
  username: string;
  hostname: string;
  platform: string;
  osRelease: string;
  dbPath: string;
  dbSizeBytes: number;
  llmSource: LLMConfigSource;
  llmModel: string;
  llmConfigured: boolean;
  resourcesTotal: number;
  harnessScansTotal: number;
}

export interface ProfileView {
  user: ProfileUser;
  machine: MachineInfo;
}

const AVATAR_COLORS = ["violet", "indigo", "emerald", "sky", "amber", "rose"];

/** 头像存储目录（相对项目根 data/avatars/）；DB 只存相对路径 avatars/<uuid>.<ext> */
const AVATAR_DIR = path.join(process.cwd(), "data", "avatars");

function avatarUrlOf(row: { avatarPath: string | null; updatedAt: string } | undefined): string | null {
  if (!row?.avatarPath) return null;
  const v = encodeURIComponent(row.updatedAt);
  return `/api/v1/profile/avatar?v=${v}`;
}

/** 读取用户资料（DB 自定义信息 + 本机真实事实，合并返回） */
export function getProfile(): ProfileView {
  const row = repo.getUserProfileRow();
  const effective = getEffectiveLLMConfig();
  const dbPath =
    process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "ai-workspace.db");
  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(dbPath).size;
  } catch {
    dbSizeBytes = 0;
  }
  return {
    user: {
      displayName: row?.displayName ?? null,
      title: row?.title ?? null,
      bio: row?.bio ?? null,
      avatarColor: row?.avatarColor ?? null,
      avatarUrl: avatarUrlOf(row),
      updatedAt: row?.updatedAt ?? new Date(0).toISOString(),
    },
    machine: {
      username: os.userInfo().username || "local",
      hostname: os.hostname(),
      platform: `${os.platform()} ${os.arch()}`,
      osRelease: os.release(),
      dbPath,
      dbSizeBytes,
      llmSource: effective.source,
      llmModel: effective.config.model,
      llmConfigured: isLLMConfigured(effective.config),
      resourcesTotal: repo.countDiscoveredResources(),
      harnessScansTotal: repo.countHarnessScans(),
    },
  };
}

export interface SaveProfileInput {
  displayName?: string | null;
  title?: string | null;
  bio?: string | null;
  avatarColor?: string | null;
}

/** 保存用户自定义展示信息（走 Repository，页面不直接碰领域数据） */
export function saveProfile(input: SaveProfileInput): ProfileUser {
  if (input.avatarColor !== undefined && input.avatarColor !== null) {
    if (!AVATAR_COLORS.includes(input.avatarColor)) {
      throw new ServiceError("VALIDATION_ERROR", `不支持的头像配色: ${input.avatarColor}`);
    }
  }
  repo.upsertUserProfile(input);
  const row = repo.getUserProfileRow();
  return {
    displayName: row?.displayName ?? null,
    title: row?.title ?? null,
    bio: row?.bio ?? null,
    avatarColor: row?.avatarColor ?? null,
    avatarUrl: avatarUrlOf(row),
    updatedAt: row?.updatedAt ?? new Date(0).toISOString(),
  };
}

/* ---------------- 头像上传 / 移除（S1.46） ---------------- */

const ALLOWED_AVATAR_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

/** 删除旧头像文件（存在且位于 avatars 目录内才删，防止路径穿越） */
function deleteAvatarFileSafe(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const resolved = path.resolve(process.cwd(), "data", relativePath);
  const avatarsRoot = path.resolve(AVATAR_DIR);
  if (!resolved.startsWith(avatarsRoot + path.sep)) return;
  try {
    fs.unlinkSync(resolved);
  } catch {
    // 文件不存在等忽略
  }
}

export interface AvatarUploadResult {
  avatarUrl: string;
}

/** 上传头像：接收 dataURL → 校验 MIME/大小 → 写 data/avatars/<uuid>.<ext> → DB 记录相对路径 → 返回可访问 URL */
export function uploadAvatar(dataUrl: string): AvatarUploadResult {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new ServiceError(
      "VALIDATION_ERROR",
      "头像格式不支持（仅支持 PNG / JPEG / WebP）"
    );
  }
  const mime = match[1];
  const ext = ALLOWED_AVATAR_MIME[mime];
  if (!ext) {
    throw new ServiceError("VALIDATION_ERROR", "头像格式不支持（仅支持 PNG / JPEG / WebP）");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0) {
    throw new ServiceError("VALIDATION_ERROR", "头像内容为空");
  }
  if (bytes.length > MAX_AVATAR_BYTES) {
    throw new ServiceError("VALIDATION_ERROR", "头像不能超过 2MB");
  }

  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  const filename = `${uuid()}${ext}`;
  const relativePath = `avatars/${filename}`;
  fs.writeFileSync(path.join(AVATAR_DIR, filename), bytes);

  // 替换头像：删除旧文件
  const prev = repo.getUserProfileRow();
  deleteAvatarFileSafe(prev?.avatarPath);

  repo.upsertUserProfile({ avatarPath: relativePath });
  const row = repo.getUserProfileRow();
  const avatarUrl = avatarUrlOf(row);
  if (!avatarUrl) {
    throw new ServiceError("INTERNAL_ERROR", "头像保存后读取失败");
  }
  return { avatarUrl };
}

/** 移除头像：删除文件并清空 DB 引用 */
export function clearAvatar(): { avatarUrl: null } {
  const prev = repo.getUserProfileRow();
  deleteAvatarFileSafe(prev?.avatarPath);
  repo.upsertUserProfile({ avatarPath: null });
  return { avatarUrl: null };
}

/** 读取当前头像文件（供图片端点返回；无头像返回 null） */
export function getAvatarFile(): { absolutePath: string; mime: string } | null {
  const row = repo.getUserProfileRow();
  if (!row?.avatarPath) return null;
  const resolved = path.resolve(process.cwd(), "data", row.avatarPath);
  const avatarsRoot = path.resolve(AVATAR_DIR);
  if (!resolved.startsWith(avatarsRoot + path.sep) || !fs.existsSync(resolved)) return null;
  const ext = path.extname(resolved).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { absolutePath: resolved, mime };
}

/** 查询单次任务分析（含需求与推荐） */
export function getTaskAnalysis(id: string): RecommendationPlan | null {  const r = repo.getTaskAnalysisResult(id);
  return r ? taskResultToPlan(r) : null;
}

/** 任务分析历史（新 → 旧） */
export function listTaskAnalyses(limit = 20) {
  return repo.listTaskAnalyses(limit);
}

/* ---------------- Task Planning（Phase 4） ---------------- */

export interface CreatePlanResult {
  plan: TaskPlan;
  /** true = 幂等复用已有计划（未重复生成） */
  reused: boolean;
}

/** repository 行 → 领域 TaskPlan（含真实来源 join；事实/推断字段分离） */
function planResultToTaskPlan(
  r: NonNullable<ReturnType<typeof repo.getPlanResult>>
): TaskPlan {
  const { plan, steps, dependencies } = r;
  return {
    id: plan.id,
    analysisId: plan.taskAnalysisId,
    status: plan.status as TaskPlan["status"],
    plannerStrategy: plan.plannerStrategy as TaskPlan["plannerStrategy"],
    plannerVersion: plan.plannerVersion,
    createdAt: plan.createdAt,
    validation: JSON.parse(plan.validation) as PlanValidation,
    steps: steps.map(({ step, cap, resource }) => ({
      id: step.id,
      stepIndex: step.stepIndex,
      requirementId: step.taskRequirementId,
      requirementText: step.requirementText,
      category: step.category as TaskPlan["steps"][number]["category"],
      primary:
        cap && resource && step.primaryCapabilityId && step.primaryResourceId && step.score !== null
          ? {
              resourceCapabilityId: step.primaryCapabilityId,
              resourceId: step.primaryResourceId,
              resourceName: resource.name,
              harnessId: resource.harnessId,
              type: resource.type as PlanCandidate["type"],
              capability: cap.capability,
              category: cap.category as PlanCandidate["category"],
              confidence: cap.confidence,
              evidenceRef: cap.evidenceRef,
              evidenceSnippet: cap.evidenceSnippet,
              sourcePath: resource.sourcePath,
              score: step.score,
            }
          : null,
      alternatives: JSON.parse(step.alternatives) as PlanCandidate[],
      outputDescription: step.outputDescription,
      expectedInput: step.expectedInput,
      satisfaction: step.satisfaction as TaskPlan["steps"][number]["satisfaction"],
      isInferred: step.isInferred === true,
    })),
    dependencies: dependencies.map(({ dep, fromIdx, toIdx }) => ({
      id: dep.id,
      fromStepIndex: fromIdx,
      toStepIndex: toIdx,
      type: dep.type as TaskPlan["dependencies"][number]["type"],
      reason: dep.reason,
      isInferred: dep.isInferred === true,
    })),
  };
}

/**
 * 从已有任务分析生成任务计划（唯一写入口）：
 * - 幂等：同 analysisId 已存在计划（非 failed）→ 复用已有记录，不重复生成；
 * - 依赖推导只建证据充分的边（类别先验 / 文本信号），其余步骤保持并列；
 * - 计划只引用真实 ResourceCapability；推断字段（output/expected/reason）isInferred=true；
 * - Planner 计算失败 → failed 计划落库 + ServiceError（失败状态真实可查）。
 */
export function createPlanFromAnalysis(analysisId: string): CreatePlanResult {
  const analysis = repo.getTaskAnalysisById(analysisId);
  if (!analysis) {
    throw new ServiceError("NOT_FOUND", "任务分析不存在，无法生成任务计划");
  }
  if (analysis.status !== "analyzed") {
    throw new ServiceError("VALIDATION_ERROR", "该任务分析未完成，无法生成任务计划");
  }

  const existing = repo.getPlanByAnalysis(analysisId);
  if (existing && existing.status !== "failed") {
    const cached = repo.getPlanResult(existing.id);
    if (cached) return { plan: planResultToTaskPlan(cached), reused: true };
  }

  const result = repo.getTaskAnalysisResult(analysisId);
  if (!result) {
    throw new ServiceError("NOT_FOUND", "任务分析详情缺失，无法生成任务计划");
  }
  const plan = taskResultToPlan(result);
  const capabilities = buildRetrievableCapabilities();

  const planId = existing?.id ?? uuid();
  const now = new Date().toISOString();

  const outcome = heuristicPlanner.plan({ plan, capabilities });
  if (outcome.status === "failed" || !outcome.draft) {
    repo.upsertTaskPlan({
      id: planId,
      taskAnalysisId: analysisId,
      status: "failed",
      plannerStrategy: "heuristic",
      plannerVersion: PLANNER_VERSION,
      createdAt: now,
      validation: JSON.stringify({ status: "invalid", issues: [] }),
      errorCode: outcome.errorCode ?? "PLANNING_FAILED",
      errorMessage: outcome.errorMessage ?? "任务计划生成失败",
    });
    throw new Error(outcome.errorMessage ?? "任务计划生成失败");
  }

  const draft = outcome.draft;
  // requirementText → 落库 requirement id（与 Phase 3 同源映射；文本唯一约束保证）
  const reqIdByText = new Map(
    result.requirements.map((req) => [req.requirementText, req.id])
  );

  repo.upsertTaskPlan({
    id: planId,
    taskAnalysisId: analysisId,
    status: draft.status,
    plannerStrategy: "heuristic",
    plannerVersion: PLANNER_VERSION,
    createdAt: now,
    validation: JSON.stringify(draft.validation),
  });
  repo.deletePlanStepsByPlan(planId);
  repo.deletePlanDependenciesByPlan(planId);

  const stepIdByIndex = new Map<number, string>();
  draft.steps.forEach((s, i) => {
    const stepId = uuid();
    stepIdByIndex.set(i, stepId);
    const requirementId = reqIdByText.get(s.requirement.requirementText);
    if (!requirementId) {
      throw new Error(`需求「${s.requirement.requirementText}」未匹配到落库记录，任务计划生成中止`);
    }
    repo.insertPlanStep({
      id: stepId,
      planId,
      stepIndex: s.stepIndex,
      taskRequirementId: requirementId,
      requirementText: s.requirement.requirementText,
      category: s.requirement.category,
      primaryCapabilityId: s.primary?.resourceCapabilityId ?? null,
      primaryResourceId: s.primary?.resourceId ?? null,
      score: s.primary?.score ?? null,
      alternatives: JSON.stringify(s.alternatives),
      outputDescription: s.outputDescription,
      expectedInput: s.expectedInput,
      satisfaction: s.satisfaction,
      isInferred: true,
      sortOrder: s.stepIndex,
    });
  });
  draft.dependencies.forEach((d) => {
    const fromId = stepIdByIndex.get(d.fromStepIndex);
    const toId = stepIdByIndex.get(d.toStepIndex);
    if (!fromId || !toId) return; // validator 已兜底；此处防御性跳过
    repo.insertPlanDependency({
      id: uuid(),
      planId,
      fromStepId: fromId,
      toStepId: toId,
      type: d.type,
      reason: d.reason,
      isInferred: true,
    });
  });

  const saved = repo.getPlanResult(planId);
  if (!saved) {
    throw new Error("任务计划写入后读取失败");
  }
  return { plan: planResultToTaskPlan(saved), reused: false };
}

/** 查询单个任务计划（完整步骤 + 依赖） */
export function getPlan(id: string): TaskPlan | null {
  const r = repo.getPlanResult(id);
  return r ? planResultToTaskPlan(r) : null;
}

/** 按分析查询其当前计划（未生成时返回 null） */
export function getPlanByAnalysis(analysisId: string): TaskPlan | null {
  const p = repo.getPlanByAnalysis(analysisId);
  if (!p) return null;
  return getPlan(p.id);
}
