/**
 * Task Intelligence Service 双模式入口（Mock/Real）
 * 与既有 lib/services 双模式文件同构：Mock 只切换前端数据流，API 端点始终连 SQLite。
 */
import { USE_MOCK } from "./mode";
import {
  analyzeTaskMock,
  fetchTaskAnalysisMock,
  fetchTaskAnalysesMock,
} from "./mock/task-intelligence";
import {
  analyzeTask as analyzeTaskHttp,
  fetchTaskAnalysis as fetchTaskAnalysisHttp,
  fetchTaskAnalyses as fetchTaskAnalysesHttp,
  type AnalyzeResult,
} from "@/lib/api/task-intelligence";
import type { RecommendationPlan } from "@/lib/task-intelligence";
import type { TaskAnalysisListItemDTO } from "@/lib/api/task-intelligence";

export const analyzeTask = USE_MOCK ? analyzeTaskMock : analyzeTaskHttp;
export const fetchTaskAnalyses = USE_MOCK ? fetchTaskAnalysesMock : fetchTaskAnalysesHttp;
export const fetchTaskAnalysis = USE_MOCK ? fetchTaskAnalysisMock : fetchTaskAnalysisHttp;

export type { AnalyzeResult, RecommendationPlan, TaskAnalysisListItemDTO };
