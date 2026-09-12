/**
 * DTO → Domain 映射（P4-2c）
 *
 * 隔离层：后端响应结构变化只影响本文件；Store/UI 永远消费 Domain。
 */
import type {
  Agent,
  AgentCapability,
  AgentRun,
  AnalysisRunResult,
  AnalysisStatus,
  AnalysisStatusSummary,
  AnalysisStrategy,
  CapabilityCategory,
  CapabilityDefinition,
  CapabilityIndexEntry,
  DiscoveredResource,
  DiscoveryOverview,
  HarnessScanSummary,
  Project,
  ProjectAgent,
  ResourceAnalysis,
  ResourceCapability,
  ResourceInsight,
  ResourceType,
  RunScanResult,
  RunsStats,
  ScanRun,
  TaskMatchResult,
} from "@/lib/types";
import { normalizeRunStatus } from "@/lib/types";
import type {
  AgentCapabilityDTO,
  AgentDTO,
  AgentRunDTO,
  AnalysisRunResultDTO,
  AnalysisStatusSummaryDTO,
  CapabilityDefinitionDTO,
  CapabilityIndexEntryDTO,
  DiscoveredResourceDTO,
  DiscoveryOverviewDTO,
  HarnessScanSummaryDTO,
  ProjectAgentDTO,
  ProjectDTO,
  ResourceAnalysisDTO,
  ResourceCapabilityDTO,
  ResourceInsightDTO,
  RunsStatsDTO,
  RunScanResultDTO,
  ScanRunDTO,
  TaskMatchResultDTO,
} from "./dto";

export function toAgent(d: AgentDTO): Agent {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    model: d.model as Agent["model"],
    status: d.status as Agent["status"],
    systemPrompt: d.systemPrompt,
    createdAt: d.createdAt,
    lastRunAt: d.lastRunAt,
  };
}

export function toAgentRun(d: AgentRunDTO): AgentRun {
  return {
    id: d.id,
    agentId: d.agentId,
    status: normalizeRunStatus(d.status),
    summary: d.summary,
    durationMs: d.durationMs ?? 0,
    tokensUsed: d.tokensUsed,
    messages: d.messages,
    startedAt: d.startedAt,
    // 服务端保证运行完成必有完成时间；防御性兜底（未知时取开始时间）
    finishedAt: d.finishedAt ?? d.startedAt,
    // P5-2：Runtime 契约字段（可选，向后兼容旧数据）
    model: d.model,
    provider: d.provider,
    inputTokens: d.inputTokens,
    outputTokens: d.outputTokens,
    errorCode: d.errorCode,
    errorMessage: d.errorMessage,
    output: d.output ?? null,
  };
}

