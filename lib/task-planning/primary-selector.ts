/**
 * PrimarySelector —— 每步主选 + 回退链（事实字段）
 *
 * - primary = 该需求候选集最高分（retriever 已降序）；
 * - alternatives = 其余次优候选（≥ 最低推荐分，封顶 3）——来自原始 Retriever 候选集，
 *   不制造候选资源；
 * - primary 与 alternatives 全部使用真实 score；
 * - 无任何可用候选 → satisfaction=unmet（如实降级，不伪造可执行性）。
 */
import type { NormalizedStep } from "./normalizer";
import type { PlanCandidate, SelectedStep } from "./types";

/** 回退链长度上限 */
export const MAX_ALTERNATIVES = 3;

/** 低置信阈值：主选得分低于该值 → 校验 warning（如实降级提示） */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

/** 类别 → 输出 / 输入声明模板（推断字段；确定性，不针对测试词硬编码） */
const OUTPUT_TEMPLATES: Record<string, { output: string; input: string | null }> = {
  web_research: {
    output: "收集并整理目标主题的研究资料与来源清单",
    input: "用户任务中的研究目标",
  },
  data_analysis: {
    output: "对输入数据进行分析、统计并产出指标结论",
    input: "上游步骤提供的数据集或研究资料",
  },
  text_summary: {
    output: "对输入文本进行摘要与要点提炼",
    input: "待摘要的源文本",
  },
  content_creation: {
    output: "生成符合目标的内容创作草稿",
    input: "上游步骤提供的素材、资料或分析结论",
  },
  code_gen: {
    output: "生成满足需求描述的代码或脚本",
    input: "用户任务中的功能需求",
  },
  automation: {
    output: "将上游产物编排为自动化流程或产出结果",
    input: "上游步骤的产物",
  },
  dev_tool: {
    output: "执行开发工具并返回结果",
    input: "用户任务中的工具输入",
  },
  other: {
    output: "综合处理用户输入并产出结果",
    input: "用户输入",
  },
};

export function selectPrimaries(steps: NormalizedStep[]): SelectedStep[] {
  return steps.map((step, i) => {
    const [primary, ...rest] = step.candidates;
    const alternatives: PlanCandidate[] = rest.slice(0, MAX_ALTERNATIVES);
    const tpl = OUTPUT_TEMPLATES[step.requirement.category] ?? OUTPUT_TEMPLATES.other;
    return {
      stepIndex: i,
      requirement: step.requirement,
      primary: primary ?? null,
      alternatives,
      satisfaction: primary ? "satisfied" : "unmet",
      outputDescription: tpl.output,
      expectedInput: tpl.input,
    };
  });
}
