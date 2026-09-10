/**
 * Mock 前端数据源（方向调整 S0：删除全部演示假数据）
 *
 * 变更：seedAgents / seedCapabilityDefinitions / seedAgentCapabilities /
 *       seedProjects / seedProjectAgents / seedRuns 全部置空。
 * 理由：本产品只展示本机真实 AI 资源，零演示数据、零伪造。
 * 引用方保持导出名不变（lib/services/mock/* 零改动），Mock 模式为真实空态。
 */
import type {
  Agent,
  AgentCapability,
  AgentRun,
  CapabilityDefinition,
  Project,
  ProjectAgent,
} from "@/lib/types";

export const seedAgents: Agent[] = [];
export const seedCapabilityDefinitions: CapabilityDefinition[] = [];
export const seedAgentCapabilities: AgentCapability[] = [];
export const seedProjects: Project[] = [];
export const seedProjectAgents: ProjectAgent[] = [];
export const seedRuns: AgentRun[] = [];
