"use client";

/**
 * 工作区全局状态（Zustand + persist，P4-3）
 *
 * 单一数据源：agents + recentRuns + capabilityDefinitions + agentCapabilities + projects + projectAgents + timeRange + stats。
 *
 * P4-3「统计端点化收尾」核心变化：
 * - 运行统计（Dashboard / Project / Agent）正式由 /api/v1/runs/stats 服务端聚合获取
 *   （SQLite/Repository 直接聚合），Store 不再持有全量 runs 做内存统计；
 * - Store 仅保留「明细子集」：recentRuns（全局最近 10 条，最近活动用）、
 *   agentRunsById / projectRunsById（详情页按需拉取，pageSize 有界）；
 * - stats 缓存（StatsCache）随 timeRange 刷新 global/previous，byProject/byAgent 为
 *   全部时间 + 固定 30 天窗口聚合（与 Dashboard 同口径 windowBoundsForRange）；
 * - persist 保持 version 5：localStorage 仍仅存 timeRange（UI 偏好），领域数据只来自 SQLite / Mock。
 *
 * 持久化职责（P4-2d 延续）：
 * - SQLite 为「事实数据源」；Zustand 为「客户端状态/缓存」；
 * - 旧版本（<5）localStorage 中的领域数据**明确丢弃、不与 SQLite 合并**。
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  createAgent as createAgentService,
  fetchAgentRuns as fetchAgentRunsService,
  fetchAgents as fetchAgentsService,
  runAgent as runAgentService,
} from "@/lib/services/agents";
import {
  archiveCapability as archiveCapabilityService,
  attachCapability as attachCapabilityService,
  createCapability as createCapabilityService,
  detachCapability as detachCapabilityService,
  fetchAllAgentCapabilities as fetchAllAgentCapabilitiesService,
  fetchCapabilityDefinitions as fetchCapabilityDefinitionsService,
  restoreCapability as restoreCapabilityService,
  setCapabilityEnabled as setCapabilityEnabledService,
  updateCapability as updateCapabilityService,
} from "@/lib/services/capabilities";
import {
  resetDemoData as resetDemoDataService,
} from "@/lib/services/demo";
import {
  attachAgentToProject as attachAgentToProjectService,
  createProject as createProjectService,
  detachAgentFromProject as detachAgentFromProjectService,
  fetchAllProjectAgents as fetchAllProjectAgentsService,
  fetchProjects as fetchProjectsService,
} from "@/lib/services/projects";
import {
  fetchProjectRuns as fetchProjectRunsService,
  fetchRecentRuns as fetchRecentRunsService,
  fetchRunsStats as fetchRunsStatsService,
} from "@/lib/services/runs";
import {
  fetchDiscoveryOverview as fetchDiscoveryOverviewService,
  fetchDiscoveredResources as fetchDiscoveredResourcesService,
  fetchResourceDetail as fetchResourceDetailService,
  hideResource as hideResourceService,
  runResourceScan as runResourceScanService,
  unhideResource as unhideResourceService,
  unhideResourceRecord as unhideResourceRecordService,
} from "@/lib/services/resource-discovery";
import type {
  Agent,
  AgentCapability,
  AgentRun,
  CapabilityDefinition,
  DiscoveredResource,
  DiscoveryOverview,
  NewAgentInput,
  NewCapabilityInput,
  NewProjectInput,
  Project,
  ProjectAgent,
  RunsStats,
  TimeRange,
  UpdateCapabilityInput,
} from "@/lib/types";
import type { ResourceListQuery } from "@/lib/api/resource-discovery";
import type {
  AnalysisRunResult,
  AnalysisStatusSummary,
  CapabilityIndexEntry,
  ResourceInsight,
  TaskMatchResult,
} from "@/lib/types";
import {
  fetchAnalysisStatus as fetchAnalysisStatusService,
  fetchCapabilityIndex as fetchCapabilityIndexService,
  fetchResourceInsight as fetchResourceInsightService,
  matchResourcesForTask as matchResourcesForTaskService,
  runAnalysis as runAnalysisService,
} from "@/lib/services/resource-analysis";
import {
  analyzeTask as analyzeTaskService,
  createTaskPlan as createTaskPlanService,
  fetchPlanByAnalysis as fetchPlanByAnalysisService,
  fetchTaskAnalyses as fetchTaskAnalysesService,
} from "@/lib/services/task-intelligence";
import type { RecommendationPlan } from "@/lib/task-intelligence";
import type { TaskAnalysisListItemDTO } from "@/lib/api/task-intelligence";
import type { TaskPlan } from "@/lib/task-planning";

/** 空统计（组件对未加载/无数据时的防御默认值） */
export const EMPTY_RUNS_STATS: RunsStats = {
  window: { from: "", to: "" },
  totals: {
    runs: 0,
    succeeded: 0,
    failed: 0,
    successRate: 0,
    tokens: 0,
    avgDurationMs: 0,
    lastRunAt: null,
  },
  daily: [],
};

