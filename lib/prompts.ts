/**
 * 预设问题生成（统一 util，S1.50）
 *
 * 两处 UI 共用一套确定性生成规则，避免模板漂移：
 * - 资源详情「使用建议 · 预设问题」：按资源类型生成 3 条通用预设问题
 *   （suggested-prompts.tsx）
 * - 任务智能「技能使用建议」：基于真实 description 转成一条可提问指令
 *   （skill-suggestions.tsx）
 *
 * 纯启发式模板：不调用 LLM，不伪造内容；模板固定、仅注入真实字段。
 */
import type { DiscoveredResource, ResourceType } from "@/lib/types";

type PromptBuilder = (name: string, desc: string) => string[];

const TYPE_PROMPT_BUILDERS: Record<ResourceType, PromptBuilder> = {
  skill: (n, d) => [
    `请使用「${n}」技能的标准流程，帮我完成一个典型任务，并直接给出可用的最终产出。`,
    `调用「${n}」技能处理我的实际需求${d ? `，围绕「${d}」这类场景` : ""}，并说明它适用于哪些情况。`,
    `以「${n}」技能专家的身份，给我演示一个完整可执行的应用示例。`,
  ],
  agent: (n, d) => [
    `启动「${n}」智能体，帮我处理一个具体任务并给出结果。`,
    `让「${n}」智能体负责这个需求${d ? `（${d}）` : ""}，把分工和产出说清楚。`,
    `用「${n}」智能体演示一次完整的处理流程，说明它的能力边界。`,
  ],
  command: (n, d) => [
    `执行「${n}」命令，帮我完成对应操作并解释输出。`,
    `告诉我「${n}」命令在什么场景下使用、有什么前置条件${d ? `（${d}）` : ""}。`,
    `用「${n}」命令处理我给出的输入，给出结果和说明。`,
  ],
  rule: (n, d) => [
    `请在后续回答中遵守「${n}」规则${d ? `（${d}）` : ""}。`,
    `把「${n}」作为我的行为准则，按它约束你的输出风格和边界。`,
    `用「${n}」规则审视下面的需求，告诉我哪些部分会受它影响。`,
  ],
  prompt: (n, d) => [
    `把「${n}」作为提示词模板，套用到一个实际场景并输出结果。`,
    `用「${n}」提示词引导你完成一次任务，展示它的效果${d ? `（${d}）` : ""}。`,
    `解释「${n}」适合解决什么问题，并给我一个改造示例。`,
  ],
  mcp: (n, d) => [
    `通过「${n}」MCP 工具，帮我完成对应操作${d ? `（${d}）` : ""}。`,
    `调用「${n}」MCP，把结果整理成可用的输出。`,
    `告诉我「${n}」MCP 能做什么、怎么接入。`,
  ],
  plugin: (n, d) => [
    `使用「${n}」插件，帮我处理对应的任务${d ? `（${d}）` : ""}。`,
    `加载「${n}」插件能力，应用到我的需求上并给出结果。`,
    `用「${n}」插件给我演示一次完整使用。`,
  ],
  other: (n, d) => [
    `使用本机已发现的「${n}」资源${d ? `（${d}）` : ""}，帮我完成对应任务。`,
    `解释「${n}」是做什么的，并给我一个实际使用示例。`,
    `把「${n}」应用到我的场景中，给出具体做法。`,
  ],
};

/** 描述清洗：压缩空白、截断到 40 字，避免预设问题过长 */
export function cleanPromptDesc(desc: string | null | undefined): string {
  if (!desc) return "";
  const s = desc.replace(/\s+/g, " ").trim();
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

/** 按资源类型生成 3 条通用预设问题（资源详情「使用建议」用） */
export function presetPromptsForResource(resource: DiscoveredResource): string[] {
  const builder = TYPE_PROMPT_BUILDERS[resource.type] ?? TYPE_PROMPT_BUILDERS.other;
  return builder(resource.name, cleanPromptDesc(resource.description));
}

/** 基于真实 description 生成一条可提问指令（任务智能「技能使用建议」用）；
 *  英文/说明型描述回退为技能名模板；短 usage（如触发指令）兜底 */
export function presetQuestionFromDescription(resource: DiscoveredResource): string {
  const d = resource.description?.trim();
  let purpose = "";
  if (d) {
    let first = d.split(/[。\n\r]/)[0].replace(/^[：:，,、\s]+/, "").trim();
    first = first
      .replace(/^(本技能|本 Skill|本skill|本工具|该工具|此技能|本文档|本文|本指南|本文是|本文件|这个|该|用于|负责|面向|帮助|可以|能够|支持|将|This guide|This skill|This is)/i, "")
      .replace(/^[的、，,：:\s]+/, "")
      .trim();
    const latin = (first.match(/[a-zA-Z]/g) || []).length;
    if (first.length > 0 && latin / Math.max(first.length, 1) < 0.4) {
      purpose = first.length > 42 ? first.slice(0, 42) + "…" : first;
    }
  }
  if (purpose) return `帮我用「${resource.name}」技能：${purpose}`;
  const usage = resource.metadata?.usage;
  const usageStr = typeof usage === "string" ? usage.trim() : "";
  if (usageStr && usageStr.length <= 60) return usageStr;
  return `帮我使用「${resource.name}」技能完成相关任务`;
}
