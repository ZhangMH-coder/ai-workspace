/**
 * Task Intelligence —— 领域类型（Phase 3）
 *
 * 边界：只负责「选什么」（任务理解 → 能力需求 → 候选 → 推荐），不产生任何执行语义。
 * 事实 / 推断分离：
 * - 事实字段：sourcePath、ResourceCapability、confidence、匹配分、装配关系
 * - 推断字段：任务类型、子任务、需求描述、类别归类、推荐理由（isInferred 标记）
 */
import type { CapabilityCategory, ResourceType } from "@/lib/types";

/** 任务类型（推断产物；规则识别，LLM 未来并存） */
export type TaskTypeId =
  | "content_creation"
  | "text_summary"
  | "web_research"
  | "data_analysis"
  | "code_gen"
  | "automation"
  | "dev_tool"
  | "other";

/** 子任务（推断产物） */
export interface SubTask {
  id: string;
  label: string;
  description: string;
  /** 该子任务映射到的能力类别 */
  category: CapabilityCategory;
  /** 匹配关键词（推断） */
  keywords: string[];
  /** 权重 0-1（推断） */
  weight: number;
}

/** 能力需求（推断产物，落库时 isInferred=true） */
export interface CapabilityRequirement {
  requirementText: string;
  category: CapabilityCategory;
  keywords: string[];
  weight: number;
  /** 来源子任务描述 */
  derivedFrom: string;
  isInferred: true;
}

/** 可检索的能力单元（事实：来自真实 ResourceCapability + 资源） */
export interface RetrievableCapability {
  resourceCapabilityId: string;
  resourceId: string;
  resourceName: string;
  harnessId: string;
  type: ResourceType;
  capability: string;
  category: CapabilityCategory;
  keywords: string[];
  confidence: number;
  evidenceRef: string;
  evidenceSnippet: string;
  sourcePath: string;
}

/** 检索候选（事实 + 算法输出） */
export interface RetrievedItem {
  capability: RetrievableCapability;
  baseScore: number;
  /** 真实用户原文词（含双语扩展）在能力文本中的命中数：同分并列时的次级排序信号 */
  userHits: number;
}

/** 最终推荐（事实分数 + 推断理由） */
export interface Recommendation {
  resourceCapabilityId: string;
  resourceId: string;
  resourceName: string;
  harnessId: string;
  type: ResourceType;
  capability: string;
  category: CapabilityCategory;
  confidence: number;
  evidenceRef: string;
  evidenceSnippet: string;
  sourcePath: string;
  /** 事实：确定性算法匹配分 */
  score: number;
  /** 推断：推荐理由 */
  reason: string;
  /** 来源需求 */
  requirementText: string;
  rank: number;
}

/** 一次任务分析的完整产出 */
export interface RecommendationPlan {
  /** 落库后的分析记录 id（重复分析返回已有 id，不重复落库） */
  analysisId: string;
  task: string;
  /** 推断 */
  taskType: TaskTypeId;
  /** 推断总述 */
  summary: string;
  /** 推断：能力需求列表 */
  requirements: CapabilityRequirement[];
  /** 推荐列表（按 score 降序） */
  recommendations: Recommendation[];
  /** 策略：启发式 / LLM 增强（推断字段由 LLM 覆盖时标记 llm-assisted） */
  strategy: "heuristic" | "llm-assisted";
  analyzerVersion: string;
}

/** 分析器版本常量（与 registry 分离：任务分析有独立版本演进） */
export const TASK_ANALYZER_VERSION = "task-heuristic-v2";

/** 任务类型元数据 */
export const TASK_TYPE_OPTIONS: { id: TaskTypeId; label: string; category: CapabilityCategory }[] = [
  { id: "content_creation", label: "内容创作", category: "content_creation" },
  { id: "text_summary", label: "文本摘要", category: "text_summary" },
  { id: "web_research", label: "网络研究", category: "web_research" },
  { id: "data_analysis", label: "数据分析", category: "data_analysis" },
  { id: "code_gen", label: "代码生成", category: "code_gen" },
  { id: "automation", label: "自动化", category: "automation" },
  { id: "dev_tool", label: "开发工具", category: "dev_tool" },
  { id: "other", label: "其他", category: "other" },
];

export function taskTypeLabel(id: TaskTypeId): string {
  return TASK_TYPE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
