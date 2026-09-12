/**
 * LLMProvider（S1.30 真实执行 Provider）
 *
 * 实现 RuntimeProvider 接口：execute 经 lib/ai/chatCompletion 真实调用
 * 当前生效的 LLM 配置（Settings 手动 > 环境变量 > 本机静态发现 > 内置默认）。
 * 配置由调用方（db/service）注入 resolveConfig，本模块不接触数据库 / 环境细节。
 *
 * 约束：Service / Store / UI 不得直接引用本实现，只能经 Runtime 接口消费。
 * stream() 仅保留契约签名（不进入执行路径、不建 SSE）。
 */
import { chatCompletion } from "@/lib/ai/client";
import type { LLMConfig } from "@/lib/ai/config";
import type {
  ProviderExecuteRequest,
  ProviderExecuteResult,
  ProviderStreamChunk,
  RuntimeProvider,
} from "./contracts";

export function createLLMProvider(opts: {
  resolveConfig: () => LLMConfig;
}): RuntimeProvider {
  return {
    id: "llm",

    async supportedModels() {
      return [];
    },

    async execute(req: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
      const started = Date.now();
      const config = opts.resolveConfig();
      if (!config.apiKey.trim()) {
        return {
          text: "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          durationMs: 0,
          error: {
            code: "provider_unavailable",
            message: "未配置 LLM API Key（Settings → AI Provider）",
            layer: "provider",
            recoverable: true,
          },
        };
      }
      if (!config.baseUrl.trim()) {
        return {
          text: "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          durationMs: 0,
          error: {
            code: "provider_unavailable",
            message: "未配置 LLM Base URL（Settings → AI Provider）",
            layer: "provider",
            recoverable: true,
          },
        };
      }

      const system = req.messages.find((m) => m.role === "system")?.content ?? "";
      const user = req.messages.find((m) => m.role === "user")?.content ?? "";

      try {
        const res = await chatCompletion(
          {
            temperature: req.temperature,
            maxTokens: req.maxTokens,
            timeoutMs: req.timeoutMs,
            messages: [
              ...(system.trim() ? [{ role: "system" as const, content: system }] : []),
              { role: "user" as const, content: user },
            ],
          },
          { ...config, model: req.model || config.model }
        );
        const durationMs = Date.now() - started;
        const usage = res.usage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        return {
          text: res.text,
          usage,
          durationMs,
          raw: { provider: "llm", model: req.model, messageCount: req.messages.length },
        };
      } catch (e) {
        const durationMs = Date.now() - started;
        const code =
          e instanceof Error && "code" in e
            ? String((e as { code: unknown }).code)
            : "";
        return {
          text: "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          durationMs,
          error: {
            code: code === "TIMEOUT" ? "provider_timeout" : "provider_unavailable",
            message: e instanceof Error ? e.message : String(e),
            layer: "provider",
            recoverable: true,
          },
        };
      }
    },

    async *stream(_req: ProviderExecuteRequest): AsyncGenerator<ProviderStreamChunk> {
      void _req;
      throw new Error("[runtime] llm provider stream() 未实现：S1.30 范围外");
    },

    costOf() {
      return undefined; // 成本模型预留扩展位，本阶段不落库
    },
  };
}
