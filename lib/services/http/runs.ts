/**
 * Runs Service — HTTP 实现（P4-3）
 *
 * 统计端点化：Dashboard / Project / Agent 统计统一走
 * GET /api/v1/runs/stats?from&to（服务端 SQLite 直接聚合）；
 * 明细场景（最近活动 / 运行历史）走分页小量拉取，不再 pageSize=1000 全量。
 */
import { http } from "@/lib/api/client";
import type { PageDTO, AgentRunDTO, RunsStatsDTO } from "@/lib/api/dto";
import { toAgentRun, toRunsStats } from "@/lib/api/mappers";
import type { AgentRun, RunsStats } from "@/lib/types";

export interface RunsStatsQuery {
  from: string;
  to: string;
  projectId?: string;
  agentId?: string;
}

/** 最近 N 条运行明细（全局，按开始时间倒序） */
export async function fetchRecentRuns(pageSize = 10): Promise<AgentRun[]> {
  const page = await http.get<PageDTO<AgentRunDTO>>(
    `/runs?pageSize=${pageSize}&sort=startedAt:desc`
  );
  return page.items.map(toAgentRun);
}

/** 指定 Agent 集合的最近运行明细 */
export async function fetchProjectRuns(
  agentIds: string[],
  pageSize = 8
): Promise<AgentRun[]> {
  const page = await http.get<PageDTO<AgentRunDTO>>(
    `/runs?agents=${agentIds.map(encodeURIComponent).join(",")}&pageSize=${pageSize}&sort=startedAt:desc`
  );
  return page.items.map(toAgentRun);
}

/** 运行统计聚合（显式 from/to；projectId/agentId 过滤） */
export async function fetchRunsStats(q: RunsStatsQuery): Promise<RunsStats> {
  const params = new URLSearchParams({ from: q.from, to: q.to });
  if (q.projectId !== undefined) params.set("project", q.projectId);
  if (q.agentId !== undefined) params.set("agent", q.agentId);
  const dto = await http.get<RunsStatsDTO>(`/runs/stats?${params.toString()}`);
  return toRunsStats(dto);
}
