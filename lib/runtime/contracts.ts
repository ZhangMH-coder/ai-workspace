/**
 * AI Runtime 契约（P5-1 设计 → P5-2 落地）
 *
 * 本文件只定义类型与纯函数，不包含任何执行逻辑。
 * 分层约束：UI / Store / Service 不得直接引用 Provider 实现；
 * 只允许通过 Runtime（lib/runtime/runtime.ts）接口消费。
 */
import type { AgentRun } from "@/lib/types";

/* ================= Run 状态机 ================= */

/** P5-1 §5：五态生命周期（succeeded/failed 为终态，不可逆） */
export type RunLifecycleStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

/** 合法状态转换表：queued→running/cancelled；running→succeeded/failed/cancelled；终态无出边 */
export const RUN_TRANSITIONS: Record<RunLifecycleStatus, RunLifecycleStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

/** 纯函数：from → to 是否合法（供 Service 状态迁移校验与测试使用） */
export function canTransition(from: RunLifecycleStatus, to: RunLifecycleStatus): boolean {
  return RUN_TRANSITIONS[from]?.includes(to) ?? false;
}

/** 统计口径：successRate 分母 = succeeded + failed；queued/running/cancelled 不计入 */
export function isFinalRunStatus(s: RunLifecycleStatus): boolean {
  return s === "succeeded" || s === "failed" || s === "cancelled";
}

/* ================= Model 契约（P5-1 §4） ================= */

export type ProviderId = "llm" | "openai" | "anthropic" | "deepseek" | "doubao";

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export interface ModelConfig {
  provider: ProviderId;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retry: RetryPolicy;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: "llm",
  model: "doubao-pro",
  temperature: 0.7,
  maxTokens: 4096,
  timeoutMs: 120_000,
  retry: { maxAttempts: 2, backoffMs: 1_000 },
};

/* ================= 请求 / 上下文（P5-1 §4/§6） ================= */

export interface RuntimeRequest {
  runId: string;
  agentId: string;
  input: string;
  modelConfig: ModelConfig;
  source: "ui" | "api";
  /** Agent 系统提示词（真实 Provider 执行时注入 system 消息） */
  systemPrompt?: string;
}

export interface RuntimeRule {
  capabilityId: string;
  name: string;
  description: string;
}

export interface RuntimeTool {
  capabilityId: string;
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface RuntimeSkill {
  capabilityId: string;
  name: string;
  description: string;
}

export interface MemoryHint {
  capabilityId: string;
  name: string;
  description: string;
}

/** CapabilityLoader 产物：Definition(资产) + AgentCapability(装配) 只读消费后的执行上下文 */
export interface ExecutionContext {
  agent: { id: string; name: string; systemPrompt: string; model: string };
  systemPrompt: string;
  rules: RuntimeRule[];
  tools: RuntimeTool[];
  skills: RuntimeSkill[];
  memoryHints: MemoryHint[];
  assembledCount: number;
}

/** CapabilityLoader 数据源注入：数据源无关（Real=SQLite，Mock=内存） */
export interface CapabilitySource {
  getAgent(agentId: string): {
    id: string;
    name: string;
    systemPrompt: string;
    model: string;
  } | null;
  /** 返回该 Agent 的全部装配（含 disabled / 归档），由 Loader 过滤 */
  listAssemblies(agentId: string): Array<{
    capabilityId: string;
    enabled: boolean;
    type: string;
    name: string;
    description: string;
    lifecycle: string;
  }>;
}

/* ================= 结果 / 错误 / 用量（P5-1 §4/§9/§10） ================= */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costMicros?: number;
}

export type RuntimeErrorCode =
  | "model_not_found"
  | "context_too_large"
  | "invalid_input"
  | "provider_unavailable"
  | "provider_timeout"
  | "rate_limited"
  | "tool_failed"
  | "tool_not_found"
  | "cancelled"
  | "internal_error";

export interface RuntimeError {
  code: RuntimeErrorCode;
  message: string;
  layer: "runtime" | "provider" | "tool" | "cancel";
  recoverable: boolean;
  retryCount?: number;
  cause?: unknown;
}

export interface RuntimeResult {
  runId: string;
  status: "succeeded" | "failed" | "cancelled";
  output?: string;
  summary: string;
  usage: TokenUsage;
  durationMs: number;
  error?: RuntimeError;
}

/* ================= Provider 接口（P5-1 §7） ================= */

export interface RuntimeMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ProviderExecuteRequest {
  model: string;
  messages: RuntimeMessage[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retry: RetryPolicy;
  metadata?: Record<string, unknown>;
}

export interface ProviderExecuteResult {
  text: string;
  usage: TokenUsage;
  /** Provider 层失败（如 14% 演示失败 / 超时）；非空时 Runtime 视为 failed */
  error?: {
    code: RuntimeErrorCode;
    message: string;
    layer: "provider";
    recoverable: boolean;
  };
  /** 执行耗时（ms）。Mock 模拟演示分布（8s~230s）；真实 Provider 为实际耗时 */
  durationMs?: number;
  raw?: unknown;
}

/** 流式 chunk（P5-2 仅保留契约，不进入执行路径 / 不建 SSE） */
export type ProviderStreamChunk =
  | { kind: "delta"; text: string }
  | { kind: "tool_call"; id: string; name: string; args: string }
  | { kind: "done"; usage: TokenUsage }
  | { kind: "error"; code: string; message: string };

export interface RuntimeProvider {
  readonly id: ProviderId;
  supportedModels(): Promise<string[]>;
  execute(req: ProviderExecuteRequest, signal?: AbortSignal): Promise<ProviderExecuteResult>;
  stream(req: ProviderExecuteRequest, signal?: AbortSignal): AsyncGenerator<ProviderStreamChunk>;
  costOf?(usage: TokenUsage): number | undefined;
}

/* ================= Streaming 事件（P5-1 §8，仅契约） ================= */

export type RuntimeEvent =
  | { type: "delta"; text: string }
  | { type: "tool_call"; id: string; name: string; args: string }
  | { type: "tool_result"; id: string; ok: boolean; result?: string; error?: string }
  | { type: "finish"; usage: TokenUsage; summary: string }
  | { type: "error"; code: RuntimeErrorCode; message: string; recoverable: boolean };

/* ================= Run 持久化形状（Service 落库） ================= */

/** 由 RuntimeResult 映射出的 Run 更新（Service → Repository） */
export interface RunPatch {
  status: RunLifecycleStatus;
  summary: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  provider?: string;
  errorCode?: string;
  errorMessage?: string;
  finishedAt?: string;
}

/** 供 AgentRun（前端 Domain）兼容历史 success 值 */
export function normalizeRunStatus(status: string): RunLifecycleStatus {
  if (status === "success") return "succeeded";
  if (status === "queued" || status === "running" || status === "succeeded" || status === "failed" || status === "cancelled") {
    return status;
  }
  return "failed";
}

/** AgentRun 领域类型扩展引用（保持 lib/types.ts 为唯一 Domain 定义处） */
export type { AgentRun };
