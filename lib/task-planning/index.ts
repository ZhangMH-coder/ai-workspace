/**
 * Task Planning —— 编排入口（Phase 4）
 *
 * 流水线（用户锁定）：RecommendationPlan → PlanNormalizer → StepOrderer →
 * DependencyInferer → PrimarySelector → PlanValidator → PlanDraft。
 * 纯计算：不 import lib/runtime/*，不产生执行语义；service 负责 id / 落库 / 幂等。
 *
 * PlannerProvider 与 AnalysisProvider 同模式：
 * - planner-heuristic-v1：唯一实际实现（本文件注册）；
 * - planner-llm-v1：契约桩，不注册不执行。
 */
import { inferDependencies } from "./dependency-inferer";
import { normalizePlan } from "./normalizer";
import { orderSteps } from "./orderer";
import { selectPrimaries } from "./primary-selector";
import { validatePlan } from "./validator";
import { PLANNER_VERSION, type PlanDraft, type PlannerInput, type PlannerOutput, type PlannerProvider } from "./types";
import type { RecommendationPlan, RetrievableCapability } from "@/lib/task-intelligence/types";

export * from "./types";
export { normalizePlan } from "./normalizer";
export { orderSteps, CATEGORY_AFTER } from "./orderer";
export { inferDependencies, CATEGORY_OUTPUT_HINTS } from "./dependency-inferer";
export { selectPrimaries, MAX_ALTERNATIVES, LOW_CONFIDENCE_THRESHOLD } from "./primary-selector";
export { validatePlan } from "./validator";

/** 纯计算：plan + 真实能力标签 → PlanDraft（失败时抛错由调用方转 failed 落库） */
export function planTask(
  plan: RecommendationPlan,
  capabilities: RetrievableCapability[]
): PlanDraft {
  const normalized = normalizePlan(plan, capabilities);
  const ordered = orderSteps(normalized);
  const edges = inferDependencies(ordered);
  const selected = selectPrimaries(ordered);
  const validation = validatePlan(selected, edges);
  return { status: validation.status, validation, steps: selected, dependencies: edges };
}

/** 唯一实际实现：planner-heuristic-v1 */
export const heuristicPlanner: PlannerProvider = {
  id: PLANNER_VERSION,
  strategy: "heuristic",
  plan(input: PlannerInput): PlannerOutput {
    try {
      const draft = planTask(input.plan, input.capabilities);
      return { status: "planned", draft };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: "failed", errorCode: "PLANNING_FAILED", errorMessage: msg };
    }
  },
};

/** 契约桩：planner-llm-v1（不注册、不接真实 LLM） */
export const llmPlanner: PlannerProvider = {
  id: "planner-llm-v1",
  strategy: "llm",
  plan(): PlannerOutput {
    return {
      status: "failed",
      errorCode: "PROVIDER_NOT_AVAILABLE",
      errorMessage: "Phase 4 仅提供 HeuristicPlanner；LLM Planner 为契约桩，未注册。",
    };
  },
};

/** 注册表（对齐 registry 模式：MVP 只注册 heuristic） */
export const PLANNERS: PlannerProvider[] = [heuristicPlanner];

export function getPlanner(id?: string): PlannerProvider {
  if (!id) return PLANNERS[0];
  const found = PLANNERS.find((p) => p.id === id);
  if (!found) throw new Error(`PLANNER_NOT_FOUND: ${id}`);
  return found;
}
