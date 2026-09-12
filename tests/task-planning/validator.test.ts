import { describe, expect, it } from "vitest";
import { validatePlan } from "@/lib/task-planning/validator";
import type { PlanCandidate, PlanDependencyDraft, PlanValidation, SelectedStep } from "@/lib/task-planning/types";
import { LOW_CONFIDENCE_THRESHOLD } from "@/lib/task-planning/primary-selector";

function candidate(score: number, name = "技能"): PlanCandidate {
  return {
    resourceCapabilityId: `cap-${name}-${score}`,
    resourceId: `res-${name}`,
    resourceName: name,
    harnessId: "hermes",
    type: "skill",
    capability: name,
    category: "code_gen",
    confidence: 0.9,
    evidenceRef: "SKILL.md#description",
    evidenceSnippet: "",
    sourcePath: `/x/${name}`,
    score,
  };
}

function step(index: number, opts?: { primaryScore?: number; primary?: PlanCandidate | null }): SelectedStep {
  const primary =
    opts?.primary !== undefined
      ? opts.primary
      : opts?.primaryScore !== undefined
        ? candidate(opts.primaryScore)
        : null;
  return {
    stepIndex: index,
    requirement: {
      requirementText: `步骤 ${index + 1}`,
      category: "code_gen",
      keywords: [],
      weight: 1,
      derivedFrom: "子任务",
      isInferred: true,
    },
    primary,
    alternatives: [],
    satisfaction: primary == null ? "unmet" : "satisfied",
    outputDescription: "",
    expectedInput: null,
  };
}

function edge(from: number, to: number): PlanDependencyDraft {
  return { fromStepIndex: from, toStepIndex: to, type: "data_flow", reason: "" };
}

function codes(v: PlanValidation): string[] {
  return v.issues.map((i) => i.code);
}

describe("validatePlan — 计划校验", () => {
  it("空计划 + 无依赖 → valid", () => {
    const v = validatePlan([], []);
    expect(v.status).toBe("valid");
    expect(v.issues).toEqual([]);
  });

  it("合法 DAG + 已满足步骤 → valid", () => {
    const v = validatePlan([step(0, { primaryScore: 0.9 }), step(1, { primaryScore: 0.8 })], [
      edge(0, 1),
    ]);
    expect(v.status).toBe("valid");
  });

  it("dangling_input:边端点越界 → invalid", () => {
    const v = validatePlan([step(0, { primaryScore: 0.9 })], [edge(-1, 0)]);
    expect(v.status).toBe("invalid");
    expect(codes(v)).toContain("dangling_input");
  });

  it("circular_dependency:环 → invalid", () => {
    const v = validatePlan(
      [step(0, { primaryScore: 0.9 }), step(1, { primaryScore: 0.9 })],
      [edge(0, 1), edge(1, 0)]
    );
    expect(v.status).toBe("invalid");
    expect(codes(v)).toContain("circular_dependency");
  });

  it("自环 → invalid", () => {
    const v = validatePlan([step(0, { primaryScore: 0.9 })], [edge(0, 0)]);
    expect(v.status).toBe("invalid");
    expect(codes(v)).toContain("circular_dependency");
  });

  it("unmet_capability:步骤无候选 → warning,状态 partial", () => {
    const v = validatePlan([step(0)], []);
    expect(v.status).toBe("partial");
    expect(codes(v)).toContain("unmet_capability");
  });

  it("duplicate_capability:同一能力被两步骤复用 → warning", () => {
    const shared = candidate(0.9, "共享技能");
    const v = validatePlan(
      [step(0, { primary: shared }), step(1, { primary: shared })],
      []
    );
    expect(codes(v)).toContain("duplicate_capability");
  });

  it("low_confidence:主选低于阈值 → warning", () => {
    const v = validatePlan([step(0, { primaryScore: LOW_CONFIDENCE_THRESHOLD - 0.1 })], []);
    expect(codes(v)).toContain("low_confidence");
  });

  it("多种 warning 并存 → partial 且全部登记", () => {
    const shared = candidate(0.2, "低分技能"); // low_confidence + duplicate
    const v = validatePlan([step(0, { primary: shared }), step(1, { primary: shared }), step(2)], []);
    expect(v.status).toBe("partial");
    expect(codes(v)).toEqual(
      expect.arrayContaining(["unmet_capability", "duplicate_capability", "low_confidence"])
    );
  });

  it("warning 与 error 并存 → invalid 优先", () => {
    const v = validatePlan([step(0)], [edge(-1, 0)]);
    expect(v.status).toBe("invalid");
  });
});