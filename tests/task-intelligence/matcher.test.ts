import { describe, expect, it } from "vitest";
import { classifyMatch, MATCH_HIGH, MATCH_LOW } from "@/lib/task-intelligence/matcher";
import type { Recommendation } from "@/lib/task-intelligence/types";

function rec(score: number, name = `技能-${score}`): Recommendation {
  return {
    resourceCapabilityId: `rc-${score}`,
    resourceId: `r-${score}`,
    resourceName: name,
    harnessId: "hermes",
    type: "skill",
    capability: name,
    category: "code_gen",
    confidence: 0.8,
    evidenceRef: "SKILL.md#description",
    evidenceSnippet: "",
    sourcePath: `/x/${name}`,
    score,
    reason: "",
    requirementText: "实现一个函数",
    rank: 0,
  };
}

describe("classifyMatch — 推荐三态判定", () => {
  it("≥ MATCH_HIGH → matched,全部可用按分数降序", () => {
    const r = classifyMatch([rec(0.4), rec(0.7), rec(0.6)]);
    expect(r.state).toBe("matched");
    expect(r.topScore).toBe(0.7);
    expect(r.usable.map((x) => x.score)).toEqual([0.7, 0.6, 0.4]);
  });

  it("[MATCH_LOW, MATCH_HIGH) → low-confidence,仅保留前 3", () => {
    const r = classifyMatch([rec(0.36), rec(0.35), rec(0.2), rec(0.1)]);
    expect(r.state).toBe("low-confidence");
    expect(r.usable.length).toBe(3);
  });

  it("< MATCH_LOW → no-match,无可用的推荐", () => {
    const r = classifyMatch([rec(0.3), rec(0.2)]);
    expect(r.state).toBe("no-match");
    expect(r.usable).toEqual([]);
  });

  it("空列表 → no-match,topScore=0", () => {
    const r = classifyMatch([]);
    expect(r.state).toBe("no-match");
    expect(r.topScore).toBe(0);
  });

  it("阈值常量:MATCH_HIGH > MATCH_LOW", () => {
    expect(MATCH_HIGH).toBeGreaterThan(MATCH_LOW);
  });

  it("恰好等于 MATCH_HIGH 边界 → matched", () => {
    expect(classifyMatch([rec(MATCH_HIGH)]).state).toBe("matched");
  });
});