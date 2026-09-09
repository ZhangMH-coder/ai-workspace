/**
 * Task Intelligence —— 编排入口（Assembler / orchestrator）
 *
 * 流水线：TaskParser → TaskDecomposer → RequirementExtractor → CapabilityRetriever → Reranker。
 * 只负责「选什么」：输出 RecommendationPlan；不调用 Runtime、不产生执行语义。
 *
 * 幂等策略（由调用方 service 负责落库）：analyze 为纯计算，
 * fingerprint 判定与历史保留在 db/service.analyzeTask 中处理。
 */
import { decomposeTask } from "./decomposer";
import { extractRequirements } from "./extractor";
import { parseTaskType } from "./parser";
import { rerankAndAssemble } from "./reranker";
import { retrieveCapabilities } from "./retriever";
import {
  TASK_ANALYZER_VERSION,
  type CapabilityRequirement,
  type RecommendationPlan,
  type RetrievableCapability,
} from "./types";

export interface AnalyzeOptions {
  task: string;
  /** 当前有效能力标签（来自真实 ResourceCapability，调用方注入） */
  capabilities: RetrievableCapability[];
}

/** 组装总述（推断文本，基于任务类型与统计） */
function buildSummary(
  task: string,
  type: string,
  requirements: CapabilityRequirement[],
  recommendationCount: number
): string {
  const reqDesc = requirements.map((r) => r.derivedFrom).join("、");
  return `任务「${task}」识别为「${type}」，拆解为 ${requirements.length} 个子任务（${reqDesc}），从真实能力索引中推荐 ${recommendationCount} 个候选资源。`;
}

/**
 * 执行一次任务分析（纯计算；调用方负责 fingerprint 幂等与落库）。
 * analysisId 由调用方传入（重复分析复用已有记录 id）。
 */
export function analyzeTask(
  options: AnalyzeOptions,
  analysisId: string
): RecommendationPlan {
  const { task, capabilities } = options;
  const { type, signals } = parseTaskType(task);
  const subtasks = decomposeTask(task);
  const requirements = extractRequirements(subtasks);
  // 类型信号计入需求关键词（增强检索，通用信号非测试词）
  const effectiveRequirements = requirements.map((r, i) => ({
    ...r,
    keywords: [...r.keywords, ...(i === 0 ? signals : [])],
  }));
  const grouped = effectiveRequirements.map((requirement) => ({
    requirement,
    items: retrieveCapabilities(requirement, capabilities, 6, task),
  }));
  const recommendations = rerankAndAssemble(effectiveRequirements, grouped);

  return {
    analysisId,
    task,
    taskType: type,
    summary: buildSummary(task, type, effectiveRequirements, recommendations.length),
    requirements: effectiveRequirements,
    recommendations,
    strategy: "heuristic",
    analyzerVersion: TASK_ANALYZER_VERSION,
  };
}
