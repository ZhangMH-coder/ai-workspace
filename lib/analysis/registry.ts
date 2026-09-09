/**
 * 分析器注册表：MVP 只注册 HeuristicAnalyzer
 *
 * LLMAnalyzer 虽实现契约，但不注册（未来接入真实 LLM 时再注册并升级 analyzerVersion）。
 */
import type { AnalysisProvider } from "./types";
import { heuristicAnalyzer } from "./heuristic";

export const ANALYZERS: AnalysisProvider[] = [heuristicAnalyzer];

/** 当前分析器版本（写入 resource_analysis.analyzerVersion，升级触发全量重分析） */
export const CURRENT_ANALYZER_VERSION = heuristicAnalyzer.id;

export function getAnalyzer(id?: string): AnalysisProvider {
  if (!id) return ANALYZERS[0];
  const found = ANALYZERS.find((a) => a.id === id);
  if (!found) throw new Error(`ANALYZER_NOT_FOUND: ${id}`);
  return found;
}
