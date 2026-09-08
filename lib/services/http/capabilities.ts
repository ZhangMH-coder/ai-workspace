/**
 * Capabilities Service — HTTP 实现（P4-2c）
 *
 * 同名函数契约；写操作全部走 REST，服务端执行业务规则
 * （归档装配校验 / 生命周期软删除 / 幂等），前端不再自行校验。
 */
import { http } from "@/lib/api/client";
import type {
  AgentCapabilityDTO,
  CapabilityDefinitionDTO,
  PageDTO,
} from "@/lib/api/dto";
import { toAgentCapability, toCapabilityDefinition } from "@/lib/api/mappers";
import type {
  AgentCapability,
  CapabilityDefinition,
  CapabilityLifecycle,
  NewCapabilityInput,
  UpdateCapabilityInput,
} from "@/lib/types";

export async function fetchCapabilityDefinitions(): Promise<CapabilityDefinition[]> {
  const page = await http.get<PageDTO<CapabilityDefinitionDTO>>(
    "/capability-definitions?pageSize=100"
  );
  return page.items.map(toCapabilityDefinition);
}

export async function fetchAgentCapabilities(agentId: string): Promise<AgentCapability[]> {
  const page = await http.get<PageDTO<AgentCapabilityDTO>>(
    `/agent-capabilities?agentId=${encodeURIComponent(agentId)}&pageSize=100`
  );
  return page.items.map(toAgentCapability);
}

export async function fetchAllAgentCapabilities(): Promise<AgentCapability[]> {
  const page = await http.get<PageDTO<AgentCapabilityDTO>>(
    "/agent-capabilities?pageSize=100"
  );
  return page.items.map(toAgentCapability);
}

export async function attachCapability(input: {
  agentId: string;
  capabilityId: string;
}): Promise<AgentCapability> {
  const dto = await http.post<AgentCapabilityDTO>("/agent-capabilities", input);
  return toAgentCapability(dto);
}

export async function setCapabilityEnabled(input: {
  id: string;
  enabled: boolean;
}): Promise<{ id: string; enabled: boolean }> {
  const dto = await http.patch<AgentCapabilityDTO>(
    `/agent-capabilities/${encodeURIComponent(input.id)}`,
    { enabled: input.enabled }
  );
  return { id: dto.id, enabled: dto.enabled };
}

export async function detachCapability(id: string): Promise<void> {
  await http.del(`/agent-capabilities/${encodeURIComponent(id)}`);
}

export async function createCapability(input: NewCapabilityInput): Promise<CapabilityDefinition> {
  const dto = await http.post<CapabilityDefinitionDTO>("/capability-definitions", input);
  return toCapabilityDefinition(dto);
}

export async function updateCapability(input: UpdateCapabilityInput): Promise<CapabilityDefinition> {
  const dto = await http.patch<CapabilityDefinitionDTO>(
    `/capability-definitions/${encodeURIComponent(input.id)}`,
    { name: input.name, description: input.description, type: input.type }
  );
  return toCapabilityDefinition(dto);
}

async function setLifecycle(id: string, lifecycle: CapabilityLifecycle): Promise<CapabilityDefinition> {
  const dto = await http.patch<CapabilityDefinitionDTO>(
    `/capability-definitions/${encodeURIComponent(id)}/lifecycle`,
    { lifecycle }
  );
  return toCapabilityDefinition(dto);
}

export async function archiveCapability(id: string): Promise<{ id: string; lifecycle: CapabilityLifecycle }> {
  const d = await setLifecycle(id, "archived");
  return { id: d.id, lifecycle: d.lifecycle };
}

export async function restoreCapability(id: string): Promise<{ id: string; lifecycle: CapabilityLifecycle }> {
  const d = await setLifecycle(id, "active");
  return { id: d.id, lifecycle: d.lifecycle };
}
