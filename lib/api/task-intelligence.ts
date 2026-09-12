/**
 * Task Intelligence API Client（Phase 3）
 *
 * 与既有 API client 同构：http 请求 → DTO → mappers → Domain（UI 只消费 Domain）。
 * DTO ≠ Domain：字段结构独立演进，Store/UI 不依赖 DTO。
 */
import { http } from "./client";
import type {
  PlanCandidate,
  PlanIssue,
  PlanValidation,
  TaskPlan,
} from "@/lib/task-planning";
import type {
  Recommendation,
  RecommendationPlan,
  TaskTypeId,
} from "@/lib/task-intelligence";

/* ---------------- DTO（独立于 Domain） ---------------- */

export interface TaskRequirementDTO {
  requirementText: string;
  category: string;
  keywords: string[];
  weight: number;
  derivedFrom: string;
  isInferred: boolean;
}

export interface TaskRecommendationDTO {
  resourceCapabilityId: string;
  resourceId: string;
  resourceName: string;
  harnessId: string;
  type: string;
  capability: string;
  category: string;
  confidence: number;
  evidenceRef: string;
  evidenceSnippet: string;
  sourcePath: string;
  score: number;
  reason: string;
  requirementText: string;
  rank: number;
}

export interface TaskAnalysisPlanDTO {
  analysisId: string;
  task: string;
  taskType: string;
  summary: string;
  requirements: TaskRequirementDTO[];
  recommendations: TaskRecommendationDTO[];
  strategy: string;
  analyzerVersion: string;
  /** 仅 analyze 响应附带：幂等复用标记 */
  reused?: boolean;
}

export interface TaskAnalysisListItemDTO {
  id: string;
  task: string;
  status: string;
  taskType: string | null;
  analyzerVersion: string;
  createdAt: string;
  analyzedAt: string | null;
  isCurrent: boolean;
  summary: string | null;
}

/* ---------------- Mappers（DTO → Domain） ---------------- */

function toRecommendation(d: TaskRecommendationDTO): Recommendation {
  return {
    resourceCapabilityId: d.resourceCapabilityId,
    resourceId: d.resourceId,
    resourceName: d.resourceName,
    harnessId: d.harnessId,
    type: d.type as Recommendation["type"],
    capability: d.capability,
    category: d.category as Recommendation["category"],
    confidence: d.confidence,
    evidenceRef: d.evidenceRef,
    evidenceSnippet: d.evidenceSnippet,
    sourcePath: d.sourcePath,
    score: d.score,
    reason: d.reason,
    requirementText: d.requirementText,
    rank: d.rank,
  };
}

function toPlan(d: TaskAnalysisPlanDTO): RecommendationPlan {
  return {
    analysisId: d.analysisId,
    task: d.task,
    taskType: d.taskType as TaskTypeId,
    summary: d.summary,
    requirements: (d.requirements ?? []).map((r) => ({
      requirementText: r.requirementText,
      category: r.category as RecommendationPlan["requirements"][number]["category"],
      keywords: r.keywords,
      weight: r.weight,
      derivedFrom: r.derivedFrom,
      isInferred: r.isInferred as true,
    })),
    recommendations: (d.recommendations ?? []).map(toRecommendation),
    strategy: d.strategy === "llm-assisted" ? "llm-assisted" : "heuristic",
    analyzerVersion: d.analyzerVersion,
  };
}

export interface AnalyzeResult {
  plan: RecommendationPlan;
  reused: boolean;
}

/* ---------------- Client ---------------- */

export type AnalyzeStrategy = "heuristic" | "llm-assisted";

/* ---------------- Client ---------------- */

/** 任务分析（幂等：同输入复用已有结果）；strategy 控制是否用 LLM 增强推断字段 */
export async function analyzeTask(
  task: string,
  opts?: { strategy?: AnalyzeStrategy }
): Promise<AnalyzeResult> {
  const dto = await http.post<TaskAnalysisPlanDTO>("/task-intelligence/analyze", {
    task,
    strategy: opts?.strategy ?? "llm-assisted",
  });
  return { plan: toPlan(dto), reused: Boolean(dto.reused) };
}

/** 任务分析历史列表 */
export async function fetchTaskAnalyses(limit = 20): Promise<TaskAnalysisListItemDTO[]> {
  const dto = await http.get<{ items: TaskAnalysisListItemDTO[] }>(
    `/task-intelligence/analyses?limit=${limit}`
  );
  return dto.items ?? [];
}

