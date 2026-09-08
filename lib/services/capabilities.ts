/**
 * Capability Service（Phase 3）
 *
 * 数据边界设计：
 * - `CapabilityDefinition` 是能力「资产库」，与 Agent 解耦，可被多个 Agent 复用；
 * - `AgentCapability` 是「装配关系」（多对多中介），只记录某 Agent 装了什么、是否启用；
 * - 界面层只依赖本文件提供的 async 函数与 lib/types 契约，
 *   未来接入真实 API 时仅替换本文件实现，store/组件零改动。
 *
 * 写操作契约（贴近未来 REST 语义，Phase 3 第二阶段已落地）：
 * - attachCapability(input)            → POST /agent-capabilities
 * - setCapabilityEnabled(input)        → PATCH /agent-capabilities/:id
 * - detachCapability(id)               → DELETE /agent-capabilities/:id
 * - 演进预留（未实现）：管理 Definition 资产 create / update / archive
 */
import {
  seedAgentCapabilities,
  seedCapabilityDefinitions,
} from "@/lib/mock-data/seed";
import type { AgentCapability, CapabilityDefinition } from "@/lib/types";

const LATENCY_MS = 220;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** 获取全部能力定义（资产库） */
export async function fetchCapabilityDefinitions(): Promise<CapabilityDefinition[]> {
  await delay(LATENCY_MS);
  return seedCapabilityDefinitions.map((d) => ({ ...d }));
}

/** 获取指定 Agent 的装配关系列表 */
export async function fetchAgentCapabilities(
  agentId: string
): Promise<AgentCapability[]> {
  await delay(LATENCY_MS);
  return seedAgentCapabilities
    .filter((ac) => ac.agentId === agentId)
    .map((ac) => ({ ...ac }));
}

/* ---------- 写操作（Mock：只做往返与实体构造，不持有状态；落地唯一入口是 Store actions） ---------- */

/** 装配一个能力到 Agent（默认启用）。重复装配由调用方幂等处理。 */
export async function attachCapability(input: {
  agentId: string;
  capabilityId: string;
}): Promise<AgentCapability> {
  await delay(LATENCY_MS);
  return {
    id: uid("ac"),
    agentId: input.agentId,
    capabilityId: input.capabilityId,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
}

/** 启用 / 停用某个装配关系，返回服务器确认的字段 */
export async function setCapabilityEnabled(input: {
  id: string;
  enabled: boolean;
}): Promise<{ id: string; enabled: boolean }> {
  await delay(LATENCY_MS);
  return { id: input.id, enabled: input.enabled };
}

/** 解绑：删除装配关系 */
export async function detachCapability(id: string): Promise<void> {
  await delay(LATENCY_MS);
  void id;
}

/* ---------- 装配视图组装（纯函数，供只读展示） ---------- */

export interface AgentCapabilityView {
  definition: CapabilityDefinition;
  assembly: AgentCapability;
}

/**
 * 将「定义资产 + 装配关系」组装为按类型分组的只读视图。
 * 界面层拿到的是已解析的视图，不直接触碰两张表。
 */
export function composeCapabilityViews(
  definitions: CapabilityDefinition[],
  assemblies: AgentCapability[]
): Record<string, AgentCapabilityView[]> {
  const defById = new Map(definitions.map((d) => [d.id, d]));
  const grouped: Record<string, AgentCapabilityView[]> = {};
  for (const assembly of assemblies) {
    const definition = defById.get(assembly.capabilityId);
    if (!definition) continue; // 悬空引用容错：Definition 已归档时跳过
    (grouped[definition.type] ??= []).push({ definition, assembly });
  }
  return grouped;
}
