/**
 * 演示种子数据（Phase 2）
 *
 * 说明：数据为「演示数据」，仅用于前端 Demo 展示闭环效果，
 * 不代表真实业务结果。时间基于运行时生成，保证「最近 30 天」
 * 视图在任意日期打开都有数据。
 */
import type {
  Agent,
  AgentCapability,
  AgentRun,
  CapabilityDefinition,
} from "@/lib/types";

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
    createdAt: new Date(now - 18 * DAY).toISOString(),
    lastRunAt: null,
  },
];

/* ---------- Capability 资产（Definition）与装配关系（AgentCapability） ---------- */

export const seedCapabilityDefinitions: CapabilityDefinition[] = [
  // Skills
  { id: "skill-web-search", type: "skill", name: "网页搜索", description: "实时检索网页与资讯", lifecycle: "active" },
  { id: "skill-doc-summary", type: "skill", name: "文档摘要", description: "长文档要点提炼", lifecycle: "active" },
  { id: "skill-data-viz", type: "skill", name: "数据可视化建议", description: "图表选型与口径建议", lifecycle: "active" },
  { id: "skill-copywriting", type: "skill", name: "文案生成", description: "营销文案与社媒短句", lifecycle: "active" },
  // Memory
  { id: "memory-long-term", type: "memory", name: "长期记忆", description: "跨会话记住关键事实", lifecycle: "active" },
  { id: "memory-semantic", type: "memory", name: "语义记忆", description: "按语义检索历史知识", lifecycle: "active" },
  { id: "memory-episodic", type: "memory", name: "情景记忆", description: "记录任务执行历史", lifecycle: "active" },
  // Rules
  { id: "rule-tone", type: "rule", name: "语气规范", description: "输出语气克制专业", lifecycle: "active" },
  { id: "rule-citation", type: "rule", name: "引用可追溯", description: "事实必须附来源", lifecycle: "active" },
  { id: "rule-privacy", type: "rule", name: "脱敏输出", description: "敏感字段自动脱敏", lifecycle: "active" },
  { id: "rule-escalation", type: "rule", name: "升级规则", description: "风险工单转人工", lifecycle: "active" },
  { id: "rule-severity", type: "rule", name: "严重级别标注", description: "异常必须标注级别", lifecycle: "active" },
  // Tools
  { id: "tool-slack", type: "tool", name: "Slack 通知", description: "向频道发送消息", lifecycle: "active" },
  { id: "tool-crm", type: "tool", name: "CRM 查询", description: "读取客户与工单", lifecycle: "active" },
  { id: "tool-log-query", type: "tool", name: "日志查询", description: "检索服务日志", lifecycle: "active" },
  { id: "tool-db-reader", type: "tool", name: "数据库只读查询", description: "对数据源执行只读查询", lifecycle: "active" },
  // 已归档示例（软删除演示：archived + used / archived + unused 两维组合）
  { id: "skill-rss-digest", type: "skill", name: "RSS 订阅汇总", description: "定期汇总订阅源更新（已由网页搜索替代）", lifecycle: "archived" },
  { id: "tool-legacy-http", type: "tool", name: "遗留 HTTP 回调", description: "旧版回调通道，已停止维护", lifecycle: "archived" },
];

