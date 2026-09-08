"use client";

/**
 * 工作区全局状态（Zustand，Phase 2）
 *
 * 单一数据源：agents + runs 内存态（刷新重置）。
 * 首次进入工作区时通过 hydrate() 从 Mock 服务层异步加载；
 * 未来接入真实 API 时仅替换 lib/services 实现。
 */
import { create } from "zustand";

import {
  createAgent as createAgentService,
  fetchAgents as fetchAgentsService,
  fetchRuns as fetchRunsService,
  runAgent as runAgentService,
} from "@/lib/services/agents";
import type { Agent, AgentRun, NewAgentInput, TimeRange } from "@/lib/types";

interface WorkspaceState {
  /** 数据加载状态 */
  hydrated: boolean;
  agents: Agent[];
  runs: AgentRun[];
  timeRange: TimeRange;

  /** 首次加载（幂等） */
  hydrate: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  /** 新建并返回新 agent（调用方用于跳转） */
  createAgent: (input: NewAgentInput) => Promise<Agent>;
  /** 触发运行并返回新 run（调用方用于提示） */
  runAgent: (agentId: string) => Promise<AgentRun>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  hydrated: false,
  agents: [],
  runs: [],
  timeRange: "30d",

  hydrate: async () => {
    if (get().hydrated) return;
    const [agents, runs] = await Promise.all([fetchAgentsService(), fetchRunsService()]);
    set({ agents, runs, hydrated: true });
  },

  setTimeRange: (range) => set({ timeRange: range }),

  createAgent: async (input) => {
    const agent = await createAgentService(input);
    set((state) => ({ agents: [agent, ...state.agents] }));
    return agent;
  },

  runAgent: async (agentId) => {
    const agent = get().agents.find((a) => a.id === agentId);
    const run = await runAgentService(agentId, agent?.name ?? "Agent");
    set((state) => ({
      runs: [run, ...state.runs],
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, lastRunAt: run.finishedAt } : a
      ),
    }));
    return run;
  },
}));

/* ---------- 派生统计（Selectors，均实时计算，不落库） ---------- */

/** 按时间范围过滤运行记录 */
export function selectRunsInRange(runs: AgentRun[], range: TimeRange): AgentRun[] {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 86_400_000;
  return runs.filter((r) => new Date(r.startedAt).getTime() >= cutoff);
}

/** 按时间范围聚合运行记录为每日统计（用于趋势图） */
export interface DailyStat {
  date: string; // YYYY-MM-DD
  label: string; // MM-DD
  runs: number;
  successRate: number; // 0-1
}

export function selectDailyStats(runs: AgentRun[], range: TimeRange): DailyStat[] {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const stats: DailyStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = dayStart.getTime() + 86_400_000;
    const dayRuns = runs.filter((r) => {
      const t = new Date(r.startedAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd;
    });
    const succeeded = dayRuns.filter((r) => r.status === "success").length;
    stats.push({
      date: dayStart.toISOString().slice(0, 10),
      label: `${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(
        dayStart.getDate()
      ).padStart(2, "0")}`,
      runs: dayRuns.length,
      successRate: dayRuns.length > 0 ? succeeded / dayRuns.length : 0,
    });
  }
  return stats;
}

/** 单个 Agent 的聚合统计 */
export function selectAgentStats(runs: AgentRun[], agentId: string) {
  const own = runs.filter((r) => r.agentId === agentId);
  const totalRuns = own.length;
  const succeeded = own.filter((r) => r.status === "success").length;
  const totalTokens = own.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalDuration = own.reduce((sum, r) => sum + r.durationMs, 0);
  return {
    totalRuns,
    successRate: totalRuns > 0 ? succeeded / totalRuns : 0,
    totalTokens,
    avgDurationMs: totalRuns > 0 ? totalDuration / totalRuns : 0,
  };
}
