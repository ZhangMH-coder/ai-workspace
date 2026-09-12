import { describe, expect, it } from "vitest";
import { parseTaskType } from "@/lib/task-intelligence/parser";

describe("parseTaskType — 任务类型识别", () => {
  it("内容创作:命中「写」信号", () => {
    const r = parseTaskType("帮我写一篇小红书文案");
    expect(r.type).toBe("content_creation");
    expect(r.signals.length).toBeGreaterThan(0);
  });

  it("文本摘要:命中「提炼」信号", () => {
    expect(parseTaskType("提炼这段话的要点").type).toBe("text_summary");
  });

  it("网络研究:命中「调研」信号", () => {
    expect(parseTaskType("调研一下竞品动态").type).toBe("web_research");
  });

  it("数据分析:命中「统计」信号", () => {
    expect(parseTaskType("统计本周销售明细").type).toBe("data_analysis");
  });

  it("代码生成:命中「bug」信号", () => {
    expect(parseTaskType("修复这个 bug").type).toBe("code_gen");
  });

  it("自动化:命中「定时」信号", () => {
    expect(parseTaskType("每天定时备份日志").type).toBe("automation");
  });

  it("开发工具:命中「部署」信号", () => {
    expect(parseTaskType("部署到生产环境").type).toBe("dev_tool");
  });

  it("无任何信号 → other 兜底", () => {
    const r = parseTaskType("你好吗");
    expect(r.type).toBe("other");
    expect(r.signals).toEqual([]);
  });

  it("平局时取首条匹配规则(确定性行为)", () => {
    // 「文章」命中 content_creation(首条)与「总结」命中 text_summary 均为 1 信号
    expect(parseTaskType("总结这篇文章").type).toBe("content_creation");
  });

  it("大小写不敏感(英文信号)", () => {
    expect(parseTaskType("Fix 了一个 git bug")).toBeTruthy();
  });
});