/**
 * Resource Intelligence API Client（Phase 2）
 * 与既有 API client 同构：http 请求 → DTO → mappers → Domain（UI 只消费 Domain）
 */
import { http } from "./client";
import {
  toAnalysisRunResult,
  toAnalysisStatusSummary,
  toCapabilityIndex,
  toResourceInsight,
  toTaskMatchResult,
} from "./mappers";
import type {
  AnalysisRunResultDTO,
  AnalysisStatusSummaryDTO,
  CapabilityIndexEntryDTO,
  ResourceInsightDTO,
  TaskMatchResultDTO,
} from "./dto";
import type {
  AnalysisRunResult,
  AnalysisStatusSummary,
  CapabilityIndexEntry,
  ResourceInsight,
  TaskMatchResult,
} from "@/lib/types";

export interface ResourceAnalysisQuery {
  task?: string;
}

export async function fetchAnalysisStatus(): Promise<AnalysisStatusSummary> {
  const dto = await http.get<AnalysisStatusSummaryDTO>("/api/v1/resource-analysis/status");
  return toAnalysisStatusSummary(dto);
}

export async function runAnalysis(body?: {
  force?: boolean;
  resourceIds?: string[];
}): Promise<AnalysisRunResult> {
  const dto = await http.post<AnalysisRunResultDTO>("/api/v1/resource-analysis/run", body ?? {});
  return toAnalysisRunResult(dto);
}

export async function fetchResourceInsight(resourceId: string): Promise<ResourceInsight> {
  const dto = await http.get<ResourceInsightDTO>(
    `/api/v1/resource-analysis/resources/${encodeURIComponent(resourceId)}`
  );
  return toResourceInsight(dto);
}

export async function fetchCapabilityIndex(): Promise<CapabilityIndexEntry[]> {
  const dto = await http.get<CapabilityIndexEntryDTO[]>("/api/v1/resource-capabilities");
  return toCapabilityIndex(dto);
}

export async function matchResourcesForTask(task: string): Promise<TaskMatchResult> {
  const dto = await http.get<TaskMatchResultDTO>(
    `/api/v1/resource-capabilities/match?task=${encodeURIComponent(task)}`
  );
  return toTaskMatchResult(dto);
}
