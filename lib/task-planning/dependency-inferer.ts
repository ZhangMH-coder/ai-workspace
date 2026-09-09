/**
 * DependencyInferer —— 保守依赖推导（只建证据充分的边）
 *
 * 规则（确定性）：
 * 1. 类别先验：to 类别的模板前置类别已在排序中先出现 → data_flow 边（素材流）；
 * 2. 文本信号：to 需求关键词命中 from 类别输出声明词 → data_flow 边；
 * 3. 边仅当 from < to（构造性 DAG 保证）；反向信号（from 在 to 之后）一律丢弃——
 *    "无可靠依据建立依赖时，不得强行推断，允许步骤保持并列关系"。
 */
import type { NormalizedStep } from "./normalizer";
import type { PlanDependencyDraft } from "./types";

/** 类别 → 输出声明关键词（推断 outputDescription 与依赖信号的确定性依据） */
export const CATEGORY_OUTPUT_HINTS: Record<string, string[]> = {
  web_research: ["资料", "研究", "信息", "网页", "素材", "来源"],
  data_analysis: ["数据", "分析", "统计", "指标", "表格"],
  text_summary: ["摘要", "总结", "提炼"],
  content_creation: ["内容", "文案", "文章", "草稿"],
  code_gen: ["代码", "脚本"],
  automation: ["流程", "自动化", "脚本"],
  dev_tool: ["工具", "命令", "结果"],
  other: ["结果", "处理"],
};

import { CATEGORY_AFTER } from "./orderer";

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    web_research: "网络研究",
    data_analysis: "数据分析",
    text_summary: "文本摘要",
    content_creation: "内容创作",
    code_gen: "代码生成",
    automation: "自动化",
    dev_tool: "开发工具",
    other: "其他",
  };
  return map[cat] ?? cat;
}

export function inferDependencies(steps: NormalizedStep[]): PlanDependencyDraft[] {
  const edges: PlanDependencyDraft[] = [];
  const hints = CATEGORY_OUTPUT_HINTS;

  for (let to = 0; to < steps.length; to += 1) {
    for (let from = 0; from < to; from += 1) {
      const fromCat = steps[from].requirement.category;
      const toCat = steps[to].requirement.category;

      // 1) 类别先验（to 的前置包含 from 的类别）
      const prereqs = CATEGORY_AFTER[toCat] ?? [];
      if (prereqs.includes(fromCat)) {
        edges.push({
          fromStepIndex: from,
          toStepIndex: to,
          type: "data_flow",
          reason: `步骤 ${from + 1}（${categoryLabel(fromCat)}）的产出是步骤 ${to + 1}（${categoryLabel(
            toCat
          )}）的前置素材（类别先验）`,
        });
        continue;
      }

      // 2) 文本信号：to 需求关键词命中 from 输出声明词
      const fromHints = hints[fromCat] ?? [];
      const toKws = steps[to].requirement.keywords ?? [];
      const matched = fromHints.filter(
        (w) => toKws.some((k) => k.includes(w) || w.includes(k))
      );
      if (matched.length > 0) {
        edges.push({
          fromStepIndex: from,
          toStepIndex: to,
          type: "data_flow",
          reason: `步骤 ${from + 1}（${categoryLabel(fromCat)}）输出声明词「${matched.join(
            "、"
          )}」被步骤 ${to + 1} 需求命中（文本信号）`,
        });
      }
    }
  }
  return edges;
}