/** 统计缓存：随 timeRange 变化的部分 + 全部时间/固定窗口的实体维度 */
export interface StatsCache {
  range: TimeRange;
  /** 当前窗口（含今天在内的 N 个自然日）全局统计 */
  global: RunsStats;
  /** 前一等长窗口全局统计（环比 delta 用） */
  previous: RunsStats;
  /** 项目维度：全部时间 + 固定 30 天窗口（与 Dashboard 同口径） */
  byProject: Record<string, { all: RunsStats; recent30d: RunsStats }>;
  /** Agent 维度：全部时间 */
  byAgent: Record<string, RunsStats>;
}

interface WorkspaceState {
  /** 数据加载状态 */
  hydrated: boolean;
  agents: Agent[];
  /** 最近运行明细（全局最近 N 条，仅最近活动等明细场景；统计一律走 stats） */
  recentRuns: AgentRun[];
  /** Agent 详情运行历史（按需加载缓存） */
  agentRunsById: Record<string, AgentRun[]>;
  /** 项目最近运行明细（按需加载缓存） */
  projectRunsById: Record<string, AgentRun[]>;
  /** 能力资产（定义/资产；持久化，支持创建/编辑/归档/恢复） */
  capabilityDefinitions: CapabilityDefinition[];
  /** 装配关系（持久化） */
  agentCapabilities: AgentCapability[];
  /** 项目（业务组织上下文；持久化，只维护关系不复制数据） */
  projects: Project[];
  /** 项目 ↔ Agent 关联关系（多对多中介，持久化） */
  projectAgents: ProjectAgent[];
  timeRange: TimeRange;
  /** 运行统计缓存（服务端聚合；随 timeRange 刷新 global/previous） */
  stats: StatsCache | null;

  /** 首次加载（幂等）：无持久化数据时拉取 seed */
  hydrate: () => Promise<void>;
  setTimeRange: (range: TimeRange) => void;
  /** 新建并返回新 agent（调用方用于跳转） */
  createAgent: (input: NewAgentInput) => Promise<Agent>;
  /** 触发运行并返回新 run（调用方用于提示）；刷新窗口统计与最近明细 */
  runAgent: (agentId: string) => Promise<AgentRun>;
  /** 按需加载某 Agent 运行历史（明细场景，分页有界） */
  fetchAgentRuns: (agentId: string) => Promise<void>;
  /** 按需加载某项目最近运行（明细场景） */
  fetchProjectRuns: (projectId: string) => Promise<void>;
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
  /** 重置回演示 seed 数据（Real 重置 SQLite；Mock 重置内存数据层） */
  resetDemoData: () => Promise<void>;
  /** 资源发现：最新一次扫描概览（未扫描/无资源 → 结构化空态，不伪造数据） */
  discovery: {
    overview: DiscoveryOverview | null;
    resources: DiscoveredResource[];
    resourcesTotal: number;
    resourceDetail: DiscoveredResource | null;
    loading: boolean;
    scanning: boolean;
    error: string | null;
  };
  fetchDiscoveryOverview: () => Promise<void>;
  /** 重新扫描本机真实 Harness 资源（只读；幂等 upsert 索引） */
  runResourceScan: () => Promise<void>;
  fetchDiscoveredResources: (q?: ResourceListQuery) => Promise<void>;
  fetchResourceDetail: (id: string) => Promise<void>;
  /** 隐藏资源（展示排除，S1.12）：按 sourcePath 记录，列表刷新由调用方负责 */
  hideResource: (id: string) => Promise<void>;
  /** 恢复被隐藏的资源 */
  unhideResource: (id: string) => Promise<void>;
  /** Settings 恢复：按隐藏记录 id 清除隐藏状态 */
  unhideResourceRecord: (recordId: string) => Promise<void>;

