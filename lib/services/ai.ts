/**
 * AI Provider 配置 Service 双模式入口（S1.20）
 */
import { USE_MOCK } from "./mode";
import {
  clearLLMProviderConfigMock,
  fetchLLMProviderConfigMock,
  saveLLMProviderConfigMock,
  testLLMProviderConfigMock,
} from "./mock/ai";
import {
  clearLLMProviderConfig as clearLLMProviderConfigHttp,
  fetchLLMProviderConfig as fetchLLMProviderConfigHttp,
  saveLLMProviderConfig as saveLLMProviderConfigHttp,
  testLLMProviderConfig as testLLMProviderConfigHttp,
} from "@/lib/api/ai";

export const fetchLLMProviderConfig = USE_MOCK
  ? fetchLLMProviderConfigMock
  : fetchLLMProviderConfigHttp;
export const saveLLMProviderConfig = USE_MOCK
  ? saveLLMProviderConfigMock
  : saveLLMProviderConfigHttp;
export const clearLLMProviderConfig = USE_MOCK
  ? clearLLMProviderConfigMock
  : clearLLMProviderConfigHttp;
export const testLLMProviderConfig = USE_MOCK
  ? testLLMProviderConfigMock
  : testLLMProviderConfigHttp;
