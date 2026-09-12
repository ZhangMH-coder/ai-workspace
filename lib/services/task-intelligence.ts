/**
 * Task Intelligence Service 入口（仅 Real：HTTP → Route Handler → SQLite）
 */
export {
  analyzeTask,
  fetchTaskAnalyses,
  fetchTaskAnalysis,
  createTaskPlan,
  fetchTaskPlan,
  fetchPlanByAnalysis,
  type AnalyzeResult,
  type TaskAnalysisListItemDTO,
  type TaskPlanDTO,
} from "@/lib/api/task-intelligence";
import type { RecommendationPlan } from "@/lib/task-intelligence";
import type { TaskPlan } from "@/lib/task-planning";

export type { RecommendationPlan, TaskPlan };