export function toCapabilityDefinition(d: CapabilityDefinitionDTO): CapabilityDefinition {
  return {
    id: d.id,
    type: d.type,
    name: d.name,
    description: d.description,
    lifecycle: d.lifecycle,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function toAgentCapability(d: AgentCapabilityDTO): AgentCapability {
  return {
    id: d.id,
    agentId: d.agentId,
    capabilityId: d.capabilityId,
    enabled: d.enabled,
    createdAt: d.createdAt,
  };
}

export function toProject(d: ProjectDTO): Project {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    status: d.status as Project["status"],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function toProjectAgent(d: ProjectAgentDTO): ProjectAgent {
  return {
    id: d.id,
    projectId: d.projectId,
    agentId: d.agentId,
    addedAt: d.addedAt,
  };
}

/**
 * RunsStatsDTO → Domain RunsStats。
 * 服务端 successRate 为 0-100（一位小数），Domain 统一为 0-1（与前端
 * DailyStat / formatPercent 行为一致）；daily 补齐 TrendChart 需要的 label（MM-DD）。
 */
export function toRunsStats(d: RunsStatsDTO): RunsStats {
  return {
    window: d.window,
    totals: {
      runs: d.totals.runs,
      succeeded: d.totals.succeeded,
      failed: d.totals.failed,
      successRate: d.totals.runs > 0 ? d.totals.successRate / 100 : 0,
      tokens: d.totals.tokens,
      avgDurationMs: d.totals.avgDurationMs,
      lastRunAt: d.totals.lastRunAt,
    },
    daily: d.daily.map((day) => {
      const [, month, dayOfMonth] = day.date.split("-");
      return {
        date: day.date,
        label: `${month}-${dayOfMonth}`,
        runs: day.runs,
        succeeded: day.succeeded,
        failed: day.failed,
        successRate: day.runs > 0 ? day.successRate / 100 : 0,
      };
    }),
  };
}

/* ---------------- Resource Discovery 映射（本地资源发现，V1 MVP） ---------------- */

export function toDiscoveredResource(d: DiscoveredResourceDTO): DiscoveredResource {
  return {
    id: d.id,
    scanId: d.scanId,
    harnessId: d.harnessId,
    type: d.type,
    name: d.name,
    description: d.description,
    source: d.source,
    sourcePath: d.sourcePath,
    framework: d.framework,
    version: d.version,
    status: d.status,
    parseable: d.parseable,
    parseNote: d.parseNote,
    lastModified: d.lastModified,
    metadata: d.metadata ?? {},
  };
}

export function toHarnessScanSummary(d: HarnessScanSummaryDTO): HarnessScanSummary {
  return {
    harnessId: d.harnessId,
    harnessName: d.harnessName,
    rootPath: d.rootPath,
    found: d.found,
    resourceCount: d.resourceCount,
    scannedAt: d.scannedAt,
    ...(d.extraRoots && d.extraRoots.length > 0 ? { extraRoots: d.extraRoots } : {}),
  };
}

export function toScanRun(d: ScanRunDTO): ScanRun {
  return {
    id: d.id,
    status: d.status,
    startedAt: d.startedAt,
    finishedAt: d.finishedAt,
    locations: d.locations ?? [],
    byHarness: d.byHarness ?? {},
    byType: d.byType ?? {},
    totalResources: d.totalResources,
    parseableCount: d.parseableCount,
  };
}

export function toDiscoveryOverview(d: DiscoveryOverviewDTO): DiscoveryOverview {
  return {
    scanRun: d.scanRun ? toScanRun(d.scanRun) : null,
    harnesses: (d.harnesses ?? []).map(toHarnessScanSummary),
    totalResources: d.totalResources,
    parseableCount: d.parseableCount,
    lastScannedAt: d.lastScannedAt,
  };
}

export function toRunScanResult(d: RunScanResultDTO): RunScanResult {
  return {
    scanRun: d.scanRun ? toScanRun(d.scanRun) : null,
    harnesses: (d.harnesses ?? []).map(toHarnessScanSummary),
    resources: (d.resources ?? []).map(toDiscoveredResource),
  };
}

/* ---------------- Resource Intelligence（Phase 2） ---------------- */

export function toResourceAnalysis(d: ResourceAnalysisDTO): ResourceAnalysis {
  return {
    id: d.id,
    resourceId: d.resourceId,
    status: d.status as AnalysisStatus,
    strategy: d.strategy as AnalysisStrategy,
    analyzerVersion: d.analyzerVersion,
    createdAt: d.createdAt,
    analyzedAt: d.analyzedAt,
    inputFingerprint: d.inputFingerprint,
    resourceMtime: d.resourceMtime,
    isCurrent: d.isCurrent,
    errorCode: d.errorCode,
    errorMessage: d.errorMessage,
    summary: d.summary,
  };
}

export function toResourceCapability(d: ResourceCapabilityDTO): ResourceCapability {
  return {
    id: d.id,
    analysisId: d.analysisId,
    resourceId: d.resourceId,
    capability: d.capability,
    category: d.category as CapabilityCategory,
    keywords: d.keywords ?? [],
    confidence: d.confidence,
    evidenceRef: d.evidenceRef,
    evidenceSnippet: d.evidenceSnippet,
    inputContext: d.inputContext ?? {},
    executionHint: d.executionHint ?? null,
  };
}

export function toResourceInsight(d: ResourceInsightDTO): ResourceInsight {
  return {
    resource: toDiscoveredResource(d.resource),
    currentAnalysis: d.currentAnalysis ? toResourceAnalysis(d.currentAnalysis) : null,
    capabilities: (d.capabilities ?? []).map(toResourceCapability),
    history: (d.history ?? []).map(toResourceAnalysis),
  };
}

export function toAnalysisStatusSummary(d: AnalysisStatusSummaryDTO): AnalysisStatusSummary {
  return {
    totalResources: d.totalResources,
    analyzed: d.analyzed,
    pending: d.pending,
    failed: d.failed,
    expired: d.expired,
    capabilityCount: d.capabilityCount,
    lastRunAt: d.lastRunAt,
    analyzerVersion: d.analyzerVersion,
  };
}

export function toAnalysisRunResult(d: AnalysisRunResultDTO): AnalysisRunResult {
  return {
    processed: d.processed,
    skipped: d.skipped,
    analyzed: d.analyzed,
    failed: d.failed,
  };
}

export function toCapabilityIndex(d: CapabilityIndexEntryDTO[]): CapabilityIndexEntry[] {
  return (d ?? []).map((e) => ({
    category: e.category as CapabilityCategory,
    count: e.count,
    items: e.items ?? [],
  }));
}

export function toTaskMatchResult(d: TaskMatchResultDTO): TaskMatchResult {
  return {
    task: d.task,
    matches: (d.matches ?? []).map((x) => ({
      resourceId: x.resourceId,
      resourceName: x.resourceName,
      harnessId: x.harnessId,
      type: x.type as ResourceType,
      capability: x.capability,
      category: x.category as CapabilityCategory,
      confidence: x.confidence,
      evidenceRef: x.evidenceRef,
      score: x.score,
    })),
  };
}
