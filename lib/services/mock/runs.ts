/**
 * Runs Service — Mock 实现（P4-3）
 *
 * 与 HTTP 实现同名函数契约；统计从 Mock 内存数据直接聚合
 * （与 Real 的 SQLite 聚合同构：from/to → 过滤 → totals + daily），
 * 不再把全量 runs 交回前端内存统计。
 */
import { mockState } from "./state";
import type { AgentRun, RunsStats } from "@/lib/types";

const LATENCY_MS = 220;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inRange(v: string, from: string, to: string): boolean {
  return v >= from && v < to;
}

export interface RunsStatsQuery {
  from: string;
  to: string;
  projectId?: string;
  agentId?: string;
}

/** 最近 N 条运行明细（全局，按开始时间倒序） */
export async function fetchRecentRuns(pageSize = 10): Promise<AgentRun[]> {
  await delay(LATENCY_MS);
  return mockState.runs
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, pageSize)
    .map((r) => ({ ...r }));
}

/** 指定 Agent 集合的最近运行明细 */
export async function fetchProjectRuns(
  agentIds: string[],
  pageSize = 8
): Promise<AgentRun[]> {
  await delay(LATENCY_MS);
  const ids = new Set(agentIds);
  return mockState.runs
    .filter((r) => ids.has(r.agentId))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, pageSize)
    .map((r) => ({ ...r }));
}

/** 运行统计聚合（显式 from/to；projectId/agentId 过滤） */
export async function fetchRunsStats(q: RunsStatsQuery): Promise<RunsStats> {
  await delay(LATENCY_MS);

  const agentIds =
    q.projectId !== undefined
      ? new Set(
          mockState.projectAgents
            .filter((pa) => pa.projectId === q.projectId)
            .map((pa) => pa.agentId)
        )
      : null;

  const rows = mockState.runs.filter((r) => {
    if (!inRange(r.startedAt, q.from, q.to)) return false;
    if (q.agentId !== undefined && r.agentId !== q.agentId) return false;
    if (agentIds !== null && !agentIds.has(r.agentId)) return false;
    return true;
  });

  const succeeded = rows.filter((r) => r.status === "succeeded").length;
  const failed = rows.length - succeeded;
  const tokens = rows.reduce((sum, r) => sum + r.tokensUsed, 0);
  const avgDurationMs =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.durationMs, 0) / rows.length)
      : 0;

  const byDate = new Map<string, { runs: number; succeeded: number; failed: number }>();
  for (const r of rows) {
    const key = r.startedAt.slice(0, 10);
    const cur = byDate.get(key) ?? { runs: 0, succeeded: 0, failed: 0 };
    cur.runs += 1;
    if (r.status === "succeeded") cur.succeeded += 1;
    else cur.failed += 1;
    byDate.set(key, cur);
  }

  const daily = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, d]) => {
      const [, month, dayOfMonth] = date.split("-");
      return {
        date,
        label: `${month}-${dayOfMonth}`,
        runs: d.runs,
        succeeded: d.succeeded,
        failed: d.failed,
        successRate: d.runs > 0 ? Math.round((d.succeeded / d.runs) * 1000) / 10 / 100 : 0,
      };
    });

  const latest = rows
    .map((r) => r.startedAt)
    .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return {
    window: { from: q.from, to: q.to },
    totals: {
      runs: rows.length,
      succeeded,
      failed,
      successRate: rows.length > 0 ? Math.round((succeeded / rows.length) * 1000) / 10 / 100 : 0,
      tokens,
      avgDurationMs,
      lastRunAt: latest,
    },
    daily,
  };
}

