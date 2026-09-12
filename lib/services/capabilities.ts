/**
 * Capabilities Service — 入口（仅 Real：HTTP + SQLite）
 *
 * composeCapabilityViews 为模式无关纯函数，统一从 ./compose 导出。
 */
export {
  fetchCapabilityDefinitions,
  fetchAgentCapabilities,
  fetchAllAgentCapabilities,
  attachCapability,
  setCapabilityEnabled,
  detachCapability,
  createCapability,
  updateCapability,
  archiveCapability,
  restoreCapability,
} from "./http/capabilities";

export { composeCapabilityViews } from "./compose";
export type { AgentCapabilityView } from "./compose";