  /** Resource Intelligence：分析状态 / 能力索引 / 洞察 / 任务匹配（SQLite 事实源，非持久化） */
  analysis: {
    status: AnalysisStatusSummary | null;
    capabilityIndex: CapabilityIndexEntry[];
    insight: ResourceInsight | null;
    matchResult: TaskMatchResult | null;
    lastRun: AnalysisRunResult | null;
    running: boolean;
    loading: boolean;
    error: string | null;
  };
  fetchAnalysisStatus: () => Promise<void>;
  runAnalysis: (opts?: { force?: boolean; resourceIds?: string[] }) => Promise<void>;
  fetchResourceInsight: (id: string) => Promise<void>;
  fetchCapabilityIndex: () => Promise<void>;
  matchResourcesForTask: (task: string) => Promise<void>;
  /** 任务智能（Phase 3）：任务 → 子任务 → 能力需求 → 推荐方案 */
  taskIntelligence: {
    current: RecommendationPlan | null;
    history: TaskAnalysisListItemDTO[];
    analyzing: boolean;
    loading: boolean;
    error: string | null;
    /** 幂等复用标记 */
    reused: boolean;
    /** 任务计划（Phase 4）：有序步骤 + 依赖 + 校验（只组织能力，不执行） */
    plan: TaskPlan | null;
    planLoading: boolean;
    planError: string | null;
    planReused: boolean;
  };
  analyzeTask: (task: string) => Promise<RecommendationPlan>;
  fetchTaskAnalysisHistory: () => Promise<void>;
  createTaskPlan: (analysisId: string) => Promise<TaskPlan>;
  fetchPlanByAnalysis: (analysisId: string) => Promise<TaskPlan | null>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      agents: [],
      recentRuns: [],
      agentRunsById: {},
      projectRunsById: {},
      capabilityDefinitions: [],
      agentCapabilities: [],
      projects: [],
      projectAgents: [],
      timeRange: "30d",
      stats: null,
      discovery: {
        overview: null,
        resources: [],
        resourcesTotal: 0,
        resourceDetail: null,
        loading: false,
        scanning: false,
        error: null,
      },

      analysis: {
        status: null,
        capabilityIndex: [],
        insight: null,
        matchResult: null,
        lastRun: null,
        running: false,
        loading: false,
        error: null,
      },
      taskIntelligence: {
        current: null,
        history: [],
        analyzing: false,
        loading: false,
        error: null,
        reused: false,
        plan: null,
        planLoading: false,
        planError: null,
        planReused: false,
      },
      fetchDiscoveryOverview: async () => {
        set((s) => ({ discovery: { ...s.discovery, loading: true, error: null } }));
        try {
          const overview = await fetchDiscoveryOverviewService();
          set((s) => ({ discovery: { ...s.discovery, overview, loading: false } }));
        } catch (e) {
          set((s) => ({
            discovery: { ...s.discovery, loading: false, error: (e as Error).message },
          }));
        }
      },

