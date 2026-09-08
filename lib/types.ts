/**
 * AI Workspace 领域类型定义
 *
 * 约定：本文件为唯一数据契约来源。Mock 服务层与未来真实 API
 * 必须返回与此处完全一致的形状，界面层只依赖这里的类型。
 */

/** Agent 运行状态 */
export type AgentStatus = "active" | "idle" | "error" | "paused";

/** 单次运行结果状态（P5-2：五态生命周期；succeeded/failed/cancelled 为终态） */
export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

/** 运行状态展示元信息（P5-2：集中维护，组件共用；兼容历史 success → succeeded） */
export const runStatusMeta: Record<RunStatus, { label: string; badge: string }> = {
  queued: { label: "排队中", badge: "border-white/15 bg-white/[0.06] text-ink-2" },
  running: { label: "运行中", badge: "border-info/30 bg-info/10 text-info" },
  succeeded: { label: "成功", badge: "border-success/30 bg-success/10 text-success" },
  failed: { label: "失败", badge: "border-danger/30 bg-danger/10 text-danger" },
  cancelled: { label: "已取消", badge: "border-warning/30 bg-warning/10 text-warning" },
};

/** 兼容历史 success 值（防御旧数据/旧缓存） */
export function normalizeRunStatus(status: string): RunStatus {
  if (status === "success") return "succeeded";
  if (status === "queued" || status === "running" || status === "succeeded" || status === "failed" || status === "cancelled") {
    return status;
  }
  return "failed";
}

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
  // P5-2：Runtime 契约字段（可选，向后兼容旧数据）
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
  errorMessage?: string;
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

/* ---------------- Resource Discovery 领域模型（本地资源发现，V1 MVP） ----------------
 *
 * 数据来源：本机真实 AI Harness 目录（只读发现 + 导入索引）。
 * 边界：不伪造资源；sourcePath 必须能追溯到真实本地文件；不可解析 → parseable=false。
 */

/** 统一资源类型（未来可扩展，如 workflow / connector） */
export type ResourceType =
  | "agent"
  | "skill"
  | "command"
  | "rule"
  | "prompt"
  | "mcp"
  | "plugin"
  | "other";

export const RESOURCE_TYPE_OPTIONS: { id: ResourceType; label: string }[] = [
  { id: "skill", label: "Skill" },
  { id: "agent", label: "Agent" },
  { id: "command", label: "Command" },
  { id: "rule", label: "Rule" },
  { id: "prompt", label: "Prompt" },
  { id: "mcp", label: "MCP" },
  { id: "plugin", label: "Plugin" },
  { id: "other", label: "Other" },
];

export function resourceTypeLabel(type: ResourceType): string {
  return RESOURCE_TYPE_OPTIONS.find((t) => t.id === type)?.label ?? type;
}

/** 资源状态（尽力判断；无法判断为 unknown，不猜测） */
export type ResourceStatus = "enabled" | "unknown";

/** 扫描运行状态 */
export type ScanStatus = "completed" | "partial" | "failed";

/** 统一资源索引条目 */
export interface DiscoveredResource {
  id: string;
  scanId: string;
  harnessId: string;
  type: ResourceType;
  name: string;
  description: string;
  /** Harness 展示名 */
  source: string;
  /** 真实绝对路径（唯一键，可溯源到原始文件/目录） */
  sourcePath: string;
  framework: string;
  version: string | null;
  status: ResourceStatus;
  parseable: boolean;
  parseNote: string | null;
  lastModified: string | null;
  /** 原始元数据摘要（frontmatter 头部 / manifest 关键字段 / 配置键名） */
  metadata: Record<string, unknown>;
}

/** 单个 Harness 的扫描结果 */
export interface HarnessScanSummary {
  harnessId: string;
  harnessName: string;
  rootPath: string;
  found: boolean;
  resourceCount: number;
  scannedAt: string;
}

/** 扫描位置（探测过的候选根 + 命中它的 Harness） */
export interface ScanLocation {
  path: string;
  label: string;
  hits: string[];
}

/** 一次扫描运行的完整记录 */
export interface ScanRun {
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

/** 资源发现概览（最新一次扫描） */
export interface DiscoveryOverview {
  scanRun: ScanRun | null;
  harnesses: HarnessScanSummary[];
  totalResources: number;
  parseableCount: number;
  lastScannedAt: string | null;
}

/** 一次扫描的完整结果（POST /scan 返回） */
export interface RunScanResult {
  scanRun: ScanRun | null;
  harnesses: HarnessScanSummary[];
  resources: DiscoveredResource[];
}
