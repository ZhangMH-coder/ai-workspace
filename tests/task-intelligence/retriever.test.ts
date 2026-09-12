import { describe, expect, it } from "vitest";
import { retrieveCapabilities, tokenizeTask } from "@/lib/task-intelligence/retriever";
import type { CapabilityRequirement, RetrievableCapability } from "@/lib/task-intelligence/types";

function cap(id: string, name: string, category: string, keywords: string[] = []): RetrievableCapability {
  return {
    resourceCapabilityId: id,
    resourceId: `res-${id}`,
    resourceName: name,
    harnessId: "hermes",
    type: "skill",
    capability: name,
    category: category as never,
    keywords,
    confidence: 0.9,
    evidenceRef: "SKILL.md#description",
    evidenceSnippet: name,
    sourcePath: `/x/${name}`,
  };
}

function req(text: string, category: string): CapabilityRequirement {
  return {
    requirementText: text,
    category: category as never,
    keywords: [text],
    weight: 1,
    derivedFrom: "子任务",
    isInferred: true,
  };
}

describe("tokenizeTask — 分词", () => {
  it("英文分词:≥2 字符 token", () => {
    expect(tokenizeTask("write code")).toEqual(expect.arrayContaining(["write", "code"]));
  });

  it("中文 2/3-gram 分词", () => {
    const tokens = tokenizeTask("写代码");
    expect(tokens.some((t) => t.includes("写"))).toBe(true);
    expect(tokens.some((t) => t.includes("代码"))).toBe(true);
  });

  it("停用词被过滤", () => {
    const tokens = tokenizeTask("怎么进行");
    expect(tokens).not.toContain("怎么");
  });

  it("小写归一化", () => {
    const tokens = tokenizeTask("HELLO");
    expect(tokens).toContain("hello");
  });
});

describe("retrieveCapabilities — 能力检索", () => {
  const capabilities = [
    cap("a", "代码生成技能", "code_gen", ["代码"]),
    cap("b", "网页搜索技能", "web_research", ["搜索"]),
    cap("c", "图片处理技能", "content_creation", ["图片"]),
  ];

  it("候选按分数降序返回 topN", () => {
    const r = retrieveCapabilities(req("编写代码", "code_gen"), capabilities, 3, "编写代码");
    expect(r.length).toBeGreaterThan(0);
    const scores = r.map((i) => i.baseScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("类别一致加成后 code_gen 类需求优先命中代码技能", () => {
    const r = retrieveCapabilities(req("编写代码", "code_gen"), capabilities, 3, "编写代码");
    expect(r[0].capability.resourceCapabilityId).toBe("a");
  });

  it("other 类别(未识别)不产生泛化推荐:无用户命中则空", () => {
    const r = retrieveCapabilities(req("随便聊聊", "other"), capabilities, 3, "随便聊聊");
    expect(r.length).toBe(0);
  });

  it("无任何用户词/关键词命中 → 该能力被淘汰", () => {
    const r = retrieveCapabilities(
      req("编写代码", "code_gen"),
      [cap("x", "无关技能", "web_research", ["无关词"])],
      3,
      "编写代码"
    );
    expect(r.length).toBe(0);
  });

  it("空能力集 → 空结果", () => {
    expect(retrieveCapabilities(req("编写代码", "code_gen"), [], 3, "编写代码")).toEqual([]);
  });
});