      runResourceScan: async () => {
        set((s) => ({ discovery: { ...s.discovery, scanning: true, error: null } }));
        try {
          const result = await runResourceScanService();
          const run = result.scanRun;
          // Mock 模式不执行真实扫描（返回空结果）；Real 返回最新扫描记录
          if (run) {
            set((s) => ({
              discovery: {
                ...s.discovery,
                overview: {
                  scanRun: run,
                  harnesses: result.harnesses,
                  totalResources: run.totalResources,
                  parseableCount: run.parseableCount,
                  lastScannedAt: run.finishedAt,
                },
                scanning: false,
              },
            }));
          } else {
            set((s) => ({ discovery: { ...s.discovery, scanning: false } }));
          }
        } catch (e) {
          set((s) => ({
            discovery: { ...s.discovery, scanning: false, error: (e as Error).message },
          }));
        }
      },

      fetchDiscoveredResources: async (q) => {
        set((s) => ({ discovery: { ...s.discovery, loading: true, error: null } }));
        try {
          const { items, total } = await fetchDiscoveredResourcesService(q);
          set((s) => ({ discovery: { ...s.discovery, resources: items, resourcesTotal: total, loading: false } }));
        } catch (e) {
          set((s) => ({
            discovery: { ...s.discovery, loading: false, error: (e as Error).message },
          }));
        }
      },

      fetchResourceDetail: async (id) => {
        set((s) => ({ discovery: { ...s.discovery, loading: true, error: null } }));
        try {
          const detail = await fetchResourceDetailService(id);
          set((s) => ({ discovery: { ...s.discovery, resourceDetail: detail, loading: false } }));
        } catch (e) {
          set((s) => ({
            discovery: { ...s.discovery, loading: false, error: (e as Error).message },
          }));
        }
      },

      hideResource: async (id) => {
        await hideResourceService(id);
      },

      unhideResource: async (id) => {
        await unhideResourceService(id);
      },

      unhideResourceRecord: async (recordId) => {
        await unhideResourceRecordService(recordId);
      },


      fetchAnalysisStatus: async () => {
        set((s) => ({ analysis: { ...s.analysis, loading: true, error: null } }));
        try {
          const status = await fetchAnalysisStatusService();
          set((s) => ({ analysis: { ...s.analysis, status, loading: false } }));
        } catch (e) {
          set((s) => ({
            analysis: { ...s.analysis, loading: false, error: (e as Error).message },
          }));
        }
      },

      runAnalysis: async (opts) => {
        set((s) => ({ analysis: { ...s.analysis, running: true, error: null } }));
        try {
          const lastRun = await runAnalysisService(opts);
          const status = await fetchAnalysisStatusService();
          const capabilityIndex = await fetchCapabilityIndexService();
          set((s) => ({
            analysis: { ...s.analysis, lastRun, status, capabilityIndex, running: false },
          }));
        } catch (e) {
          set((s) => ({
            analysis: { ...s.analysis, running: false, error: (e as Error).message },
          }));
        }
      },

      fetchResourceInsight: async (id) => {
        set((s) => ({ analysis: { ...s.analysis, loading: true, error: null } }));
        try {
          const insight = await fetchResourceInsightService(id);
          set((s) => ({ analysis: { ...s.analysis, insight, loading: false } }));
        } catch (e) {
          set((s) => ({
            analysis: { ...s.analysis, loading: false, error: (e as Error).message },
          }));
        }
      },

      fetchCapabilityIndex: async () => {
        set((s) => ({ analysis: { ...s.analysis, loading: true, error: null } }));
        try {
          const capabilityIndex = await fetchCapabilityIndexService();
          set((s) => ({ analysis: { ...s.analysis, capabilityIndex, loading: false } }));
        } catch (e) {
          set((s) => ({
            analysis: { ...s.analysis, loading: false, error: (e as Error).message },
          }));
        }
      },

