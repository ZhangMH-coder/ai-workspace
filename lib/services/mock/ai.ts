/**
 * AI Provider 配置 Mock（S1.20）
 *
 * Mock 模式不接入真实 LLM：读取返回空态（未配置），写操作 / 测试一律
 * ApiError(501, LLM_NOT_CONFIGURED)。保持「Mock 模式真实空态」，不伪造配置。
 */
import { ApiError } from "@/lib/api/errors";
import type {
  LlmProviderConfigDTO,
  SaveLlmProviderInput,
  TestLLMResultDTO,
} from "@/lib/api/ai";

const EMPTY: LlmProviderConfigDTO = {
  effective: {
    source: "default",
    baseUrl: "",
    model: "",
    keyConfigured: false,
    keyMasked: null,
    defaults: { baseUrl: "https://tokenrhythm.studio/v1", model: "deepseek-v4-flash-0731" },
  },
  manual: null,
};

export async function fetchLLMProviderConfigMock(): Promise<LlmProviderConfigDTO> {
  return EMPTY;
}

export async function saveLLMProviderConfigMock(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _input: SaveLlmProviderInput
): Promise<LlmProviderConfigDTO> {
  throw new ApiError(501, {
    code: "LLM_NOT_CONFIGURED",
    message: "Mock 模式不接入真实 LLM，配置不可用",
  });
}

export async function clearLLMProviderConfigMock(): Promise<LlmProviderConfigDTO> {
  return EMPTY;
}

export async function testLLMProviderConfigMock(): Promise<TestLLMResultDTO> {
  return {
    ok: false,
    latencyMs: 0,
    model: "",
    source: "default",
    error: "Mock 模式不接入真实 LLM，无法测试连接",
  };
}

/** 可用模型列表（Mock：真实空态，不伪造模型目录） */
export async function fetchAvailableModelsMock(): Promise<{
  models: null;
  model: string;
  configured: false;
}> {
  return { models: null, model: "", configured: false };
}
