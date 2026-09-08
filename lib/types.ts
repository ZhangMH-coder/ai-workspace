/**
 * AI Workspace 领域类型定义
 *
 * 约定：本文件为唯一数据契约来源。Mock 服务层与未来真实 API
 * 必须返回与此处完全一致的形状，界面层只依赖这里的类型。
 */

/** Agent 运行状态 */
export type AgentStatus = "active" | "idle" | "error" | "paused";

/** 单次运行结果状态 */
export type RunStatus = "success" | "failed" | "running";

/** 演示可选模型（后续可扩展为真实模型目录） */
export type ModelId = "doubao-pro" | "doubao-lite" | "gpt-4o" | "claude-sonnet";

export const MODEL_OPTIONS: { id: ModelId; label: string; hint: string }[] = [
  { id: "doubao-pro", label: "豆包 Pro", hint: "通用推理，长任务" },
  { id: "doubao-lite", label: "豆包 Lite", hint: "轻量快速，低成本" },
  { id: "gpt-4o", label: "GPT-4o", hint: "多模态通用" },
  { id: "claude-sonnet", label: "Claude Sonnet", hint: "长文本与代码" },
];

export function modelLabel(id: ModelId): string {
  return MODEL_OPTIONS.find((m) => m.id === id)?.label ?? id;
}

/** Agent 已装配能力（Phase 2 仅只读展示，数量由种子数据提供） */
export interface AgentCapabilities {
  skills: number;
  memory: number;
  rules: number;
  tools: number;
}

/** 智能体 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  model: ModelId;
  status: AgentStatus;
  systemPrompt: string;
  capabilities: AgentCapabilities;
  createdAt: string; // ISO 8601
  lastRunAt: string | null; // ISO 8601，未运行过为 null
}

/** 单次运行记录 */
export interface AgentRun {
  id: string;
  agentId: string;
  status: RunStatus;
  durationMs: number;
  tokensUsed: number;
  messages: number;
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
  summary: string;
}

/** 新建 Agent 的表单输入 */
export interface NewAgentInput {
  name: string;
  model: ModelId;
  description: string;
  systemPrompt: string;
}

/** Dashboard 时间范围 */
export type TimeRange = "today" | "7d" | "30d";

export const TIME_RANGE_OPTIONS: { id: TimeRange; label: string; days: number }[] = [
  { id: "today", label: "今天", days: 1 },
  { id: "7d", label: "最近 7 天", days: 7 },
  { id: "30d", label: "最近 30 天", days: 30 },
];

export function timeRangeLabel(id: TimeRange): string {
  return TIME_RANGE_OPTIONS.find((t) => t.id === id)?.label ?? "最近 30 天";
}

/** 单个 Agent 的聚合统计（由 runs 实时计算，不落库） */
export interface AgentStats {
  totalRuns: number;
  successRate: number; // 0-1，无运行为 0
  totalTokens: number;
  avgDurationMs: number;
}