      matchResourcesForTask: async (task) => {
        set((s) => ({ analysis: { ...s.analysis, loading: true, error: null } }));
        try {
          const matchResult = await matchResourcesForTaskService(task);
          set((s) => ({ analysis: { ...s.analysis, matchResult, loading: false } }));
        } catch (e) {
          set((s) => ({
            analysis: { ...s.analysis, loading: false, error: (e as Error).message },
          }));
        }
      },

      analyzeTask: async (task: string) => {
        set((s) => ({ taskIntelligence: { ...s.taskIntelligence, analyzing: true, error: null } }));
        try {
          const result = await analyzeTaskService(task);
          set((s) => ({
            taskIntelligence: {
              ...s.taskIntelligence,
              current: result.plan,
              analyzing: false,
              reused: result.reused,
            },
          }));
          return result.plan;
        } catch (e) {
          set((s) => ({
            taskIntelligence: {
              ...s.taskIntelligence,
              analyzing: false,
              error: (e as Error).message,
            },
          }));
          throw e;
        }
      },
      fetchTaskAnalysisHistory: async () => {
        set((s) => ({ taskIntelligence: { ...s.taskIntelligence, loading: true, error: null } }));
        try {
          const history = await fetchTaskAnalysesService();
          set((s) => ({ taskIntelligence: { ...s.taskIntelligence, history, loading: false } }));
        } catch (e) {
          set((s) => ({
            taskIntelligence: {
              ...s.taskIntelligence,
              loading: false,
              error: (e as Error).message,
            },
          }));
        }
      },

      createTaskPlan: async (analysisId: string) => {
        set((s) => ({
          taskIntelligence: { ...s.taskIntelligence, planLoading: true, planError: null },
        }));
        try {
          const result = await createTaskPlanService(analysisId);
          set((s) => ({
            taskIntelligence: {
              ...s.taskIntelligence,
              plan: result.plan,
              planLoading: false,
              planReused: result.reused,
            },
          }));
          return result.plan;
        } catch (e) {
          set((s) => ({
            taskIntelligence: {
              ...s.taskIntelligence,
              planLoading: false,
              planError: (e as Error).message,
            },
          }));
          throw e;
        }
      },
      fetchPlanByAnalysis: async (analysisId: string) => {
        set((s) => ({
          taskIntelligence: { ...s.taskIntelligence, planLoading: true, planError: null },
        }));
        try {
          const plan = await fetchPlanByAnalysisService(analysisId);
          set((s) => ({ taskIntelligence: { ...s.taskIntelligence, plan, planLoading: false } }));
          return plan;
        } catch (e) {
          const err = e as { code?: string };
          // 404 = 未生成计划 → 空态（不报错）；其余错误如实展示
          if (err.code === "NOT_FOUND") {
            set((s) => ({ taskIntelligence: { ...s.taskIntelligence, planLoading: false } }));
            return null;
          }
          set((s) => ({
            taskIntelligence: {
              ...s.taskIntelligence,
              planLoading: false,
              planError: (e as Error).message,
            },
          }));
          return null;
        }
      },

      hydrate: async () => {
        if (get().hydrated) return;
        const all = await fetchAllData();
        const stats = await loadStats(get().timeRange, all.agents, all.projects);
        set({ ...all, stats, hydrated: true });
      },

      setTimeRange: async (range) => {
        set({ timeRange: range });
        // 只刷新窗口相关统计（global/previous）；实体维度（byProject/byAgent）不随 range 变化
        const cur = get().stats;
        if (!cur) return;
        const refreshed = await loadWindowStats(range);
        set({ stats: { ...cur, ...refreshed } });
      },

      createAgent: async (input) => {
        const agent = await createAgentService(input);
        set((state) => ({ agents: [agent, ...state.agents] }));
        return agent;
      },

