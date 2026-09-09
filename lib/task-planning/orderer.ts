/**
 * StepOrderer —— 类别先验偏序的稳定拓扑排序
 *
 * - 基于确定性类别模板（web_research 先于 data_analysis / content_creation 等）；
 * - 无先验关系的步骤保持原始顺序（并列），不强行推断先后；
 * - 模板偏序无环，防御性兜底保证总能输出。
 */
import type { CapabilityCategory } from "@/lib/types";
import type { NormalizedStep } from "./normalizer";

/** 类别先验：key 类别的产出是 value 类别的前置素材（确定性模板；"证据不足时无依赖优于错误依赖"） */
export const CATEGORY_AFTER: Partial<Record<CapabilityCategory, CapabilityCategory[]>> = {
  web_research: [],
  data_analysis: ["web_research"],
  text_summary: [],
  content_creation: ["web_research", "data_analysis", "text_summary"],
  code_gen: [],
  automation: [],
  dev_tool: [],
  other: [],
};

function categoryPrereqs(cat: CapabilityCategory): CapabilityCategory[] {
  return CATEGORY_AFTER[cat] ?? [];
}

/** 稳定拓扑排序：每轮取所有前置类别已放置的最前一项（保持并列项的原始顺序） */
export function orderSteps(steps: NormalizedStep[]): NormalizedStep[] {
  const remaining = [...steps];
  const ordered: NormalizedStep[] = [];
  const placed = new Set<CapabilityCategory>();
  while (remaining.length > 0) {
    let progressed = false;
    for (let i = 0; i < remaining.length; i += 1) {
      const prereqs = categoryPrereqs(remaining[i].requirement.category);
      if (prereqs.every((p) => placed.has(p))) {
        ordered.push(remaining[i]);
        placed.add(remaining[i].requirement.category);
        remaining.splice(i, 1);
        progressed = true;
        break;
      }
    }
    if (!progressed) {
      // 模板已保证无类别级环；此分支仅防御（保持原序）
      ordered.push(...remaining);
      break;
    }
  }
  return ordered;
}
