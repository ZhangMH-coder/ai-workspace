/**
 * PlanValidator —— 确定性计划校验（合法性判定不依赖 LLM）
 *
 * 规则：
 * - error → invalid：circular_dependency（Kahn 拓扑检测）、dangling_input（边端点越界）；
 * - warning → partial：unmet_capability、duplicate_capability、low_confidence（如实降级）；
 * - 无 issue → valid。
 * 即使未来 LLM 参与生成，输出必须先过本校验才能落库。
 */
import { MIN_RECOMMENDATION_SCORE } from "@/lib/task-intelligence/reranker";
import { LOW_CONFIDENCE_THRESHOLD } from "./primary-selector";
import type { PlanDependencyDraft, PlanIssue, PlanValidation, SelectedStep } from "./types";

export function validatePlan(
  steps: SelectedStep[],
  edges: PlanDependencyDraft[]
): PlanValidation {
  const issues: PlanIssue[] = [];
  const n = steps.length;

  // 1) dangling_input：边端点越界（构造性保证下不应发生；对 LLM 输出为防御层）
  for (const e of edges) {
    if (
      e.fromStepIndex < 0 ||
      e.fromStepIndex >= n ||
      e.toStepIndex < 0 ||
      e.toStepIndex >= n
    ) {
      issues.push({
        level: "error",
        code: "dangling_input",
        stepIndex: e.toStepIndex,
        message: `依赖边引用了不存在的步骤（from=${e.fromStepIndex}, to=${e.toStepIndex}）`,
      });
    }
  }

  // 2) circular_dependency：Kahn 拓扑排序，剩余节点即环成员
  const validEdges = edges.filter(
    (e) =>
      e.fromStepIndex >= 0 &&
      e.fromStepIndex < n &&
      e.toStepIndex >= 0 &&
      e.toStepIndex < n
  );
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const indeg = new Array<number>(n).fill(0);
  for (const e of validEdges) {
    if (!adj[e.fromStepIndex].has(e.toStepIndex)) {
      adj[e.fromStepIndex].add(e.toStepIndex);
      indeg[e.toStepIndex] += 1;
    }
  }
  const queue: number[] = [];
  for (let i = 0; i < n; i += 1) if (indeg[i] === 0) queue.push(i);
  let visited = 0;
  while (queue.length > 0) {
    const u = queue.shift() as number;
    visited += 1;
    for (const v of adj[u]) {
      indeg[v] -= 1;
      if (indeg[v] === 0) queue.push(v);
    }
  }
  if (visited < n) {
    const inCycle = indeg
      .map((d, i) => (d > 0 ? i : -1))
      .filter((i) => i >= 0);
    issues.push({
      level: "error",
      code: "circular_dependency",
      message: `检测到循环依赖，涉及步骤：${inCycle.map((i) => i + 1).join(" → ")}`,
    });
  }

  // 3) unmet_capability：无任何 ≥ 最低推荐分的候选（如实标记，不伪造可执行性）
  for (const s of steps) {
    if (s.satisfaction === "unmet") {
      issues.push({
        level: "warning",
        code: "unmet_capability",
        stepIndex: s.stepIndex,
        message: `步骤 ${s.stepIndex + 1}（${s.requirement.requirementText}）无满足最低置信（${MIN_RECOMMENDATION_SCORE}）的能力候选，如实标记为未满足`,
      });
    }
  }

  // 4) duplicate_capability：同一 capability 被多个步骤选为主选（warning，允许共享但需确认）
  const byCap = new Map<string, { name: string; steps: number[] }>();
  for (const s of steps) {
    if (s.primary) {
      const cur = byCap.get(s.primary.resourceCapabilityId) ?? {
        name: s.primary.capability,
        steps: [],
      };
      cur.steps.push(s.stepIndex);
      byCap.set(s.primary.resourceCapabilityId, cur);
    }
  }
  for (const [capId, entry] of byCap) {
    if (entry.steps.length > 1) {
      issues.push({
        level: "warning",
        code: "duplicate_capability",
        message: `能力「${entry.name}」（${capId.slice(0, 8)}…）同时作为步骤 ${entry.steps
          .map((i) => i + 1)
          .join("、")} 的主选能力；如需共享请确认，否则应拆分`,
      });
    }
  }

  // 5) low_confidence：主选得分低于阈值 → 如实降级提示
  for (const s of steps) {
    if (s.primary && s.primary.score < LOW_CONFIDENCE_THRESHOLD) {
      issues.push({
        level: "warning",
        code: "low_confidence",
        stepIndex: s.stepIndex,
        message: `步骤 ${s.stepIndex + 1} 主选能力「${s.primary.capability}」得分 ${s.primary.score.toFixed(
          2
        )} 偏低，可执行性置信不足，如实降级提示`,
      });
    }
  }

  const hasError = issues.some((i) => i.level === "error");
  return {
    status: hasError ? "invalid" : issues.length > 0 ? "partial" : "valid",
    issues,
  };
}
