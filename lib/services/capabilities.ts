/**
 * Capability Service（Phase 3）
 *
 * 数据边界设计：
 * - `CapabilityDefinition` 是能力「资产库」，与 Agent 解耦，可被多个 Agent 复用；
 * - `AgentCapability` 是「装配关系」（多对多中介），只记录某 Agent 装了什么、是否启用；
 * - 界面层只依赖本文件提供的 async 函数与 lib/types 契约，
 *   未来接入真实 API 时仅替换本文件实现，store/组件零改动。
 *
 * 演进路径（Phase 3 暂不实现，契约已预留）：
 * - 管理 Definition 资产：create / update / archive CapabilityDefinition
 * - 编辑装配：attachCapability / detachCapability / setCapabilityEnabled
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
