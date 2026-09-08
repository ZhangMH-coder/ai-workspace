/**
 * 演示种子数据（Phase 2）
 *
 * 说明：数据为「演示数据」，仅用于前端 Demo 展示闭环效果，
 * 不代表真实业务结果。时间基于运行时生成，保证「最近 30 天」
 * 视图在任意日期打开都有数据。
 */
import type { Agent, AgentRun } from "@/lib/types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();

export const seedAgents: Agent[] = [
  {
    id: "agent-support",
    name: "客户支持助手",
    description: "处理售前咨询、工单分诊与常见问题答复",
    model: "doubao-pro",
    status: "active",
    systemPrompt:
      "你是 Acme AI 的客户支持助手。回答需简洁、准确，涉及退款与故障时优先引导人工渠道。",
    capabilities: { skills: 3, memory: 2, rules: 4, tools: 2 },
    createdAt: new Date(now - 86 * DAY).toISOString(),
    lastRunAt: new Date(now - 2 * HOUR).toISOString(),
  },
  {
    id: "agent-research",
    name: "市场调研员",
    description: "抓取行业资讯并输出竞品与趋势简报",
    model: "claude-sonnet",
    status: "active",
    systemPrompt:
      "你是市场调研分析员。输出结构：摘要 → 关键发现 → 数据来源。引用必须可追溯。",
    capabilities: { skills: 4, memory: 1, rules: 2, tools: 3 },
    createdAt: new Date(now - 62 * DAY).toISOString(),
    lastRunAt: new Date(now - 5 * HOUR).toISOString(),
  },
  {
    id: "agent-writer",
    name: "内容撰稿助手",
    description: "生成公众号文章、产品文案与社媒短句",
    model: "doubao-lite",
    status: "idle",
    systemPrompt:
      "你是中文内容撰稿助手。默认输出可直接使用的成稿，语气专业克制，禁止堆砌形容词。",
    capabilities: { skills: 2, memory: 1, rules: 1, tools: 0 },
    createdAt: new Date(now - 41 * DAY).toISOString(),
    lastRunAt: new Date(now - 1 * DAY).toISOString(),
  },
  {
    id: "agent-data",
    name: "数据分析师",
    description: "对 CSV 与数据库导出做统计、归因与图表建议",
    model: "gpt-4o",
    status: "error",
    systemPrompt:
      "你是数据分析师。先说明口径与假设，再给结论；涉及敏感字段时脱敏输出。",
    capabilities: { skills: 3, memory: 3, rules: 3, tools: 4 },
    createdAt: new Date(now - 29 * DAY).toISOString(),
    lastRunAt: new Date(now - 3 * DAY).toISOString(),
  },
  {
    id: "agent-ops",
    name: "自动化运维员",
    description: "巡检日志、告警分类与发布检查清单生成",
    model: "doubao-pro",
    status: "paused",
    systemPrompt:
      "你是运维巡检助手。只输出可执行的检查项与结论，异常必须标注严重级别。",
    capabilities: { skills: 2, memory: 0, rules: 5, tools: 3 },
    createdAt: new Date(now - 18 * DAY).toISOString(),
    lastRunAt: null,
  },
];

/** 确定性伪随机（保证同一批次种子数据稳定可复算） */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const runSummaries: Record<string, string[]> = {
  "agent-support": [
    "分诊 12 条工单，其中 3 条升级至人工",
    "答复高频售前问题 26 次，满意度 92%",
    "识别 2 个退款风险工单并触发人工复核",
  ],
  "agent-research": [
    "输出竞品动态周报，覆盖 5 家厂商",
    "抓取 18 篇行业资讯，提炼 4 条关键趋势",
    "完成价格对比分析，发现 2 处数据口径差异",
  ],
  "agent-writer": [
    "生成产品发布文案 3 版供挑选",
    "输出公众号初稿 2,400 字，含标题 5 个备选",
    "改写社媒短句 8 条，适配 3 个平台语气",
  ],
  "agent-data": [
    "分析 Q2 销售导出，定位下滑主因（华东渠道）",
    "输出留存漏斗报告，含 6 个分群对比",
    "生成图表建议 4 项并附口径说明",
  ],
  "agent-ops": ["巡检 14 台节点，全部通过", "告警聚类 9 条，标记 1 条 P2 级别"],
};

function buildRuns(): AgentRun[] {
  const runs: AgentRun[] = [];
  const random = seededRandom(20260908);
  const statusPool: Array<{ s: AgentRun["status"]; w: number }> = [
    { s: "success", w: 86 },
    { s: "failed", w: 14 },
  ];
  const pick = (pool: Array<{ s: AgentRun["status"]; w: number }>) => {
    const r = random();
    let acc = 0;
    for (const item of pool) {
      acc += item.w / 100;
      if (r <= acc) return item.s;
    }
    return pool[pool.length - 1].s;
  };

  let runIndex = 0;
  for (const agent of seedAgents) {
    // 各 agent 在 30 天内产生不同频次的运行
    const frequency = [26, 18, 30, 12, 6][runIndex % seedAgents.length];
    const summaries = runSummaries[agent.id] ?? ["完成一次运行任务"];
    for (let i = 0; i < frequency; i++) {
      const daysAgo = Math.floor(random() * 30);
      const hourOffset = Math.floor(random() * 24);
      const startedAt = now - daysAgo * DAY - hourOffset * HOUR - Math.floor(random() * 50) * 60000;
      const durationMs = 8_000 + Math.floor(random() * 220_000);
      const status = pick(statusPool);
      const finishedAt = startedAt + durationMs;
      runs.push({
        id: `run-${agent.id}-${i}`,
        agentId: agent.id,
        status,
        durationMs,
        tokensUsed: 900 + Math.floor(random() * 38_000),
        messages: 3 + Math.floor(random() * 14),
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        summary: status === "success"
          ? summaries[i % summaries.length]
          : "运行中断：上游服务超时，已记录日志",
      });
    }
    runIndex += 1;
  }

  return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export const seedRuns: AgentRun[] = buildRuns();
