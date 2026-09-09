/**
 * Task Intelligence Service 双模式入口（Mock/Real）
 * 与既有 lib/services 双模式文件同构：Mock 只切换前端数据流，API 端点始终连 SQLite。
 */
import { USE_MOCK } from "./mode";
import {
  analyzeTaskMock,
  createTaskPlanMock,
  fetchPlanByAnalysisMock,
  fetchTaskAnalysisMock,
  fetchTaskAnalysesMock,
  fetchTaskPlanMock,
} from "./mock/task-intelligence";
import {
  analyzeTask as analyzeTaskHttp,
  createTaskPlan as createTaskPlanHttp,
  fetchPlanByAnalysis as fetchPlanByAnalysisHttp,
  fetchTaskAnalysis as fetchTaskAnalysisHttp,
  fetchTaskAnalyses as fetchTaskAnalysesHttp,
  fetchTaskPlan as fetchTaskPlanHttp,
  type AnalyzeResult,
} from "@/lib/api/task-intelligence";
import type { RecommendationPlan } from "@/lib/task-intelligence";
import type { TaskAnalysisListItemDTO, TaskPlanDTO } from "@/lib/api/task-intelligence";
import type { TaskPlan } from "@/lib/task-planning";

export const analyzeTask = USE_MOCK ? analyzeTaskMock : analyzeTaskHttp;
export const fetchTaskAnalyses = USE_MOCK ? fetchTaskAnalysesMock : fetchTaskAnalysesHttp;
export const fetchTaskAnalysis = USE_MOCK ? fetchTaskAnalysisMock : fetchTaskAnalysisHttp;
export const createTaskPlan = USE_MOCK ? createTaskPlanMock : createTaskPlanHttp;
export const fetchTaskPlan = USE_MOCK ? fetchTaskPlanMock : fetchTaskPlanHttp;
export const fetchPlanByAnalysis = USE_MOCK ? fetchPlanByAnalysisMock : fetchPlanByAnalysisHttp;

export type { AnalyzeResult, RecommendationPlan, TaskAnalysisListItemDTO, TaskPlan, TaskPlanDTO };
