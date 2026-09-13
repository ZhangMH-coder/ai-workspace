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
  /** S1.53：多端点列表（Key 仅掩码） */
  endpoints: LlmEndpointDTO[];
}

/** S1.53：命名端点 */
export interface LlmEndpointDTO {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  keyConfigured: boolean;
  keyMasked: string | null;
  /** true=当前生效（默认端点） */
  isDefault: boolean;
  /** 密文存在但无法解密（换机/换用户），需重新填写 Key */
  keyUndecryptable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLlmEndpointInput {
  name: string;
  baseUrl: string;
  model?: string;
  apiKey?: string;
}

export interface UpdateLlmEndpointInput {
  name?: string;
  baseUrl?: string;
  model?: string;
  /** 传非空=更新 Key；传空字符串=清空 Key；未传=不改 */
  apiKey?: string;
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
  /** 端点可用模型列表（连接成功后顺带拉取；失败为 null） */
  models?: string[] | null;
}

export const fetchLLMProviderConfig = () =>
  http.get<LlmProviderConfigDTO>("/ai/provider-config");

export const saveLLMProviderConfig = (input: SaveLlmProviderInput) =>
  http.put<LlmProviderConfigDTO>("/ai/provider-config", input);

export const clearLLMProviderConfig = () =>
  http.del<LlmProviderConfigDTO>("/ai/provider-config");

export const testLLMProviderConfig = () =>
  http.post<TestLLMResultDTO>("/ai/provider-config/test");

/* ---------------- S1.53：端点 CRUD / 切换 / 测试 ---------------- */

export const createLLMEndpoint = (input: CreateLlmEndpointInput) =>
  http.post<{ endpoint: LlmEndpointDTO }>("/ai/provider-config/endpoints", input);

export const updateLLMEndpoint = (id: string, input: UpdateLlmEndpointInput) =>
  http.put<{ endpoint: LlmEndpointDTO }>(`/ai/provider-config/endpoints/${id}`, input);

export const deleteLLMEndpoint = (id: string) =>
  http.del<{ deleted: boolean }>(`/ai/provider-config/endpoints/${id}`);

export const activateLLMEndpoint = (id: string) =>
  http.post<{ endpoint: LlmEndpointDTO }>(`/ai/provider-config/endpoints/${id}/activate`);

export const testLLMEndpoint = (id: string) =>
  http.post<{ result: TestLLMResultDTO }>(`/ai/provider-config/endpoints/${id}/test`);

/** 可用模型列表（S1.30：真实拉取当前生效端点的 /models；未配置时 models=null） */
export interface AvailableModelsDTO {
  models: string[] | null;
  model: string;
  configured: boolean;
}

export const fetchAvailableModels = () => http.get<AvailableModelsDTO>("/ai/models");

/** 系统提示词润色（S1.44）：返回润色后正文 + 模型 + 时间 */
export interface PolishPromptDTO {
  polished: string;
  model: string;
  polishedAt: string;
}

export const polishSystemPrompt = (prompt: string) =>
  http.post<PolishPromptDTO>("/ai/polish-prompt", { prompt });
