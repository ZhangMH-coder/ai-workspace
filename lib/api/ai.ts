/**
 * AI Provider 配置 API Client（S1.20）
 *
 * 与 /api/v1/ai/provider-config 对应。Key 只在写入时传输，读取一律只回显掩码。
 */
import { http } from "./client";

export type LlmConfigSource = "manual" | "env" | "hermes" | "default";

export interface LlmProviderEffectiveDTO {
  source: LlmConfigSource;
  baseUrl: string;
  model: string;
  keyConfigured: boolean;
  keyMasked: string | null;
  defaults: { baseUrl: string; model: string };
}

export interface LlmProviderConfigDTO {
  effective: LlmProviderEffectiveDTO;
  manual: { baseUrl: string; model: string; keyConfigured: boolean } | null;
}

export interface SaveLlmProviderInput {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

export interface TestLLMResultDTO {
  ok: boolean;
  latencyMs: number;
  model: string;
  source: LlmConfigSource;
  error?: string;
}

export const fetchLLMProviderConfig = () =>
  http.get<LlmProviderConfigDTO>("/ai/provider-config");

export const saveLLMProviderConfig = (input: SaveLlmProviderInput) =>
  http.put<LlmProviderConfigDTO>("/ai/provider-config", input);

export const clearLLMProviderConfig = () =>
  http.del<LlmProviderConfigDTO>("/ai/provider-config");

export const testLLMProviderConfig = () =>
  http.post<TestLLMResultDTO>("/ai/provider-config/test");
