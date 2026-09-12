/**
 * Agents Service — HTTP 实现（P4-2c）
 *
 * 与 Mock 实现同名函数契约（签名/返回类型不变），Store/组件零改动。
 * 返回 Domain（经 mappers 转换），UI 不依赖 DTO。
 */
import { http } from "@/lib/api/client";
import type { PageDTO, AgentDTO, AgentRunDTO } from "@/lib/api/dto";
import { toAgent, toAgentRun } from "@/lib/api/mappers";
import type { Agent, AgentRun, NewAgentInput } from "@/lib/types";

export async function fetchAgents(): Promise<Agent[]> {
  const page = await http.get<PageDTO<AgentDTO>>("/agents?pageSize=100");
  return page.items.map(toAgent);
}

/** 某 Agent 的运行历史明细（详情页场景；分页有界，统计不依赖此数据） */
export async function fetchAgentRuns(agentId: string): Promise<AgentRun[]> {
  const page = await http.get<PageDTO<AgentRunDTO>>(
    `/agents/${encodeURIComponent(agentId)}/runs?pageSize=200&sort=startedAt:desc`
  );
  return page.items.map(toAgentRun);
}

export async function createAgent(input: NewAgentInput): Promise<Agent> {
  const dto = await http.post<AgentDTO>("/agents", {
    name: input.name.trim(),
    description: input.description.trim(),
    model: input.model,
    systemPrompt: input.systemPrompt.trim(),
  });
  return toAgent(dto);
}

/** 触发运行（S1.30 起服务端真实 LLM 执行；input 为给 Agent 的指令；agentName 供 Mock 摘要使用，HTTP 实现忽略） */
export async function runAgent(
  agentId: string,
  agentName: string,
  input?: string
): Promise<AgentRun> {
  void agentName; // 服务端生成摘要，无需客户端名称
  const dto = await http.post<AgentRunDTO>(`/agents/${encodeURIComponent(agentId)}/runs`, {
    input: input ?? "",
  });
  return toAgentRun(dto);
}
