/**
 * API DTO（P4-2c）
 *
 * 规则：DTO ≠ Domain。Store/UI 不得依赖 DTO 字段结构；
 * API Client 通过 mappers.ts 将 DTO 映射为 Domain 后再进入 Store。
 * P4 阶段 DTO 与 Domain 同构（含 Definition 时间戳），独立定义以保留独立演进边界。
 */
import type {
  CapabilityLifecycle,
  CapabilityType,
  ResourceStatus,
  ResourceType,
  ScanLocation,
  ScanStatus,
  TimeRange,
} from "@/lib/types";

export interface PageDTO<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AgentDTO {
  id: string;
  name: string;
  description: string;
  model: string;
  status: string;
  systemPrompt: string;
  createdAt: string;
  lastRunAt: string | null;
}

export interface AgentRunDTO {
  id: string;
  agentId: string;
  status: string;
  summary: string;
  durationMs: number | null;
  tokensUsed: number;
  messages: number;
  startedAt: string;
  finishedAt: string | null;
  // P5-2：Runtime 契约字段（可选，向后兼容）
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface CapabilityDefinitionDTO {
  id: string;
  type: CapabilityType;
  name: string;
  description: string;
  lifecycle: CapabilityLifecycle;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCapabilityDTO {
  id: string;
  agentId: string;
  capabilityId: string;
  enabled: boolean;
  createdAt: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAgentDTO {
  id: string;
  projectId: string;
  agentId: string;
  addedAt: string;
}

export interface RunsStatsDTO {
  window: { from: string; to: string };
  totals: {
    runs: number;
    succeeded: number;
    failed: number;
    successRate: number; // 0-100，一位小数（服务端聚合口径）
    tokens: number;
    avgDurationMs: number;
    lastRunAt: string | null; // 窗口内最近运行时间（无运行则为 null）
  };
  daily: Array<{
    date: string;
    runs: number;
    succeeded: number;
    failed: number;
    successRate: number; // 0-100
  }>;
}

/** 时间窗口（前端唯一实现 windowBoundsForRange 计算 from/to；API 只接受显式边界） */
export interface TimeWindowParams {
  from?: string;
  to?: string;
}

export type TimeRangeParam = TimeRange;

/* ---------------- Resource Discovery DTO（本地资源发现，V1 MVP） ----------------
 *
 * DTO 与 Domain 同构（本区块数据只读展示，无独立写契约形状）；
 * 独立定义以保留 DTO/Domain 分离的演进边界（接真实 API 时字段可能变化）。
 */
export interface DiscoveredResourceDTO {
  id: string;
  scanId: string;
  harnessId: string;
  type: ResourceType;
  name: string;
  description: string;
  source: string;
  sourcePath: string;
  framework: string;
  version: string | null;
  status: ResourceStatus;
  parseable: boolean;
  parseNote: string | null;
  lastModified: string | null;
  metadata: Record<string, unknown>;
}

export interface HarnessScanSummaryDTO {
  harnessId: string;
  harnessName: string;
  rootPath: string;
  found: boolean;
  resourceCount: number;
  scannedAt: string;
}

export interface ScanRunDTO {
  id: string;
  status: ScanStatus;
  startedAt: string;
  finishedAt: string;
  locations: ScanLocation[];
  byHarness: Record<string, number>;
  byType: Record<string, number>;
  totalResources: number;
  parseableCount: number;
}

export interface DiscoveryOverviewDTO {
  scanRun: ScanRunDTO | null;
  harnesses: HarnessScanSummaryDTO[];
  totalResources: number;
  parseableCount: number;
  lastScannedAt: string | null;
}

export interface RunScanResultDTO {
  scanRun: ScanRunDTO | null;
  harnesses: HarnessScanSummaryDTO[];
  resources: DiscoveredResourceDTO[];
}