/** 单次任务分析详情 */
export async function fetchTaskAnalysis(id: string): Promise<RecommendationPlan> {
  const dto = await http.get<TaskAnalysisPlanDTO>(
    `/task-intelligence/analyses/${encodeURIComponent(id)}`
  );
  return toPlan(dto);
}

/* ---------------- Task Planning（Phase 4） DTO / Mappers / Client ---------------- */

export interface PlanStepDTO {
  id: string;
  stepIndex: number;
  requirementId: string;
  requirementText: string;
  category: string;
  primary: PlanCandidate | null;
  alternatives: PlanCandidate[];
  outputDescription: string;
  expectedInput: string | null;
  satisfaction: string;
  isInferred: boolean;
}

export interface PlanDependencyDTO {
  id: string;
  fromStepIndex: number;
  toStepIndex: number;
  type: string;
  reason: string;
  isInferred: boolean;
}

export interface PlanIssueDTO {
  level: string;
  code: string;
  stepIndex?: number;
  message: string;
}

export interface TaskPlanDTO {
  id: string;
  analysisId: string;
  status: string;
  plannerStrategy: string;
  plannerVersion: string;
  createdAt: string;
  validation: { status: string; issues: PlanIssueDTO[] };
  steps: PlanStepDTO[];
  dependencies: PlanDependencyDTO[];
  /** 从 plan 响应附带：幂等复用标记 */
  reused?: boolean;
}

function toPlanIssue(d: PlanIssueDTO): PlanIssue {
  return { level: d.level as PlanIssue["level"], code: d.code as PlanIssue["code"], stepIndex: d.stepIndex, message: d.message };
}

function toTaskPlan(d: TaskPlanDTO): TaskPlan {
  return {
    id: d.id,
    analysisId: d.analysisId,
    status: d.status as TaskPlan["status"],
    plannerStrategy: d.plannerStrategy as TaskPlan["plannerStrategy"],
    plannerVersion: d.plannerVersion,
    createdAt: d.createdAt,
    validation: {
      status: d.validation.status as PlanValidation["status"],
      issues: (d.validation.issues ?? []).map(toPlanIssue),
    },
    steps: (d.steps ?? []).map((s) => ({
      id: s.id,
      stepIndex: s.stepIndex,
      requirementId: s.requirementId,
      requirementText: s.requirementText,
      category: s.category as TaskPlan["steps"][number]["category"],
      primary: s.primary,
      alternatives: s.alternatives ?? [],
      outputDescription: s.outputDescription,
      expectedInput: s.expectedInput,
      satisfaction: s.satisfaction as TaskPlan["steps"][number]["satisfaction"],
      isInferred: s.isInferred,
    })),
    dependencies: (d.dependencies ?? []).map((dep) => ({
      id: dep.id,
      fromStepIndex: dep.fromStepIndex,
      toStepIndex: dep.toStepIndex,
      type: dep.type as TaskPlan["dependencies"][number]["type"],
      reason: dep.reason,
      isInferred: dep.isInferred,
    })),
  };
}

export interface CreatePlanResultDTO {
  plan: TaskPlan;
  reused: boolean;
}

/** 生成任务计划（幂等：同 analysisId 复用已有计划） */
export async function createTaskPlan(analysisId: string): Promise<CreatePlanResultDTO> {
  const dto = await http.post<TaskPlanDTO>("/task-intelligence/plan", { analysisId });
  return { plan: toTaskPlan(dto), reused: Boolean(dto.reused) };
}

/** 按 id 查询任务计划 */
export async function fetchTaskPlan(id: string): Promise<TaskPlan> {
  const dto = await http.get<TaskPlanDTO>(
    `/task-intelligence/plans/${encodeURIComponent(id)}`
  );
  return toTaskPlan(dto);
}

/** 按分析查询其当前计划（未生成时抛 404，由调用方转为空态） */
export async function fetchPlanByAnalysis(analysisId: string): Promise<TaskPlan> {
  const dto = await http.get<TaskPlanDTO>(
    `/task-intelligence/analyses/${encodeURIComponent(analysisId)}/plan`
  );
  return toTaskPlan(dto);
}
