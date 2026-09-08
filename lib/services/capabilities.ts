/**
 * Capabilities Service — 入口（双模式：Mock / HTTP）
 *
 * composeCapabilityViews 为模式无关纯函数，统一从 ./compose 导出。
 */
import * as mock from "./mock/capabilities";
import * as http from "./http/capabilities";
import { USE_MOCK } from "./mode";

export const fetchCapabilityDefinitions = USE_MOCK
  ? mock.fetchCapabilityDefinitions
  : http.fetchCapabilityDefinitions;
export const fetchAgentCapabilities = USE_MOCK
  ? mock.fetchAgentCapabilities
  : http.fetchAgentCapabilities;
export const fetchAllAgentCapabilities = USE_MOCK
  ? mock.fetchAllAgentCapabilities
  : http.fetchAllAgentCapabilities;
export const attachCapability = USE_MOCK ? mock.attachCapability : http.attachCapability;
export const setCapabilityEnabled = USE_MOCK
  ? mock.setCapabilityEnabled
  : http.setCapabilityEnabled;
export const detachCapability = USE_MOCK ? mock.detachCapability : http.detachCapability;
export const createCapability = USE_MOCK ? mock.createCapability : http.createCapability;
export const updateCapability = USE_MOCK ? mock.updateCapability : http.updateCapability;
export const archiveCapability = USE_MOCK ? mock.archiveCapability : http.archiveCapability;
export const restoreCapability = USE_MOCK ? mock.restoreCapability : http.restoreCapability;

export { composeCapabilityViews } from "./compose";
export type { AgentCapabilityView } from "./compose";
