"use client";

/**
 * 工作区全局状态（Zustand + persist，Phase 3）
 *
 * 单一数据源：agents + runs + capabilityDefinitions + agentCapabilities + timeRange。
 * - 持久化（localStorage key: ai-workspace-store，version 2）：
 *   agents / runs / agentCapabilities / timeRange；
 *   actions、hydrated 标志、capabilityDefinitions（本阶段只读资产，随 seed 回填）不持久化。
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
import {
  attachCapability as attachCapabilityService,
  detachCapability as detachCapabilityService,
  fetchCapabilityDefinitions as fetchCapabilityDefinitionsService,
  setCapabilityEnabled as setCapabilityEnabledService,
} from "@/lib/services/capabilities";
import { seedAgentCapabilities } from "@/lib/mock-data/seed";
import type {
  Agent,
  AgentCapability,
  AgentRun,
  CapabilityDefinition,
  NewAgentInput,
  TimeRange,
} from "@/lib/types";

interface WorkspaceState {
  /** 数据加载状态 */
  hydrated: boolean;
  agents: Agent[];
  runs: AgentRun[];
  /** 能力资产（定义/资产，只读；不持久化，随 seed 回填） */
  capabilityDefinitions: CapabilityDefinition[];
  /** 装配关系（持久化，version 2 起） */
  agentCapabilities: AgentCapability[];
  timeRange: TimeRange;

  /** 首次加载（幂等）：无持久化数据时拉取 seed */
  hydrate: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  /** 新建并返回新 agent（调用方用于跳转） */
  createAgent: (input: NewAgentInput) => Promise<Agent>;
  /** 触发运行并返回新 run（调用方用于提示） */
  runAgent: (agentId: string) => Promise<AgentRun>;
  /** 装配一个能力到 Agent（幂等：已存在则直接返回现有记录） */
  attachCapability: (
    agentId: string,
    capabilityId: string
  ) => Promise<AgentCapability>;
  /** 启用 / 停用某个装配关系（目标不存在则抛错） */
  setCapabilityEnabled: (id: string, enabled: boolean) => Promise<void>;
  /** 解绑装配关系（幂等删除） */
  detachCapability: (id: string) => Promise<void>;
  /** 重置回演示 seed 数据（持久化随之更新） */
  resetDemoData: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      agents: [],
      runs: [],
      capabilityDefinitions: [],
      agentCapabilities: [],
      timeRange: "30d",

      hydrate: async () => {
        if (get().hydrated) return;
        const hasStored = get().agents.length > 0 || get().runs.length > 0;
        if (!hasStored) {
          // 无持久化数据：全量回填 seed（装配关系也一并重置为 seed）
          const [agents, runs, capabilityDefinitions] = await Promise.all([
            fetchAgentsService(),
            fetchRunsService(),
            fetchCapabilityDefinitionsService(),
          ]);
          set({
            agents,
            runs,
            capabilityDefinitions,
            agentCapabilities: seedAgentCapabilities.map((ac) => ({ ...ac })),
          });
        } else {
          // 持久化数据存在：补资产定义（只读资产不持久化，始终以 seed 为准）
          if (get().capabilityDefinitions.length === 0) {
            const capabilityDefinitions =
              await fetchCapabilityDefinitionsService();
            set({ capabilityDefinitions });
          }
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

      attachCapability: async (agentId, capabilityId) => {
        // 幂等：同 (agentId, capabilityId) 已有装配则直接返回，不重复创建
        const existing = get().agentCapabilities.find(
          (ac) => ac.agentId === agentId && ac.capabilityId === capabilityId
        );
        if (existing) return existing;
        const created = await attachCapabilityService({
          agentId,
          capabilityId,
        });
        set((state) => ({
          agentCapabilities: [created, ...state.agentCapabilities],
        }));
        return created;
      },

      setCapabilityEnabled: async (id, enabled) => {
        const target = get().agentCapabilities.find((ac) => ac.id === id);
        if (!target) throw new Error("装配关系不存在或已解绑");
        const confirmed = await setCapabilityEnabledService({ id, enabled });
        set((state) => ({
          agentCapabilities: state.agentCapabilities.map((ac) =>
            ac.id === id ? { ...ac, enabled: confirmed.enabled } : ac
          ),
        }));
      },

      detachCapability: async (id) => {
        await detachCapabilityService(id);
        set((state) => ({
          agentCapabilities: state.agentCapabilities.filter(
            (ac) => ac.id !== id
          ),
        }));
      },

      resetDemoData: async () => {
        const [agents, runs, capabilityDefinitions] = await Promise.all([
          fetchAgentsService(),
          fetchRunsService(),
          fetchCapabilityDefinitionsService(),
        ]);
        set({
          agents,
          runs,
          capabilityDefinitions,
          agentCapabilities: seedAgentCapabilities.map((ac) => ({ ...ac })),
          timeRange: "30d",
        });
      },
    }),
    {
      name: "ai-workspace-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        agents: state.agents,
        runs: state.runs,
        agentCapabilities: state.agentCapabilities,
        timeRange: state.timeRange,
      }),
      migrate: (persistedState, version) => {
        if (version < 2) {
          // v1 → v2：补充装配关系（seed），旧数据升级后即可管理装配
          return {
            ...(persistedState as object),
            agentCapabilities: seedAgentCapabilities.map((ac) => ({ ...ac })),
          };
        }
        return persistedState as object;
      },
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
