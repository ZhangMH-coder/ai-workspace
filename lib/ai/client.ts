/**
 * LLM 客户端（OpenAI 兼容 chat/completions）
 *
 * 配置由调用方显式传入（db/service.getEffectiveLLMConfig() 负责解析优先级），
 * 本模块不直接读环境 / 数据库。不做流式；超时默认 25s；错误统一为 AiError（code 分支）。
 */
import type { LLMConfig } from "./config";
import { AiError } from "./errors";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  text: string;
  model: string;
}

export async function chatCompletion(
  opts: ChatOptions,
  config: LLMConfig
): Promise<ChatResult> {
  if (!config.apiKey.trim()) {
    throw new AiError(
      "CONFIG_MISSING",
      "未配置 LLM API Key（可在 Settings 的 AI Provider 中填写，或通过环境变量 / Hermes 自动发现）"
    );
  }
  if (!config.baseUrl.trim()) {
    throw new AiError("CONFIG_MISSING", "未配置 LLM Base URL");
  }

  const {
    messages,
    temperature = 0.3,
    maxTokens = 1024,
    timeoutMs = 25_000,
  } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        detail = j?.error?.message ?? "";
      } catch {
        // 忽略响应体解析失败
      }
      throw new AiError(
        "API_ERROR",
        `LLM API 错误 ${res.status}${detail ? `：${detail}` : ""}`,
        res.status
      );
    }

    const j = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = j?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new AiError("PARSE_ERROR", "LLM 返回内容为空");
    }
    return { text: text.trim(), model: config.model };
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new AiError("TIMEOUT", `LLM 请求超时（${timeoutMs}ms）`);
    }
    throw new AiError(
      "NETWORK",
      `LLM 网络错误：${e instanceof Error ? e.message : String(e)}`
    );
  } finally {
    clearTimeout(timer);
  }
}
