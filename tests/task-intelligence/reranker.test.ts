import { describe, expect, it } from "vitest";
import { rerankAndAssemble, MIN_RECOMMENDATION_SCORE } from "@/lib/task-intelligence/reranker";
import type { CapabilityRequirement, RetrievedItem, RetrievableCapability } from "@/lib/task-intelligence/types";

function req(requirementText: string, category: string): CapabilityRequirement {
  return {
    requirementText,
    category: category as never,
    keywords: [requirementText],
    weight: 1,
    derivedFrom: `子任务:${requirementText}`,
    isInferred: true,
  };
}

function cap(id: string, name: string, score?: number, evidence?: string): RetrievableCapability {
  return {
    resourceCapabilityId: id,
    resourceId: `res-${id}`,
    resourceName: name,
    harnessId: "hermes",
    type: "skill",
    capability: name,
    category: "code_gen",
    keywords: [],
    confidence: 0.9,
    evidenceRef: evidence ?? "SKILL.md#description",
    evidenceSnippet: "",
    sourcePath: `/x/${name}`,
  };
}

function item(c: RetrievableCapability, baseScore: number, userHits = 1): RetrievedItem {
  return { capability: c, baseScore, userHits };
}

describe("rerankAndAssemble — 合并/去重/排序", () => {
  it("分数 ≥ 最低推荐分才保留", () => {
    const r = rerankAndAssemble(
      [req("实现函数", "code_gen")],
      [{ requirement: req("实现函数", "code_gen"), items: [item(cap("a", "A"), MIN_RECOMMENDATION_SCORE)] }]
    );
    expect(r.length).toBe(1);
    expect(r[0].resourceCapabilityId).toBe("a");
  });

  it("低于最低推荐分被过滤", () => {
    const r = rerankAndAssemble(
      [req("实现函数", "code_gen")],
      [{ requirement: req("实现函数", "code_gen"), items: [item(cap("a", "A"), MIN_RECOMMENDATION_SCORE - 0.1)] }]
    );
    expect(r.length).toBe(0);
  });

  it("同一能力被多需求命中 → 保留最高分、只出现一次", () => {
    const r = rerankAndAssemble(
      [req("需求一", "code_gen"), req("需求二", "code_gen")],
      [
        { requirement: req("需求一", "code_gen"), items: [item(cap("a", "A"), 0.6)] },
        { requirement: req("需求二", "code_gen"), items: [item(cap("a", "A"), 0.8)] },
      ]
    );
    expect(r.filter((x) => x.resourceCapabilityId === "a").length).toBe(1);
    expect(r[0].score).toBeGreaterThanOrEqual(0.8);
  });

  it("同一资源多标签 → 保留最高分标签", () => {
    const c1 = { ...cap("a", "A1"), resourceId: "RES" };
    const c2 = { ...cap("b", "A2"), resourceId: "RES" };
    const r = rerankAndAssemble(
      [req("需求", "code_gen")],
      [{ requirement: req("需求", "code_gen"), items: [item(c1, 0.6), item(c2, 0.9)] }]
    );
    expect(r.filter((x) => x.resourceId === "RES").length).toBe(1);
    expect(r[0].resourceCapabilityId).toBe("b");
  });

  it("按分数降序 + rank 从 1 递增", () => {
    const r = rerankAndAssemble(
      [req("需求", "code_gen")],
      [
        { requirement: req("需求", "code_gen"), items: [item(cap("a", "A"), 0.6)] },
        { requirement: req("需求2", "code_gen"), items: [item(cap("b", "B"), 0.9)] },
      ]
    );
    expect(r[0].resourceCapabilityId).toBe("b");
    expect(r.map((x) => x.rank)).toEqual([1, 2]);
  });

  it("限制 limit 条数", () => {
    const rs = [item(cap("a", "A"), 0.9), item(cap("b", "B"), 0.8), item(cap("c", "C"), 0.7)].map((i) =>
      i as RetrievedItem
    );
    const r = rerankAndAssemble(
      [req("需求", "code_gen")],
      [{ requirement: req("需求", "code_gen"), items: rs }],
      2
    );
    expect(r.length).toBe(2);
  });

  it("空输入 → 空推荐", () => {
    expect(rerankAndAssemble([], [])).toEqual([]);
  });
});