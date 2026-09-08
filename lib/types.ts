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

/* ---------- Capability 领域模型（Phase 3） ----------
 *
 * 三层结构：
 * 1. CapabilityDefinition —— 能力「定义/资产」：可被任意多个 Agent 复用的能力条目
 * 2. AgentCapability     —— 「装配关系」：某 Agent 装配了哪个 Definition、是否启用
 * 3. Agent               —— 持有若干条 AgentCapability（多对多中介）
 *
 * 边界原则：
 * - Definition 由能力库管理（未来 Skills/Memory/Rules/Tools 独立页管理的是这类资产）
 * - AgentCapability 记录装配上下文，不复制 Definition 内容
 * - Agent 页面只读装配关系 + 通过 Service 拉取 Definition 元信息，不硬编码业务逻辑
 */

/** 能力类型（未来可扩展，如 workflow / connector） */
export type CapabilityType = "skill" | "memory" | "rule" | "tool";

/** 能力定义的生命周期状态（资产生命周期；与「使用状态 Used/Unused」正交，使用状态为派生） */
export type CapabilityLifecycle = "active" | "archived";

export const CAPABILITY_LIFECYCLE_OPTIONS: {
  id: CapabilityLifecycle;
  label: string;
}[] = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

export const CAPABILITY_TYPE_OPTIONS: {
  id: CapabilityType;
  label: string;
  description: string;
}[] = [
  { id: "skill", label: "Skills", description: "技能与能力装配" },
  { id: "memory", label: "Memory", description: "语义记忆与知识" },
  { id: "rule", label: "Rules", description: "行为约束与治理" },
  { id: "tool", label: "Tools", description: "外部工具连接" },
];

export function capabilityTypeLabel(type: CapabilityType): string {
  return CAPABILITY_TYPE_OPTIONS.find((t) => t.id === type)?.label ?? type;
}

/** 能力定义（资产）：与 Agent 解耦，可被多个 Agent 复用 */
export interface CapabilityDefinition {
  id: string;
  type: CapabilityType;
  name: string;
  description: string;
  /**
   * 生命周期状态（软删除语义）：
   * - archived 的定义仍保留在资产库中（不物理删除），已有装配关系保留但冻结管理；
   * - archived 的定义不能被新的 Agent 装配；恢复（restore）后重新可装配。
   * 「使用状态 Used/Unused」是派生值（由 AgentCapability 装配数计算），不写入本字段。
   */
  lifecycle: CapabilityLifecycle;
  /** 创建时间（P4-2 起由服务端提供；Mock seed 兼容缺省） */
  createdAt?: string;
  /** 最近更新时间（P4-2 起由服务端提供；Mock seed 兼容缺省） */
  updatedAt?: string;
}

/** 新建能力定义的表单输入（Service 契约） */
export interface NewCapabilityInput {
  type: CapabilityType;
  name: string;
  description: string;
}

/** 编辑能力定义的字段补丁（Service 契约） */
export interface UpdateCapabilityInput {
  id: string;
  name: string;
  description: string;
  type: CapabilityType;
}

/** Agent 装配关系（多对多中介表）：引用 Definition，携带装配上下文 */
export interface AgentCapability {
  id: string;
  agentId: string; // → Agent.id
  capabilityId: string; // → CapabilityDefinition.id
  enabled: boolean;
  createdAt: string; // ISO 8601
}

/* ---------- Project 领域模型（Phase 3 第五阶段） ----------
 *
 * 层级：Workspace → Project → (ProjectAgent) → Agent → (AgentCapability) → Capability
 *                                   └─────────────── Agent → (AgentRun) → Run
 *
 * 原则：
 * - Project 是「业务组织上下文」：只引用 Agent（ProjectAgent 关系表），不复制任何数据；
 * - Agent 为工作区级资产，可属于多个 Project（多对多）；Capability 经 Agent 间接关联；
 * - Run 天然属于 Agent（agentId 外键），项目级统计全部派生，不给 Run 加 projectId。
 */

/** 项目生命周期状态（active / archived；本阶段仅 active，归档为软删除语义预留） */
export type ProjectStatus = "active" | "archived";

/** 项目（业务组织上下文，只维护关系，不持有 Agent/Capability/Run 副本） */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601，关联 Agent 时刷新（用于「最近活跃」）
}

/** 项目 ↔ Agent 关联关系（多对多中介表，模式与 AgentCapability 一致） */
export interface ProjectAgent {
  id: string;
  projectId: string; // → Project.id
  agentId: string; // → Agent.id（只引用，不复制）
  addedAt: string; // ISO 8601
}

/** 新建项目的表单输入（Service 契约） */
export interface NewProjectInput {
  name: string;
  description: string;
}

/** 智能体 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  model: ModelId;
  status: AgentStatus;
  systemPrompt: string;
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

/** 每日聚合（趋势图用；successRate 为 0-1，与前端 formatPercent 一致） */
export interface DailyStat {
  date: string; // YYYY-MM-DD
  label: string; // MM-DD
  runs: number;
  succeeded: number;
  failed: number;
  successRate: number; // 0-1
}

/** 运行统计聚合（/api/v1/runs/stats → Domain；服务端 SQLite 直接聚合，前端不再全量拉取） */
export interface RunsStats {
  window: { from: string; to: string };
  totals: {
    runs: number;
    succeeded: number;
    failed: number;
    successRate: number; // 0-1
    tokens: number;
    avgDurationMs: number;
    lastRunAt: string | null; // 窗口内最近运行时间（无运行则为 null）
  };
  daily: DailyStat[];
}
