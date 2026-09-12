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

export interface ModelInfo {
  id: string;
  ownedBy?: string;
}

/** 非对话模型关键词（拉取模型列表时过滤，避免把 embedding/图片/语音模型塞进选择器） */
const NON_CHAT_MODEL_HINTS = [
  "embedding",
  "image",
  "audio",
  "tts",
  "realtime",
  "whisper",
  "moderation",
  "dall-e",
];

/**
 * 拉取端点可用模型列表（OpenAI 兼容 GET /models）。
 * 失败返回 null（不抛错）：模型列表拉取失败不应破坏连接测试结果，前端可提示手动输入。
 */
export async function listModels(
  config: LLMConfig,
  timeoutMs = 8_000
): Promise<string[] | null> {
  if (!config.apiKey.trim() || !config.baseUrl.trim()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${config.apiKey.trim()}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { id?: string; owned_by?: string }[] };
    const ids = (j?.data ?? [])
      .map((m) => m?.id)
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .filter((id) => !NON_CHAT_MODEL_HINTS.some((h) => id.toLowerCase().includes(h)));
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
