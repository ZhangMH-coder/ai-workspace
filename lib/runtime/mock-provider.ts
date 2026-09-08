/**
 * MockProvider（P5-2 唯一 Provider）
 *
 * 实现 RuntimeProvider 接口，输出与 P4-2~P4-4 演示桩同分布（86% 成功、
 * 8s~230s、900~38k total tokens），保证统计口径与历史基线一致。
 *
 * 约束：Service / Store / UI 不得直接引用本实现，只能经 Runtime 接口消费。
 * stream() 仅保留契约签名（P5-2 不进入执行路径、不建 SSE）。
 */
import type {
  ProviderExecuteRequest,
  ProviderExecuteResult,
  ProviderStreamChunk,
  RuntimeProvider,
  TokenUsage,
} from "./contracts";

const MOCK_SUCCESS_RATE = 0.86;
const MOCK_MIN_DURATION_MS = 8_000;
const MOCK_MAX_DURATION_MS = 230_000;
const MOCK_MIN_TOKENS = 900;
const MOCK_MAX_TOKENS = 38_000;

function randomBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

function splitTokens(total: number): TokenUsage {
  const inputTokens = Math.max(1, Math.floor(total * 0.35));
  const outputTokens = total - inputTokens;
  return { inputTokens, outputTokens, totalTokens: total };
}

export const mockProvider: RuntimeProvider = {
  id: "mock",

  async supportedModels() {
    return ["doubao-pro", "doubao-lite", "gpt-4o", "claude-sonnet"];
  },

  async execute(req: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    // 模拟网络往返（与演示桩行为一致：调用方在等待期内看到 queued/running）
    await new Promise((resolve) => setTimeout(resolve, 60 + Math.floor(Math.random() * 240)));

    // P5-1 §12：MockProvider 复用演示桩语义 —— 86% 成功 / 14% 失败
    // （与 P4-2~P4-4 的 runAgent 随机分支同分布，保证统计口径可对照）
    const durationMs = randomBetween(MOCK_MIN_DURATION_MS, MOCK_MAX_DURATION_MS);
    const usage = splitTokens(randomBetween(MOCK_MIN_TOKENS, MOCK_MAX_TOKENS));
    const success = Math.random() <= MOCK_SUCCESS_RATE;
    if (!success) {
      return {
        text: "",
        usage,
        durationMs,
        error: {
          code: "provider_unavailable",
          message: "Mock 上游服务超时，已记录日志",
          layer: "provider",
          recoverable: true,
        },
        raw: { provider: "mock", model: req.model, messageCount: req.messages.length },
      };
    }

    return {
      text: "（Mock 输出）已完成一次执行，结果已汇总。",
      usage,
      durationMs,
      raw: { provider: "mock", model: req.model, messageCount: req.messages.length },
    };
  },

  async *stream(_req: ProviderExecuteRequest): AsyncGenerator<ProviderStreamChunk> {
    void _req;
    // P5-2 禁止进入执行路径：仅保留契约签名，调用即抛错（防御性）
    throw new Error("[runtime] mock provider stream() 未实现：P5-2 范围外");
  },

  costOf() {
    return undefined; // P5-1 §10：成本模型预留扩展位，本阶段不落库
  },
};
