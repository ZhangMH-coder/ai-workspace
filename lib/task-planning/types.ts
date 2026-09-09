/**
 * Task Planning —— 领域类型（Phase 4）
 *
 * 边界：只负责「如何组织能力」（排序 / 依赖 / 主选 / 回退 / 校验），不产生任何执行语义。
 * - lib/task-planning/ 不得 import lib/runtime/*；lib/runtime/contracts.ts 零修改。
 * - TaskPlan 只引用真实 ResourceCapability（FK），不复制能力正文。
 * 事实 / 推断分离：
 * - 事实字段：primary / alternatives（resourceCapabilityId、score、confidence、evidenceRef、sourcePath）
 * - 推断字段：outputDescription / expectedInput / dependency.reason（isInferred=true 落库）
 */
import type { CapabilityCategory } from "@/lib/types";
import type {
  CapabilityRequirement,
  RecommendationPlan,
  RetrievableCapability,
} from "@/lib/task-intelligence/types";

/** 计划状态：valid 全通过 / partial 有警告 / invalid 结构错误 / failed 生成失败 */
export type PlanStatus = "valid" | "partial" | "invalid" | "failed";

/** 步骤满足状态：satisfied 有主选 / unmet 无任何可用候选（如实降级） */
export type StepSatisfaction = "satisfied" | "unmet";

/** 依赖类型：data_flow 下游消费上游输出 / constraint 执行约束（本阶段仅 data_flow） */
export type DependencyType = "data_flow" | "constraint";

/** 计划候选（事实：来自真实 ResourceCapability + 真实 Retriever 得分） */
export interface PlanCandidate {
  resourceCapabilityId: string;
  resourceId: string;
  resourceName: string;
  harnessId: string;
  type: RetrievableCapability["type"];
  capability: string;
  category: CapabilityCategory;
  confidence: number;
  evidenceRef: string;
  evidenceSnippet: string;
  sourcePath: string;
  /** 事实：确定性算法匹配分（retriever 原分，不重算不加工） */
  score: number;
}

/** 校验问题（确定性算法输出，合法性判定不依赖 LLM） */
export interface PlanIssue {
  level: "error" | "warning";
  code:
    | "circular_dependency"
    | "dangling_input"
    | "unmet_capability"
    | "duplicate_capability"
    | "low_confidence";
  stepIndex?: number;
  message: string;
}

export interface PlanValidation {
  status: "valid" | "partial" | "invalid";
  issues: PlanIssue[];
}

/** 已选主选后的步骤（含推断的输出 / 输入声明） */
export interface SelectedStep {
  stepIndex: number;
  requirement: CapabilityRequirement;
  /** 主选能力（无任何可用候选时为 null → unmet） */
  primary: PlanCandidate | null;
  /** 回退链：次优候选（≥ 最低推荐分，封顶 3；来自 Retriever 真实候选集） */
  alternatives: PlanCandidate[];
  satisfaction: StepSatisfaction;
  /** 推断：本步输出声明 */
  outputDescription: string;
  /** 推断：本步期望输入 */
  expectedInput: string | null;
}

/** 依赖边（构造中间形态；落库时注入 id） */
export interface PlanDependencyDraft {
  fromStepIndex: number;
  toStepIndex: number;
  type: DependencyType;
  /** 推断：依赖理由（基于类别模板或文本信号生成） */
  reason: string;
}

/** Planner 纯计算产物（service 负责注入 id / analysisId / createdAt 并落库） */
export interface PlanDraft {
  status: "valid" | "partial" | "invalid";
  validation: PlanValidation;
  steps: SelectedStep[];
  dependencies: PlanDependencyDraft[];
}

/** 领域 TaskPlan（service 落库后 / 查询返回的形状） */
export interface TaskPlan {
  id: string;
  analysisId: string;
  status: PlanStatus;
  plannerStrategy: "heuristic" | "llm";
  plannerVersion: string;
  createdAt: string;
  /** 确定性校验结果快照 */
  validation: PlanValidation;
  steps: Array<{
    id: string;
    stepIndex: number;
    requirementId: string;
    requirementText: string;
    category: CapabilityCategory;
    /** 主选能力（unmet 时为 null） */
    primary: PlanCandidate | null;
    /** 回退链（来自 Retriever 真实候选集） */
    alternatives: PlanCandidate[];
    /** 推断 */
    outputDescription: string;
    /** 推断 */
    expectedInput: string | null;
    satisfaction: StepSatisfaction;
    isInferred: boolean;
  }>;
  dependencies: Array<{
    id: string;
    fromStepIndex: number;
    toStepIndex: number;
    type: DependencyType;
    /** 推断 */
    reason: string;
    isInferred: boolean;
  }>;
}

/** Planner 输入：已落库分析的 RecommendationPlan + 当前真实能力标签（重建候选集） */
export interface PlannerInput {
  plan: RecommendationPlan;
  capabilities: RetrievableCapability[];
}

/** Planner 输出 */
export interface PlannerOutput {
  status: "planned" | "failed";
  draft?: PlanDraft;
  errorCode?: string;
  errorMessage?: string;
}

/** PlannerProvider（与 AnalysisProvider 同模式：heuristic 唯一实现，LLM 契约桩不注册） */
export interface PlannerProvider {
  id: string;
  strategy: "heuristic" | "llm";
  plan(input: PlannerInput): PlannerOutput;
}

/** 当前 Planner 版本（写入 task_plan.planner_version） */
export const PLANNER_VERSION = "planner-heuristic-v1";
