import { describe, expect, it } from "vitest";
import { decomposeTask } from "@/lib/task-intelligence/decomposer";

describe("decomposeTask — 子任务拆解", () => {
  it("内容创作任务:至少产出创作子任务", () => {
    const subs = decomposeTask("写一篇小红书文案");
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.some((s) => s.category === "content_creation")).toBe(true);
  });

  it("文本摘要任务:产出摘要子任务", () => {
    const subs = decomposeTask("提炼资料要点");
    expect(subs.some((s) => s.category === "text_summary")).toBe(true);
  });

  it("附加意图:含「表格」→ 追加数据整理子任务", () => {
    const subs = decomposeTask("整理成表格");
    expect(subs.some((s) => s.label === "数据整理")).toBe(true);
  });

  it("附加意图:含「翻译」→ 追加翻译子任务", () => {
    const subs = decomposeTask("翻译成英文");
    expect(subs.some((s) => s.label === "翻译")).toBe(true);
  });

  it("附加意图:含「海报」→ 追加视觉素材子任务", () => {
    const subs = decomposeTask("做一张海报");
    expect(subs.some((s) => s.label === "视觉素材")).toBe(true);
  });

  it("子任务 id 唯一且带前缀", () => {
    const subs = decomposeTask("写一篇文章并整理成表格");
    const ids = subs.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("sub-"))).toBe(true);
  });

  it("未识别任务 → other 综合处理兜底", () => {
    const subs = decomposeTask("随便聊聊");
    expect(subs.length).toBe(1);
    expect(subs[0].category).toBe("other");
  });
});