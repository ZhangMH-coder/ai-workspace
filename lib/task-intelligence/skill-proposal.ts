/**
 * SkillProposalGenerator —— 无匹配技能时的「技能创建建议」生成（确定性模板版）
 *
 * 当本地检索不到相关技能（no-match）时，基于任务类型与需求文本，
 * 按豆包 skill-creator 的结构生成「建议设计一个什么样的技能」：
 * 建议规格（名称/描述/触发场景/核心流程/自由度）+ 创建提示词 + SKILL.md 草案。
 * 纯模板生成，不接 LLM；只产出建议文案，不创建任何文件。
 */
import type { CapabilityRequirement, TaskTypeId } from "./types";

export interface SkillProposal {
  /** kebab-case 建议名（可改） */
  suggestedName: string;
  /** 一句话描述（frontmatter description 风格） */
  description: string;
  triggerScenes: string[];
  coreWorkflow: string[];
  /** 自由度：high=文本指引 / medium=带参数脚本 / low=固定脚本 */
  freedom: "high" | "medium" | "low";
  /** 交给 skill-creator 的完整创建提示词 */
  creationPrompt: string;
  /** 「直接生成」按钮展开的 SKILL.md 草案 */
  skillMdDraft: string;
  /** S1.58：建议角度（standard / workflow / expert） */
  angle?: string;
  variant?: "standard" | "workflow" | "expert";
}

interface TypeProfile {
  base: string;
  label: string;
  scenes: string[];
  workflow: string[];
  freedom: SkillProposal["freedom"];
}

const PROFILES: Record<TaskTypeId, TypeProfile> = {
  content_creation: {
    base: "content-creation",
    label: "内容创作",
    scenes: ["撰写/生成平台内容", "文案、标题与正文产出", "内容风格润色与发布"],
    workflow: [
      "解析任务主题与目标平台",
      "按平台风格生成标题、正文与结构",
      "提供可编辑的最终交付（文本/文档）",
      "可选：配图、标签与发布建议",
    ],
    freedom: "high",
  },
  text_summary: {
    base: "summary",
    label: "文本摘要",
    scenes: ["总结文档/纪要/长文", "提炼要点与结论", "生成简报"],
    workflow: [
      "读取输入全文",
      "识别核心论点与关键数据",
      "按长度/格式要求输出摘要与要点",
    ],
    freedom: "high",
  },
  web_research: {
    base: "research",
    label: "信息调研",
    scenes: ["检索主题资料", "对比多个来源", "产出结构化调研结果"],
    workflow: [
      "明确检索主题与范围",
      "多源检索并核验信息",
      "汇总、对比并标注来源",
      "输出结构化调研报告",
    ],
    freedom: "medium",
  },
  data_analysis: {
    base: "data-analysis",
    label: "数据分析",
    scenes: ["读取表格/数据文件", "计算指标与统计", "生成图表或报告"],
    workflow: [
      "读取并核验数据口径",
      "清洗与预处理",
      "计算指标、生成图表",
      "输出结论与报告",
    ],
    freedom: "medium",
  },
  code_gen: {
    base: "code-gen",
    label: "代码生成",
    scenes: ["编写函数/脚本", "实现接口与组件", "生成可运行代码"],
    workflow: [
      "明确输入输出与约束",
      "编写实现代码",
      "提供运行/测试说明",
    ],
    freedom: "low",
  },
  automation: {
    base: "automation",
    label: "流程自动化",
    scenes: ["定时/批量任务", "重复操作编排", "监控与告警"],
    workflow: [
      "定义触发条件与步骤",
      "编排执行流程",
      "处理失败与重试",
      "输出执行记录",
    ],
    freedom: "low",
  },
  dev_tool: {
    base: "dev-tool",
    label: "开发工具",
    scenes: ["环境配置/构建/部署", "调试与排错", "工程化辅助"],
    workflow: [
      "识别目标环境与需求",
      "执行配置/构建/部署步骤",
      "校验结果并输出说明",
    ],
    freedom: "medium",
  },
  other: {
    base: "task-assistant",
    label: "通用任务",
    scenes: ["未被现成技能覆盖的通用任务"],
    workflow: ["解析用户任务意图", "拆解执行步骤", "产出最终结果并说明"],
    freedom: "medium",
  },
};

