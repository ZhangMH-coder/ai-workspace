/**
 * TaskParser —— 任务类型识别（推断）
 *
 * 确定性规则：任务文本信号 → 任务类型。不针对具体测试词硬编码：
 * 使用通用领域词典（写作/总结/研究/数据/代码/自动化…），命中取信号最多的类型。
 * LLM 未来接入时替换本组件的实现（task-llm-v1），接口不变。
 */
import type { TaskTypeId } from "./types";

interface TypeRule {
  id: TaskTypeId;
  /** 任务文本命中即计分的领域信号（通用词，非测试用例词） */
  signals: string[];
}

const RULES: TypeRule[] = [
  {
    id: "content_creation",
    signals: [
      "写", "文案", "文章", "小红书", "公众号", "标题", "海报", "宣传", "内容", "创作",
      "脚本", "口播", "视频", "图文", "种草", "发布", "推广",
    ],
  },
  {
    id: "text_summary",
    signals: [
      "总结", "摘要", "提炼", "汇总", "纪要", "概括", "浓缩", "简报", "梳理",
    ],
  },
  {
    id: "web_research",
    signals: [
      "搜索", "调研", "研究", "查", "了解", "竞品", "资料", "情报", "对比", "趋势",
      "行情", "分析报告", "资讯",
    ],
  },
  {
    id: "data_analysis",
    signals: [
      "数据", "分析", "统计", "报表", "周报", "月报", "趋势", "指标", "图表", "可视化",
      "明细", "汇总", "透视",
    ],
  },
  {
    id: "code_gen",
    signals: [
      "代码", "开发", "实现", "函数", "脚本", "接口", "写个程序", "编程", "bug", "报错",
      "组件", "前端", "后端",
    ],
  },
  {
    id: "automation",
    signals: [
      "自动化", "定时", "批量", "流程", "重复", "自动", "轮询", "监控", "任务编排",
    ],
  },
  {
    id: "dev_tool",
    signals: [
      "部署", "构建", "环境", "调试", "工具", "配置", "安装", "版本", "git", "docker",
      "打包", "迁移",
    ],
  },
];

/** 任务类型识别：返回得分最高的类型（可并列 other 兜底） */
export function parseTaskType(task: string): { type: TaskTypeId; signals: string[] } {
  const t = task.toLowerCase();
  let best: TypeRule | null = null;
  for (const rule of RULES) {
    const hits = rule.signals.filter((s) => t.includes(s));
    if (hits.length === 0) continue;
    if (!best || hits.length > best.signals.length) {
      best = { id: rule.id, signals: hits };
    }
  }
  return best
    ? { type: best.id, signals: best.signals }
    : { type: "other", signals: [] };
}