      runAgent: async (agentId) => {
        const agent = get().agents.find((a) => a.id === agentId);
        const run = await runAgentService(agentId, agent?.name ?? "Agent");
        set((state) => ({
          recentRuns: [run, ...state.recentRuns].slice(0, 10),
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, lastRunAt: run.finishedAt } : a
          ),
        }));
        // 新运行发生在今天 → 只影响当前窗口统计，刷新 global/previous
        const cur = get().stats;
        if (cur) {
          const refreshed = await loadWindowStats(cur.range);
          set({ stats: { ...cur, ...refreshed } });
        }
        return run;
      },

      fetchAgentRuns: async (agentId) => {
        const cache = get().agentRunsById;
        if (cache[agentId]) return;
        const runs = await fetchAgentRunsService(agentId);
        set((state) => ({
          agentRunsById: { ...state.agentRunsById, [agentId]: runs },
        }));
      },

      fetchProjectRuns: async (projectId) => {
        const cache = get().projectRunsById;
        if (cache[projectId]) return;
        const ids = get().projectAgents
          .filter((pa) => pa.projectId === projectId)
          .map((pa) => pa.agentId);
        if (ids.length === 0) {
          set((state) => ({
            projectRunsById: { ...state.projectRunsById, [projectId]: [] },
          }));
          return;
        }
        const runs = await fetchProjectRunsService(ids, 8);
        set((state) => ({
          projectRunsById: { ...state.projectRunsById, [projectId]: runs },
        }));
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
        set((state) => ({ projects: [created, ...state.projects] }));
        await refreshProjectStats(created.id, get, set);
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
        await refreshProjectStats(projectId, get, set);
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
        if (target) await refreshProjectStats(target.projectId, get, set);
      },

      resetDemoData: async () => {
        // Real：重置 SQLite 演示库；Mock：重置内存数据层（state.ts）
        await resetDemoDataService();
        const all = await fetchAllData();
        const stats = await loadStats("30d", all.agents, all.projects);
        set({ ...all, stats, timeRange: "30d" });
      },
    }),
    {
      name: "ai-workspace-store",
      version: 5,
      storage: createJSONStorage(() => localStorage),
      // 持久化职责收敛：localStorage 仅保留必要 UI 偏好；领域事实数据以 SQLite 为唯一事实源
      partialize: (state) => ({
        timeRange: state.timeRange,
      }),
      migrate: (persistedState, persistedVersion) => {
        // v<5：旧版本持久化了领域事实数据。明确处理策略：**一律丢弃，不与 SQLite 合并**
        // （避免第二数据源）；仅迁移 UI 偏好 timeRange。
        void persistedVersion;
        const old = persistedState as { timeRange?: TimeRange } | null;
        return { timeRange: old?.timeRange ?? "30d" };
      },
    }
  )
);

/* ---------- 全量拉取与统计加载（hydrate / reset 共用） ---------- */

/** 全量拉取（实体 + 最近明细；SQLite 为事实源，拉取后即权威缓存） */
async function fetchAllData() {
  const [agents, recentRuns, capabilityDefinitions, agentCapabilities, projects, projectAgents] =
    await Promise.all([
      fetchAgentsService(),
      fetchRecentRunsService(10),
      fetchCapabilityDefinitionsService(),
      fetchAllAgentCapabilitiesService(),
      fetchProjectsService(),
      fetchAllProjectAgentsService(),
    ]);
  return {
    agents,
    recentRuns,
    capabilityDefinitions,
    agentCapabilities,
    projects,
    projectAgents,
  };
}

/** 全部时间聚合的边界（seed 最早记录约 95 天前；1970 起足够覆盖） */
const ALL_TIME_FROM = "1970-01-01T00:00:00.000Z";

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** 加载窗口相关统计（global 当前窗口 + previous 前一等长窗口；唯一窗口实现 windowBoundsForRange） */
async function loadWindowStats(range: TimeRange) {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const bounds = windowBoundsForRange(days);
  const prevBounds = windowBoundsForRange(days, days);
  const [global, previous] = await Promise.all([
    fetchRunsStatsService({ from: iso(bounds.start), to: iso(bounds.end) }),
    fetchRunsStatsService({ from: iso(prevBounds.start), to: iso(prevBounds.end) }),
  ]);
  return { range, global, previous };
}

