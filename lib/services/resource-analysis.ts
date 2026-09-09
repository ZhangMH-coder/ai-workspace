/**
 * Resource Intelligence Service 双模式入口（Mock/Real）
 * 与既有 lib/services 双模式文件同构；Mock 只切换前端数据流，API 端点始终连 SQLite。
 */
import { USE_MOCK } from "./mode";
import {
  fetchAnalysisStatusMock,
  fetchCapabilityIndexMock,
  fetchResourceInsightMock,
  matchResourcesForTaskMock,
  runAnalysisMock,
} from "./mock/resource-analysis";
import {
  fetchAnalysisStatus as fetchAnalysisStatusHttp,
  fetchCapabilityIndex as fetchCapabilityIndexHttp,
  fetchResourceInsight as fetchResourceInsightHttp,
  matchResourcesForTask as matchResourcesForTaskHttp,
  runAnalysis as runAnalysisHttp,
} from "@/lib/api/resource-analysis";

export const fetchAnalysisStatus = USE_MOCK ? fetchAnalysisStatusMock : fetchAnalysisStatusHttp;
export const runAnalysis = USE_MOCK ? runAnalysisMock : runAnalysisHttp;
export const fetchResourceInsight = USE_MOCK ? fetchResourceInsightMock : fetchResourceInsightHttp;
export const fetchCapabilityIndex = USE_MOCK ? fetchCapabilityIndexMock : fetchCapabilityIndexHttp;
export const matchResourcesForTask = USE_MOCK ? matchResourcesForTaskMock : matchResourcesForTaskHttp;
