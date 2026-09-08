"use client";

/**
 * 工作区全局状态（Zustand + persist，Phase 3）
 *
 * 单一数据源：agents + runs + capabilityDefinitions + agentCapabilities + projects + projectAgents + timeRange。
 * - 持久化（localStorage key: ai-workspace-store，version 4）：
 *   agents / runs / agentCapabilities / capabilityDefinitions / projects / projectAgents / timeRange；
 *   actions、hydrated 标志不持久化。
 * - version 3 → 4：新增 Project 领域（projects + projectAgents 关系表，持久化）；
 *   migrate 为旧数据自动补 seed 副本（向后兼容）。
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
  archiveCapability as archiveCapabilityService,
  attachCapability as attachCapabilityService,
  createCapability as createCapabilityService,
  detachCapability as detachCapabilityService,
  fetchCapabilityDefinitions as fetchCapabilityDefinitionsService,
  restoreCapability as restoreCapabilityService,
  setCapabilityEnabled as setCapabilityEnabledService,
  updateCapability as updateCapabilityService,
} from "@/lib/services/capabilities";
import {
  seedAgentCapabilities,
  seedCapabilityDefinitions,
  seedProjectAgents,
  seedProjects,
} from "@/lib/mock-data/seed";
import {
  attachAgentToProject as attachAgentToProjectService,
  createProject as createProjectService,
  detachAgentFromProject as detachAgentFromProjectService,
  fetchProjects as fetchProjectsService,
} from "@/lib/services/projects";
import type {
  Agent,
  AgentCapability,
  AgentRun,
  CapabilityDefinition,
  NewAgentInput,
  NewCapabilityInput,
  NewProjectInput,
  Project,
  ProjectAgent,
  TimeRange,
  UpdateCapabilityInput,
} from "@/lib/types";

interface WorkspaceState {
  /** 数据加载状态 */
  hydrated: boolean;
  agents: Agent[];
  runs: AgentRun[];
  /** 能力资产（定义/资产；version 3 起持久化，支持创建/编辑/归档/恢复） */
  capabilityDefinitions: CapabilityDefinition[];
  /** 装配关系（持久化，version 2 起） */
  agentCapabilities: AgentCapability[];
  /** 项目（业务组织上下文；version 4 起持久化，只维护关系不复制数据） */
  projects: Project[];
  /** 项目 ↔ Agent 关联关系（多对多中介，持久化） */
  projectAgents: ProjectAgent[];
  timeRange: TimeRange;

  /** 首次加载（幂等）：无持久化数据时拉取 seed */
  hydrate: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  /** 新建并返回新 agent（调用方用于跳转） */
  createAgent: (input: NewAgentInput) => Promise<Agent>;
  /** 触发运行并返回新 run（调用方用于提示） */
  runAgent: (agentId: string) => Promise<AgentRun>;
  /** 装配一个能力到 Agent（幂等；archived 能力抛错拒绝） */
  attachCapability: (
    agentId: string,
    capabilityId: string
  ) => Promise<AgentCapability>;
  /** 启用 / 停用某个装配关系（目标不存在则抛错） */
  setCapabilityEnabled: (id: string, enabled: boolean) => Promise<void>;
  /** 解绑装配关系（幂等删除） */
  detachCapability: (id: string) => Promise<void>;
  /** 新建能力定义（默认 active，立即可装配） */
  createCapability: (input: NewCapabilityInput) => Promise<CapabilityDefinition>;
  /** 编辑能力定义元信息（名称/描述/类型） */
  updateCapability: (input: UpdateCapabilityInput) => Promise<void>;
  /** 归档能力定义（软删除；已有装配保留并冻结，不可新装配） */
  archiveCapability: (id: string) => Promise<void>;
  /** 恢复能力定义（重新可装配、装配关系重新可管理） */
  restoreCapability: (id: string) => Promise<void>;
  /** 创建项目（默认 active；返回新项目供跳转） */
  createProject: (input: NewProjectInput) => Promise<Project>;
  /** 关联 Agent 到项目（幂等：同项目同 Agent 已关联则直接返回） */
  attachAgentToProject: (
    projectId: string,
    agentId: string
  ) => Promise<ProjectAgent>;
  /** 解除 Agent 关联（幂等删除） */
  detachAgentFromProject: (id: string) => Promise<void>;
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
      projects: [],
      projectAgents: [],
      timeRange: "30d",

      hydrate: async () => {
        if (get().hydrated) return;
        const hasStored = get().agents.length > 0 || get().runs.length > 0;
        if (!hasStored) {
          // 无持久化数据：全量回填 seed（装配/项目/关系一并重置为 seed）
          const [agents, runs, capabilityDefinitions, projects] =
            await Promise.all([
              fetchAgentsService(),
              fetchRunsService(),
              fetchCapabilityDefinitionsService(),
              fetchProjectsService(),
            ]);
          set({
            agents,
            runs,
            capabilityDefinitions,
            agentCapabilities: seedAgentCapabilities.map((ac) => ({ ...ac })),
            projects,
            projectAgents: seedProjectAgents.map((pa) => ({ ...pa })),
          });
        } else {
          // 持久化数据存在：补资产定义（migrate 已保证 v4 兼容；此处为防御性回填）
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
        // 归档校验（规则：archived 的能力不能被新的 Agent 装配）
        const definition = get().capabilityDefinitions.find(
          (d) => d.id === capabilityId
        );
        if (!definition) throw new Error("能力不存在或已被移除");
        if (definition.lifecycle === "archived") {
          throw new Error("已归档的能力不能再被装配");
        }
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

      createCapability: async (input) => {
        const created = await createCapabilityService(input);
        set((state) => ({
          capabilityDefinitions: [created, ...state.capabilityDefinitions],
        }));
        return created;
      },

      updateCapability: async (input) => {
        // 目标必须存在（不存在抛错，走 Error 态）
        const target = get().capabilityDefinitions.find(
          (d) => d.id === input.id
        );
        if (!target) throw new Error("能力不存在或已被移除");
        const confirmed = await updateCapabilityService(input);
        set((state) => ({
          capabilityDefinitions: state.capabilityDefinitions.map((d) =>
            d.id === input.id
              ? {
                  ...d,
                  name: confirmed.name,
                  description: confirmed.description,
                  type: confirmed.type,
                  // lifecycle 保持现有值（update 只改元信息，生命周期由 archive/restore 管理）
                }
              : d
          ),
        }));
      },

      archiveCapability: async (id) => {
        const target = get().capabilityDefinitions.find((d) => d.id === id);
        if (!target) throw new Error("能力不存在或已被移除");
        if (target.lifecycle === "archived") return; // 幂等
        const confirmed = await archiveCapabilityService(id);
        set((state) => ({
          capabilityDefinitions: state.capabilityDefinitions.map((d) =>
            d.id === id ? { ...d, lifecycle: confirmed.lifecycle } : d
          ),
        }));
      },

      restoreCapability: async (id) => {
        const target = get().capabilityDefinitions.find((d) => d.id === id);
        if (!target) throw new Error("能力不存在或已被移除");
        if (target.lifecycle === "active") return; // 幂等
        const confirmed = await restoreCapabilityService(id);
        set((state) => ({
          capabilityDefinitions: state.capabilityDefinitions.map((d) =>
            d.id === id ? { ...d, lifecycle: confirmed.lifecycle } : d
          ),
        }));
      },

      createProject: async (input) => {
        const created = await createProjectService(input);
        set((state) => ({
          projects: [created, ...state.projects],
        }));
        return created;
      },

      attachAgentToProject: async (projectId, agentId) => {
        // 幂等：同 (projectId, agentId) 已关联则直接返回，不重复创建
        const existing = get().projectAgents.find(
          (pa) => pa.projectId === projectId && pa.agentId === agentId
        );
        if (existing) return existing;
        const created = await attachAgentToProjectService({
          projectId,
          agentId,
        });
        set((state) => ({
          projectAgents: [created, ...state.projectAgents],
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, updatedAt: created.addedAt } : p
          ),
        }));
        return created;
      },

      detachAgentFromProject: async (id) => {
        const target = get().projectAgents.find((pa) => pa.id === id);
        await detachAgentFromProjectService(id);
        set((state) => ({
          projectAgents: state.projectAgents.filter((pa) => pa.id !== id),
          projects: state.projects.map((p) =>
            p.id === target?.projectId
              ? { ...p, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      resetDemoData: async () => {
        const [agents, runs, capabilityDefinitions, projects] =
          await Promise.all([
            fetchAgentsService(),
            fetchRunsService(),
            fetchCapabilityDefinitionsService(),
            fetchProjectsService(),
          ]);
        set({
          agents,
          runs,
          capabilityDefinitions,
          agentCapabilities: seedAgentCapabilities.map((ac) => ({ ...ac })),
          projects,
          projectAgents: seedProjectAgents.map((pa) => ({ ...pa })),
          timeRange: "30d",
        });
      },
    }),
    {
      name: "ai-workspace-store",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        agents: state.agents,
        runs: state.runs,
        agentCapabilities: state.agentCapabilities,
        capabilityDefinitions: state.capabilityDefinitions,
        projects: state.projects,
        projectAgents: state.projectAgents,
        timeRange: state.timeRange,
      }),
      migrate: (persistedState, version) => {
        // 阶梯式向后兼容：v1 → v2 → v3 → v4，仅补缺失字段，旧数据原样保留
        const base = { ...(persistedState as object) };
        if (version < 4) {
          (base as Record<string, unknown>).projects = seedProjects.map((p) => ({
            ...p,
          }));
          (base as Record<string, unknown>).projectAgents = seedProjectAgents.map(
            (pa) => ({ ...pa })
          );
        }
        if (version < 3) {
          (base as Record<string, unknown>).capabilityDefinitions =
            seedCapabilityDefinitions.map((d) => ({ ...d }));
        }
        if (version < 2) {
          (base as Record<string, unknown>).agentCapabilities =
            seedAgentCapabilities.map((ac) => ({ ...ac }));
        }
        return base;
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

/* ---------- Project 派生 Selectors（Phase 3 第五阶段；全部实时计算，不落库） ---------- */

function projectAgentIds(
  projectAgents: ProjectAgent[],
  projectId: string
): Set<string> {
  const ids = new Set<string>();
  for (const pa of projectAgents) {
    if (pa.projectId === projectId) ids.add(pa.agentId);
  }
  return ids;
}

/** 项目下的 Agent 列表（join ProjectAgent → Agent，按名称排序） */
export function selectAgentsInProject(
  agents: Agent[],
  projectAgents: ProjectAgent[],
  projectId: string
): Agent[] {
  const ids = projectAgentIds(projectAgents, projectId);
  return agents
    .filter((a) => ids.has(a.id))
    .sort((a, b) => a.name.localeCompare(b.name, "zh"));
}

/** 项目下全部运行记录（join ProjectAgent → AgentRun，天然属于 Agent，无 projectId 冗余） */
export function selectRunsInProject(
  runs: AgentRun[],
  projectAgents: ProjectAgent[],
  projectId: string
): AgentRun[] {
  const ids = projectAgentIds(projectAgents, projectId);
  return runs.filter((r) => ids.has(r.agentId));
}

/**
 * 项目最近 N 天运行记录：复用 Dashboard 已验证的统一窗口口径
 * selectRunsInRange(runs, range)（含今天在内的 N 个自然日），不重复实现日期计算。
 */
export function selectRunsInProjectWindow(
  runs: AgentRun[],
  projectAgents: ProjectAgent[],
  projectId: string,
  range: TimeRange
): AgentRun[] {
  return selectRunsInRange(
    selectRunsInProject(runs, projectAgents, projectId),
    range
  );
}

/** 项目级统计摘要（全部派生；30 天窗口与 Dashboard 同口径） */
export interface ProjectStats {
  agentCount: number;
  totalRuns: number;
  successRate: number; // 0-1
  totalTokens: number;
  recent30dRuns: number;
  recent30dSuccessRate: number; // 0-1
}

export function selectProjectStats(
  runs: AgentRun[],
  projectAgents: ProjectAgent[],
  projectId: string
): ProjectStats {
  const all = selectRunsInProject(runs, projectAgents, projectId);
  const succeeded = all.filter((r) => r.status === "success").length;
  const recent30d = selectRunsInProjectWindow(
    runs,
    projectAgents,
    projectId,
    "30d"
  );
  const recent30dSucceeded = recent30d.filter((r) => r.status === "success").length;
  return {
    agentCount: projectAgentIds(projectAgents, projectId).size,
    totalRuns: all.length,
    successRate: all.length > 0 ? succeeded / all.length : 0,
    totalTokens: all.reduce((sum, r) => sum + r.tokensUsed, 0),
    recent30dRuns: recent30d.length,
    recent30dSuccessRate:
      recent30d.length > 0 ? recent30dSucceeded / recent30d.length : 0,
  };
}

/** 项目「最近活跃」排序（updatedAt 降序） */
export function sortProjectsByActivity(projects: Project[]): Project[] {
  return [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}
