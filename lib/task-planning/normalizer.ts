/**
 * PlanNormalizer —— RecommendationPlan → 按需求重建真实候选集
 *
 * - 每个 requirement 重新调用 Retriever（确定性纯函数，输入与 Phase 3 分析时一致，
 *   输出一致），恢复被 Reranker 全局限 8 丢弃的次优候选（≥ 最低推荐分）；
 * - 候选全部来自真实 ResourceCapability，不制造任何候选资源；
 * - 低于 MIN_RECOMMENDATION_SCORE 的候选如实过滤（不伪造可执行性）。
 */
import { retrieveCapabilities } from "@/lib/task-intelligence/retriever";
import { MIN_RECOMMENDATION_SCORE } from "@/lib/task-intelligence/reranker";
import type { RecommendationPlan, RetrievableCapability } from "@/lib/task-intelligence/types";
import type { PlanCandidate } from "./types";

/** 归一化后的步骤（尚未排序 / 选主选） */
export interface NormalizedStep {
  requirement: RecommendationPlan["requirements"][number];
  /** 全部 ≥ 最低推荐分的候选（retriever score 降序） */
  candidates: PlanCandidate[];
}

/** 单需求检索 topN（与 Phase 3 analyze 一致） */
export const PLAN_TOP_N = 6;

export function normalizePlan(
  plan: RecommendationPlan,
  capabilities: RetrievableCapability[]
): NormalizedStep[] {
  return plan.requirements.map((requirement) => {
    const items = retrieveCapabilities(requirement, capabilities, PLAN_TOP_N, plan.task);
    const candidates: PlanCandidate[] = items
      .filter((it) => it.baseScore >= MIN_RECOMMENDATION_SCORE)
      .map((it) => ({ ...it.capability, score: it.baseScore }));
    return { requirement, candidates };
  });
}
