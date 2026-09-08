"use client";

/**
 * 工作区全局状态（Zustand + persist，Phase 3）
 *
 * 单一数据源：agents + runs + timeRange。
 * - 持久化：agents / runs / timeRange 写入 localStorage（key: ai-workspace-store），
 *   刷新后数据保留；actions 与 hydrated 标志不持久化。
 * - 演示数据可恢复：无持久化数据时 hydrate() 自动从 Mock 服务层拉取 seed；
 *   resetDemoData() 显式重置回 seed（并写回持久化）。
 * - 未来接入真实 API 时仅替换 lib/services 实现。
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

  /** 首次加载（幂等）：无持久化数据时拉取 seed */
  hydrate: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  /** 新建并返回新 agent（调用方用于跳转） */
  createAgent: (input: NewAgentInput) => Promise<Agent>;
  /** 触发运行并返回新 run（调用方用于提示） */
  runAgent: (agentId: string) => Promise<AgentRun>;
  /** 重置回演示 seed 数据（持久化随之更新） */
  resetDemoData: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      agents: [],
      runs: [],
      timeRange: "30d",

      hydrate: async () => {
        if (get().hydrated) return;
        // 持久化数据存在则直接使用；否则拉取 seed 演示数据
        const hasStored = get().agents.length > 0 || get().runs.length > 0;
        if (!hasStored) {
          const [agents, runs] = await Promise.all([
            fetchAgentsService(),
            fetchRunsService(),
          ]);
          set({ agents, runs });
        }
        set({ hydrated: true });
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

      resetDemoData: async () => {
        const [agents, runs] = await Promise.all([
          fetchAgentsService(),
          fetchRunsService(),
        ]);
        set({ agents, runs, timeRange: "30d" });
      },
    }),
    {
      name: "ai-workspace-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        agents: state.agents,
        runs: state.runs,
        timeRange: state.timeRange,
      }),
    }
  )
);

/* ---------- 派生统计（Selectors，均实时计算，不落库） ---------- */

/**
 * 按时间范围过滤运行记录（统一自然日口径，与 selectDailyStats / periodStats 一致）：
 * 窗口 = [今天 0 点 −(days−1) 天, 明天 0 点)，即「含今天在内的 N 个自然日」。
 * 保证指标卡、趋势图、最近活动三处数字同源同口径。
 */
export function selectRunsInRange(runs: AgentRun[], range: TimeRange): AgentRun[] {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const start = todayStart.getTime() - (days - 1) * 86_400_000;
  const end = todayStart.getTime() + 86_400_000;
  return runs.filter((r) => {
    const t = new Date(r.startedAt).getTime();
    return t >= start && t < end;
  });
}

/** 按时间范围聚合运行记录为每日统计（用于趋势图） */
export interface DailyStat {
  date: string; // YYYY-MM-DD
  label: string; // MM-DD
  runs: number;
  succeeded: number;
  failed: number;
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
      succeeded,
      failed: dayRuns.length - succeeded,
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
