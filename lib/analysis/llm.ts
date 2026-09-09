/**
 * LLMAnalyzer —— 契约桩（Phase 2 不注册、不执行）
 *
 * 仅定义未来真实 LLM 分析器的契约形态：实现 AnalysisProvider 接口，
 * 输入 / 输出与 HeuristicAnalyzer 完全一致（zod 校验同一 schema）。
 * Phase 2 中调用它会返回 failed（PROVIDER_NOT_AVAILABLE），不接真实 LLM。
 */
import type { AnalysisInput, AnalysisOutcome, AnalysisProvider } from "./types";

export const llmAnalyzer: AnalysisProvider = {
  id: "llm-v1",
  strategy: "llm",
  analyze(_input: AnalysisInput): AnalysisOutcome {
    void _input;
    return {
      status: "failed",
      summary: "LLM 分析器未在本阶段接入",
      capabilities: [],
      errorCode: "PROVIDER_NOT_AVAILABLE",
      errorMessage: "Phase 2 仅提供 HeuristicAnalyzer；LLMAnalyzer 为契约桩，未注册。",
    };
  },
};