/** 每个 Agent 的装配关系：Definition 可被多个 Agent 复用（enabled 标记装配启用状态） */
export const seedAgentCapabilities: AgentCapability[] = [
  // agent-support：3 skill / 2 memory / 4 rule / 2 tool
  { id: "ac-support-ws", agentId: "agent-support", capabilityId: "skill-web-search", enabled: true, createdAt: new Date(now - 80 * DAY).toISOString() },
  { id: "ac-support-ds", agentId: "agent-support", capabilityId: "skill-doc-summary", enabled: true, createdAt: new Date(now - 80 * DAY).toISOString() },
  { id: "ac-support-cw", agentId: "agent-support", capabilityId: "skill-copywriting", enabled: true, createdAt: new Date(now - 60 * DAY).toISOString() },
  { id: "ac-support-lt", agentId: "agent-support", capabilityId: "memory-long-term", enabled: true, createdAt: new Date(now - 80 * DAY).toISOString() },
  { id: "ac-support-ep", agentId: "agent-support", capabilityId: "memory-episodic", enabled: true, createdAt: new Date(now - 70 * DAY).toISOString() },
  { id: "ac-support-tone", agentId: "agent-support", capabilityId: "rule-tone", enabled: true, createdAt: new Date(now - 80 * DAY).toISOString() },
  { id: "ac-support-esc", agentId: "agent-support", capabilityId: "rule-escalation", enabled: true, createdAt: new Date(now - 80 * DAY).toISOString() },
  { id: "ac-support-priv", agentId: "agent-support", capabilityId: "rule-privacy", enabled: true, createdAt: new Date(now - 75 * DAY).toISOString() },
  { id: "ac-support-sev", agentId: "agent-support", capabilityId: "rule-severity", enabled: true, createdAt: new Date(now - 75 * DAY).toISOString() },
  { id: "ac-support-crm", agentId: "agent-support", capabilityId: "tool-crm", enabled: true, createdAt: new Date(now - 80 * DAY).toISOString() },
  { id: "ac-support-slack", agentId: "agent-support", capabilityId: "tool-slack", enabled: true, createdAt: new Date(now - 60 * DAY).toISOString() },
  // agent-research：4 skill / 1 memory / 2 rule / 3 tool
  { id: "ac-res-ws", agentId: "agent-research", capabilityId: "skill-web-search", enabled: true, createdAt: new Date(now - 58 * DAY).toISOString() },
  { id: "ac-res-ds", agentId: "agent-research", capabilityId: "skill-doc-summary", enabled: true, createdAt: new Date(now - 58 * DAY).toISOString() },
  { id: "ac-res-dv", agentId: "agent-research", capabilityId: "skill-data-viz", enabled: true, createdAt: new Date(now - 40 * DAY).toISOString() },
  { id: "ac-res-cw", agentId: "agent-research", capabilityId: "skill-copywriting", enabled: true, createdAt: new Date(now - 40 * DAY).toISOString() },
  { id: "ac-res-sem", agentId: "agent-research", capabilityId: "memory-semantic", enabled: true, createdAt: new Date(now - 58 * DAY).toISOString() },
  { id: "ac-res-cit", agentId: "agent-research", capabilityId: "rule-citation", enabled: true, createdAt: new Date(now - 58 * DAY).toISOString() },
  { id: "ac-res-tone", agentId: "agent-research", capabilityId: "rule-tone", enabled: true, createdAt: new Date(now - 58 * DAY).toISOString() },
  { id: "ac-res-dbr", agentId: "agent-research", capabilityId: "tool-db-reader", enabled: true, createdAt: new Date(now - 55 * DAY).toISOString() },
  { id: "ac-res-slack", agentId: "agent-research", capabilityId: "tool-slack", enabled: true, createdAt: new Date(now - 45 * DAY).toISOString() },
  { id: "ac-res-crm", agentId: "agent-research", capabilityId: "tool-crm", enabled: true, createdAt: new Date(now - 45 * DAY).toISOString() },
  // agent-writer：2 skill / 1 memory / 1 rule / 0 tool
  { id: "ac-writer-cw", agentId: "agent-writer", capabilityId: "skill-copywriting", enabled: true, createdAt: new Date(now - 38 * DAY).toISOString() },
  { id: "ac-writer-ds", agentId: "agent-writer", capabilityId: "skill-doc-summary", enabled: true, createdAt: new Date(now - 38 * DAY).toISOString() },
  { id: "ac-writer-lt", agentId: "agent-writer", capabilityId: "memory-long-term", enabled: true, createdAt: new Date(now - 38 * DAY).toISOString() },
  { id: "ac-writer-tone", agentId: "agent-writer", capabilityId: "rule-tone", enabled: true, createdAt: new Date(now - 38 * DAY).toISOString() },
  // agent-data：3 skill / 3 memory / 3 rule / 4 tool
  { id: "ac-data-ws", agentId: "agent-data", capabilityId: "skill-web-search", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-ds", agentId: "agent-data", capabilityId: "skill-doc-summary", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-dv", agentId: "agent-data", capabilityId: "skill-data-viz", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-lt", agentId: "agent-data", capabilityId: "memory-long-term", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-sem", agentId: "agent-data", capabilityId: "memory-semantic", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-ep", agentId: "agent-data", capabilityId: "memory-episodic", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-cit", agentId: "agent-data", capabilityId: "rule-citation", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-priv", agentId: "agent-data", capabilityId: "rule-privacy", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-sev", agentId: "agent-data", capabilityId: "rule-severity", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-dbr", agentId: "agent-data", capabilityId: "tool-db-reader", enabled: true, createdAt: new Date(now - 26 * DAY).toISOString() },
  { id: "ac-data-lq", agentId: "agent-data", capabilityId: "tool-log-query", enabled: false, createdAt: new Date(now - 20 * DAY).toISOString() },
  { id: "ac-data-slack", agentId: "agent-data", capabilityId: "tool-slack", enabled: true, createdAt: new Date(now - 20 * DAY).toISOString() },
  { id: "ac-data-crm", agentId: "agent-data", capabilityId: "tool-crm", enabled: true, createdAt: new Date(now - 20 * DAY).toISOString() },
  // agent-ops：2 skill / 0 memory / 5 rule / 3 tool
  { id: "ac-ops-ds", agentId: "agent-ops", capabilityId: "skill-doc-summary", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-dv", agentId: "agent-ops", capabilityId: "skill-data-viz", enabled: false, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-sev", agentId: "agent-ops", capabilityId: "rule-severity", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-esc", agentId: "agent-ops", capabilityId: "rule-escalation", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-tone", agentId: "agent-ops", capabilityId: "rule-tone", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-cit", agentId: "agent-ops", capabilityId: "rule-citation", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-priv", agentId: "agent-ops", capabilityId: "rule-privacy", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-lq", agentId: "agent-ops", capabilityId: "tool-log-query", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-slack", agentId: "agent-ops", capabilityId: "tool-slack", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  { id: "ac-ops-dbr", agentId: "agent-ops", capabilityId: "tool-db-reader", enabled: true, createdAt: new Date(now - 15 * DAY).toISOString() },
  // 归档示例装配：RSS 订阅汇总（archived）仍被 writer 保留装配（归档不自动解绑）
  { id: "ac-writer-rss", agentId: "agent-writer", capabilityId: "skill-rss-digest", enabled: true, createdAt: new Date(now - 36 * DAY).toISOString() },
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