/** 加载实体维度统计：项目（全部 + 固定 30 天窗口，与 Dashboard 同口径）+ Agent（全部时间） */
async function loadEntityStats(agents: Agent[], projects: Project[]) {
  const allTo = iso(windowBoundsForRange(1).end); // 明天 0 点
  const r30 = windowBoundsForRange(30);
  const projectEntries = await Promise.all(
    projects.map(async (p) => {
      const [all, recent30d] = await Promise.all([
        fetchRunsStatsService({ from: ALL_TIME_FROM, to: allTo, projectId: p.id }),
        fetchRunsStatsService({ from: iso(r30.start), to: iso(r30.end), projectId: p.id }),
      ]);
      return [p.id, { all, recent30d }] as const;
    })
  );
  const agentEntries = await Promise.all(
    agents.map(async (a) => {
      const s = await fetchRunsStatsService({ from: ALL_TIME_FROM, to: allTo, agentId: a.id });
      return [a.id, s] as const;
    })
  );
  return {
    byProject: Object.fromEntries(projectEntries) as StatsCache["byProject"],
    byAgent: Object.fromEntries(agentEntries) as StatsCache["byAgent"],
  };
}

async function loadStats(range: TimeRange, agents: Agent[], projects: Project[]) {
  const [windowStats, entityStats] = await Promise.all([
    loadWindowStats(range),
    loadEntityStats(agents, projects),
  ]);
  return { ...windowStats, ...entityStats };
}

/** 项目关联变化后刷新该项目统计（all + recent30d），保持 Dashboard / 列表 / 详情同源 */
async function refreshProjectStats(
  projectId: string,
  get: () => WorkspaceState,
  set: (fn: (s: WorkspaceState) => Partial<WorkspaceState>) => void
) {
  const cur = get().stats;
  if (!cur) return;
  const allTo = iso(windowBoundsForRange(1).end);
  const r30 = windowBoundsForRange(30);
  const [all, recent30d] = await Promise.all([
    fetchRunsStatsService({ from: ALL_TIME_FROM, to: allTo, projectId }),
    fetchRunsStatsService({ from: iso(r30.start), to: iso(r30.end), projectId }),
  ]);
  set((state) => ({
    stats: state.stats
      ? {
          ...state.stats,
          byProject: { ...state.stats.byProject, [projectId]: { all, recent30d } },
        }
      : null,
  }));
}

/* ---------- 统一自然日窗口（唯一实现；P4-3 继续作为 stats from/to 的边界来源） ---------- */

const DAY_MS = 86_400_000;

/**
 * 统一自然日窗口边界（唯一实现）：
 * 窗口 = [今天 0 点 −(offsetDays+days−1) 天, 今天 0 点 + (1−offsetDays) 天)，
 * 即「含今天在内的 N 个自然日」（offsetDays=0 时）。
 * Dashboard / Project / stats 请求的 from/to 均基于本函数，杜绝重复日期实现。
 */
export function windowBoundsForRange(
  days: number,
  offsetDays = 0
): { start: number; end: number } {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = todayStart.getTime();
  return {
    start: today - (offsetDays + days - 1) * DAY_MS,
    end: today + (1 - offsetDays) * DAY_MS,
  };
}

/* ---------- 关系派生 Selectors（仅 join 实体关系，不涉及运行统计；统计一律走 stats 缓存） ---------- */

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

/** 项目「最近活跃」排序（updatedAt 降序） */
export function sortProjectsByActivity(projects: Project[]): Project[] {
  return [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}
