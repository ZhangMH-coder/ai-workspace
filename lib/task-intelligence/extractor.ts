/**
 * RequirementExtractor —— 子任务 → 能力需求（推断）
 *
 * 每条子任务转换为一条能力需求；需求本身即推断产物（isInferred=true 固定）。
 */
import type { CapabilityRequirement, SubTask } from "./types";

/** 子任务 → 能力需求：需求文本由子任务描述 + 类别组装（可读、可追溯来源） */
export function extractRequirements(subtasks: SubTask[]): CapabilityRequirement[] {
  return subtasks.map((st) => ({
    requirementText: st.description,
    category: st.category,
    keywords: st.keywords,
    weight: st.weight,
    derivedFrom: st.label,
    isInferred: true,
  }));
}
