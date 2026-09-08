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
