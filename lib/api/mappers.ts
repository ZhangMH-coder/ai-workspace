/**
 * DTO → Domain 映射（P4-2c）
 *
 * 隔离层：后端响应结构变化只影响本文件；Store/UI 永远消费 Domain。
 */
import type {
  Agent,
  AgentCapability,
  AgentRun,
  CapabilityDefinition,
  Project,
  ProjectAgent,
} from "@/lib/types";
import type {
  AgentCapabilityDTO,
  AgentDTO,
  AgentRunDTO,
  CapabilityDefinitionDTO,
  ProjectAgentDTO,
  ProjectDTO,
} from "./dto";

export function toAgent(d: AgentDTO): Agent {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    model: d.model as Agent["model"],
    status: d.status as Agent["status"],
    systemPrompt: d.systemPrompt,
    createdAt: d.createdAt,
    lastRunAt: d.lastRunAt,
  };
}

export function toAgentRun(d: AgentRunDTO): AgentRun {
  return {
    id: d.id,
    agentId: d.agentId,
    status: d.status as AgentRun["status"],
    summary: d.summary,
    durationMs: d.durationMs ?? 0,
    tokensUsed: d.tokensUsed,
    messages: d.messages,
    startedAt: d.startedAt,
    // 服务端保证运行完成必有完成时间；防御性兜底（未知时取开始时间）
    finishedAt: d.finishedAt ?? d.startedAt,
  };
}

export function toCapabilityDefinition(d: CapabilityDefinitionDTO): CapabilityDefinition {
  return {
    id: d.id,
    type: d.type,
    name: d.name,
    description: d.description,
    lifecycle: d.lifecycle,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function toAgentCapability(d: AgentCapabilityDTO): AgentCapability {
  return {
    id: d.id,
    agentId: d.agentId,
    capabilityId: d.capabilityId,
    enabled: d.enabled,
    createdAt: d.createdAt,
  };
}

export function toProject(d: ProjectDTO): Project {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    status: d.status as Project["status"],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function toProjectAgent(d: ProjectAgentDTO): ProjectAgent {
  return {
    id: d.id,
    projectId: d.projectId,
    agentId: d.agentId,
    addedAt: d.addedAt,
  };
}
