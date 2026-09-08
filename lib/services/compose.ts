/**
 * 装配视图组装（纯函数，模式无关）
 *
 * 将「定义资产 + 装配关系」组装为按类型分组的只读视图。
 * - archived 的定义仍正常展示（软删除：资产保留，装配关系保留并携带 lifecycle 供 UI 标记）；
 * - 仅当 Definition 完全不存在（悬空引用）时跳过，避免脏数据进入视图。
 */
import type { AgentCapability, CapabilityDefinition } from "@/lib/types";

export interface AgentCapabilityView {
  definition: CapabilityDefinition;
  assembly: AgentCapability;
}

export function composeCapabilityViews(
  definitions: CapabilityDefinition[],
  assemblies: AgentCapability[]
): Record<string, AgentCapabilityView[]> {
  const defById = new Map(definitions.map((d) => [d.id, d]));
  const grouped: Record<string, AgentCapabilityView[]> = {};
  for (const assembly of assemblies) {
    const definition = defById.get(assembly.capabilityId);
    if (!definition) continue; // 仅悬空引用容错跳过
    (grouped[definition.type] ??= []).push({ definition, assembly });
  }
  return grouped;
}
