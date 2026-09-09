/**
 * Task Intelligence API Client（Phase 3）
 *
 * 与既有 API client 同构：http 请求 → DTO → mappers → Domain（UI 只消费 Domain）。
 * DTO ≠ Domain：字段结构独立演进，Store/UI 不依赖 DTO。
 */
import { http } from "./client";
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
    strategy: "heuristic",
    analyzerVersion: d.analyzerVersion,
  };
}

export interface AnalyzeResult {
  plan: RecommendationPlan;
  reused: boolean;
}

/* ---------------- Client ---------------- */

/** 任务分析（幂等：同输入复用已有结果） */
export async function analyzeTask(task: string): Promise<AnalyzeResult> {
  const dto = await http.post<TaskAnalysisPlanDTO>("/api/v1/task-intelligence/analyze", { task });
  return { plan: toPlan(dto), reused: Boolean(dto.reused) };
}

/** 任务分析历史列表 */
export async function fetchTaskAnalyses(limit = 20): Promise<TaskAnalysisListItemDTO[]> {
  const dto = await http.get<{ items: TaskAnalysisListItemDTO[] }>(
    `/api/v1/task-intelligence/analyses?limit=${limit}`
  );
  return dto.items ?? [];
}

/** 单次任务分析详情 */
export async function fetchTaskAnalysis(id: string): Promise<RecommendationPlan> {
  const dto = await http.get<TaskAnalysisPlanDTO>(
    `/api/v1/task-intelligence/analyses/${encodeURIComponent(id)}`
  );
  return toPlan(dto);
}