function trimTask(task: string, max = 26): string {
  const t = task.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export type ProposalVariant = "standard" | "workflow" | "expert";

interface VariantSpec {
  suffix: string;
  angle: string;
  scenes: string[];
  workflow: string[];
  freedom: SkillProposal["freedom"];
}

/** 三个建议角度：直接解决 / 工作流化复用 / 专家约束 */
function variantSpecs(profile: TypeProfile): Record<ProposalVariant, VariantSpec> {
  return {
    standard: {
      suffix: "-assistant",
      angle: "直接解决该类任务",
      scenes: profile.scenes,
      workflow: profile.workflow,
      freedom: profile.freedom,
    },
    workflow: {
      suffix: "-workflow",
      angle: "沉淀为可复用的工作流",
      scenes: [
        ...profile.scenes.slice(0, 2),
        "同类任务反复出现时按固定流程执行",
      ],
      workflow: [
        "解析输入并确认目标与约束",
        ...profile.workflow.slice(0, 2),
        "设置阶段检查点：每步产出可核验",
        "失败/异常时给出原因与重试/降级建议",
      ],
      freedom: "medium",
    },
    expert: {
      suffix: "-expert",
      angle: "专家角色 + 规则约束 + 质量门",
      scenes: [
        "需要专业判断与一致输出的场景",
        "对输出格式/质量有硬性要求的场景",
      ],
      workflow: [
        "以专家身份理解任务背景与边界",
        "先给结论/方案，再给依据与步骤",
        "按质量门自检：完整性/正确性/可追溯",
        "明确输出格式，不输出与任务无关内容",
      ],
      freedom: "low",
    },
  };
}

/** 生成技能创建建议（确定性模板版，单建议 = 多变体中的 standard） */
export function generateSkillProposal(
  task: string,
  type: TaskTypeId,
  requirements: CapabilityRequirement[]
): SkillProposal {
  return generateSkillProposals(task, type, requirements)[0];
}

/**
 * 生成一组技能创建建议（S1.58）：3 个角度，供用户选择复制到任意
 * Harness（Hermes / 豆包 / Cursor 等）创建技能。纯模板生成，不接 LLM。
 */
export function generateSkillProposals(
  task: string,
  type: TaskTypeId,
  requirements: CapabilityRequirement[]
): SkillProposal[] {
  const profile = PROFILES[type] ?? PROFILES.other;
  const taskBrief = trimTask(task);
  const reqBrief = requirements
    .map((r) => r.derivedFrom)
    .filter(Boolean)
    .slice(0, 3)
    .join("、");

  const variants = variantSpecs(profile);
  const order: ProposalVariant[] = ["standard", "workflow", "expert"];

  return order.map((variant) => {
    const spec = variants[variant];
    const name = `${profile.base}${spec.suffix}`;
    const description = `面向「${taskBrief}」的${profile.label}技能（${spec.angle}）：${reqBrief}，按标准流程产出可直接使用的结果。`;

    const creationPrompt = [
      `请为我创建一个名为「${name}」的 Skill（输出到 workspace/.user_skills/${name}/）：`,
      ``,
      `- 角度：${spec.angle}`,
      `- 用途：${description}`,
      `- 触发场景：${spec.scenes.join("；")}`,
      `- 核心工作流：`,
      ...spec.workflow.map((w) => `  ${w}`),
      `- 自由度建议：${spec.freedom}（${spec.freedom === "high" ? "文本指引即可" : spec.freedom === "medium" ? "带参数的脚本/步骤" : "固定脚本、少参数"}）`,
      `- 要求：SKILL.md 包含 YAML frontmatter（name/description），描述简洁（context 是公共资源），避免冗长解释。`,
    ].join("\n");

    const skillMdDraft = [
      `---`,
      `name: ${name}`,
      `description: ${description}`,
      `---`,
      ``,
      `# ${name}`,
      ``,
      `## 触发场景`,
      ...spec.scenes.map((s) => `- ${s}`),
      ``,
      `## 执行流程`,
      ...spec.workflow.map((w, i) => `${i + 1}. ${w}`),
      ``,
      `## 输出要求`,
      `- 直接给出可用的最终产出（文本/文档/代码/数据）。`,
      `- 若依赖外部工具或文件，明确说明步骤与位置。`,
      `- 不得输出与任务无关的内容。`,
      ``,
      `> 由 AI Workspace Task Intelligence 生成的建议草案，可自行调整后创建。`,
    ].join("\n");

    return {
      suggestedName: name,
      description,
      triggerScenes: spec.scenes,
      coreWorkflow: spec.workflow,
      freedom: spec.freedom,
      creationPrompt,
      skillMdDraft,
      angle: spec.angle,
      variant,
    };
  });
}
