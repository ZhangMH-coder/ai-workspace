/**
 * TaskDecomposer —— 子任务拆解（推断）
 *
 * 双层规则：
 * 1. 类型模板：每个任务类型给出默认子任务骨架；
 * 2. 附加意图检测：任务文本中出现跨类别信号时追加对应子任务
 *    （如「写文案并整理成表格」→ 内容创作 + 数据整理）。
 * 所有产物均属推断（isInferred 在落库时标记）。
 */
import { parseTaskType } from "./parser";
import type { SubTask, TaskTypeId } from "./types";

interface Template {
  subtasks: Omit<SubTask, "id">[];
}

const TEMPLATES: Record<TaskTypeId, Template> = {
  content_creation: {
    subtasks: [
      {
        label: "内容创作",
        description: "撰写/生成目标平台的内容正文与结构",
        category: "content_creation",
        keywords: ["写", "文案", "文章", "内容", "标题", "正文"],
        weight: 1,
      },
      {
        label: "内容优化与发布",
        description: "按平台风格润色、配图或排版",
        category: "content_creation",
        keywords: ["润色", "排版", "配图", "发布", "标题"],
        weight: 0.6,
      },
    ],
  },
  text_summary: {
    subtasks: [
      {
        label: "文本摘要",
        description: "对输入内容提炼要点与结论",
        category: "text_summary",
        keywords: ["总结", "摘要", "提炼", "要点", "纪要"],
        weight: 1,
      },
    ],
  },
  web_research: {
    subtasks: [
      {
        label: "信息检索",
        description: "检索并收集相关主题资料",
        category: "web_research",
        keywords: ["搜索", "调研", "资料", "信息", "收集"],
        weight: 1,
      },
      {
        label: "资料整理",
        description: "汇总、对比并结构化研究结果",
        category: "text_summary",
        keywords: ["整理", "汇总", "对比", "报告"],
        weight: 0.7,
      },
    ],
  },
  data_analysis: {
    subtasks: [
      {
        label: "数据处理",
        description: "读取、清洗或准备数据",
        category: "data_analysis",
        keywords: ["数据", "表格", "明细", "清洗", "处理"],
        weight: 1,
      },
      {
        label: "统计与可视化",
        description: "计算指标、生成图表或报告",
        category: "data_analysis",
        keywords: ["统计", "图表", "可视化", "报表", "趋势"],
        weight: 0.9,
      },
    ],
  },
  code_gen: {
    subtasks: [
      {
        label: "代码实现",
        description: "编写或生成目标代码",
        category: "code_gen",
        keywords: ["代码", "实现", "函数", "开发", "脚本"],
        weight: 1,
      },
      {
        label: "调试与检查",
        description: "定位问题或验证实现",
        category: "dev_tool",
        keywords: ["调试", "检查", "报错", "测试", "验证"],
        weight: 0.6,
      },
    ],
  },
  automation: {
    subtasks: [
      {
        label: "流程自动化",
        description: "将重复操作编排为自动执行流程",
        category: "automation",
        keywords: ["自动化", "定时", "批量", "流程", "自动"],
        weight: 1,
      },
    ],
  },
  dev_tool: {
    subtasks: [
      {
        label: "环境与构建",
        description: "配置环境、构建或部署",
        category: "dev_tool",
        keywords: ["部署", "构建", "环境", "配置", "安装"],
        weight: 1,
      },
    ],
  },
  other: {
    subtasks: [
      {
        label: "综合处理",
        description: "对任务进行通用处理",
        category: "other",
        // other 类型：未识别任务，不注入泛化正向词（避免 2-gram 宽匹配噪声）；
        // 仅依赖真实用户任务的反向信号（kwHits）产生候选
        keywords: [],
        weight: 1,
      },
    ],
  },
};

/** 附加意图：跨类别信号 → 追加子任务（检测到才加，不硬编码测试词） */
const EXTRA_INTENTS: { match: string[]; subtask: Omit<SubTask, "id"> }[] = [
  {
    match: ["表格", "数据", "整理成"],
    subtask: {
      label: "数据整理",
      description: "将结果整理为结构化表格",
      category: "data_analysis",
      keywords: ["表格", "数据", "整理", "结构化"],
      weight: 0.8,
    },
  },
  {
    match: ["配图", "图片", "海报", "视觉"],
    subtask: {
      label: "视觉素材",
      description: "生成或筛选配图素材",
      category: "content_creation",
      keywords: ["配图", "图片", "海报", "视觉", "设计"],
      weight: 0.7,
    },
  },
  {
    match: ["翻译", "英文", "中英"],
    subtask: {
      label: "翻译",
      description: "跨语言翻译或改写",
      category: "text_summary",
      keywords: ["翻译", "英文", "中英", "改写"],
      weight: 0.7,
    },
  },
];

/** 子任务拆解：类型模板 + 附加意图 */
export function decomposeTask(task: string): SubTask[] {
  const { type } = parseTaskType(task);
  const base = TEMPLATES[type].subtasks.map((st, i) => ({ ...st, id: `sub-${type}-${i}` }));
  const extras: SubTask[] = [];
  EXTRA_INTENTS.forEach((intent, i) => {
    if (intent.match.some((m) => task.toLowerCase().includes(m))) {
      extras.push({ ...intent.subtask, id: `sub-extra-${i}` });
    }
  });
  return [...base, ...extras];
}
