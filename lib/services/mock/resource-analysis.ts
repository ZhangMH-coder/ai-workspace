/**
 * Mock 模式 Resource Intelligence 服务（真实空态，不伪造分析结果）
 * - status：结构化为 0 分布（总资源 0 —— 因为 Mock 不扫描任何真实资源）
 * - run：返回全 0 处理结果
 * - insight / index / match：空结果
 */
import { ApiError } from "@/lib/api/errors";
import type {
  AnalysisRunResult,
  AnalysisStatusSummary,
  CapabilityIndexEntry,
  ResourceInsight,
  TaskMatchResult,
} from "@/lib/types";

export async function fetchAnalysisStatusMock(): Promise<AnalysisStatusSummary> {
  return {
    totalResources: 0,
    analyzed: 0,
    pending: 0,
    failed: 0,
    expired: 0,
    capabilityCount: 0,
    lastRunAt: null,
    analyzerVersion: "heuristic-v1",
  };
}

export async function runAnalysisMock(): Promise<AnalysisRunResult> {
  return { processed: 0, skipped: 0, analyzed: 0, failed: 0 };
}

export async function fetchResourceInsightMock(): Promise<ResourceInsight> {
  throw new ApiError(404, { code: "NOT_FOUND", message: "Mock 模式无真实资源，无分析结果" });
}

export async function fetchCapabilityIndexMock(): Promise<CapabilityIndexEntry[]> {
  return [];
}

export async function matchResourcesForTaskMock(task: string): Promise<TaskMatchResult> {
  return { task, matches: [] };
}
