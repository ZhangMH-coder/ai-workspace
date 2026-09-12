import { describe, expect, it } from "vitest";
import { computeInputFingerprint, computeMetaHash, computeTaskFingerprint } from "@/lib/analysis/fingerprint";

const BASE = {
  sourcePath: "C:/skills/foo/SKILL.md",
  lastModified: "2026-09-01T00:00:00Z",
  fileSize: 1024,
  metaHash: "abc",
};

describe("computeInputFingerprint", () => {
  it("相同输入对象产生相同指纹", () => {
    expect(computeInputFingerprint(BASE)).toBe(computeInputFingerprint({ ...BASE }));
  });

  it("sourcePath 不同 → 指纹不同", () => {
    expect(computeInputFingerprint(BASE)).not.toBe(
      computeInputFingerprint({ ...BASE, sourcePath: "C:/other/SKILL.md" })
    );
  });

  it("lastModified 不同 → 指纹不同(内容变更检测)", () => {
    expect(computeInputFingerprint(BASE)).not.toBe(
      computeInputFingerprint({ ...BASE, lastModified: "2026-09-02T00:00:00Z" })
    );
  });

  it("返回 40 位十六进制(sha1)", () => {
    expect(computeInputFingerprint(BASE)).toMatch(/^[0-9a-f]{40}$/);
  });

  it("可空字段(null)可计算", () => {
    expect(
      computeInputFingerprint({ sourcePath: "x", lastModified: null, fileSize: null, metaHash: null })
    ).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("computeMetaHash", () => {
  it("相同元数据对象产生相同哈希", () => {
    expect(computeMetaHash({ name: "技能", type: "skill" })).toBe(
      computeMetaHash({ name: "技能", type: "skill" })
    );
  });

  it("内容不同产生不同哈希", () => {
    expect(computeMetaHash({ name: "技能A" })).not.toBe(computeMetaHash({ name: "技能B" }));
  });

  it("空对象可计算", () => {
    expect(computeMetaHash({})).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("computeTaskFingerprint", () => {
  it("相同任务文本产生相同指纹", () => {
    expect(computeTaskFingerprint("整理文档")).toBe(computeTaskFingerprint("整理文档"));
  });

  it("大小写归一化后相同", () => {
    expect(computeTaskFingerprint("整理文档")).toBe(computeTaskFingerprint("整理文档"));
    expect(computeTaskFingerprint("HELLO")).toBe(computeTaskFingerprint("hello"));
  });

  it("折叠空白:连续空格折叠为单空格后指纹一致(trim 语义)", () => {
    expect(computeTaskFingerprint("整理  文档")).toBe(computeTaskFingerprint("整理 文档"));
  });

  it("不同任务产生不同指纹", () => {
    expect(computeTaskFingerprint("整理文档")).not.toBe(computeTaskFingerprint("分析数据"));
  });
});