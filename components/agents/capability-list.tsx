"use client";

/**
 * Agent 已装配能力（只读展示，Phase 3）
 *
 * 基于 Capability 数据模型渲染：
 * - 通过 CapabilityService 拉取「定义资产 + 装配关系」
 * - 按类型分组（map 驱动，不硬编码四个模块的业务逻辑）
 * - 只读：装配的增删改由未来能力库/编辑入口负责（Phase 3 不做）
 */
import { useEffect, useState } from "react";
import { BookOpenText, BrainCircuit, Puzzle, ScrollText, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  composeCapabilityViews,
  fetchAgentCapabilities,
  fetchCapabilityDefinitions,
} from "@/lib/services/capabilities";
import {
  CAPABILITY_TYPE_OPTIONS,
  type CapabilityType,
} from "@/lib/types";

const TYPE_ICONS: Record<CapabilityType, LucideIcon> = {
  skill: Puzzle,
  memory: BrainCircuit,
  rule: ScrollText,
  tool: BookOpenText,
};

export function CapabilityList({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Record<string, ReturnType<typeof composeCapabilityViews>[string]>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [definitions, assemblies] = await Promise.all([
          fetchCapabilityDefinitions(),
          fetchAgentCapabilities(agentId),
        ]);
        if (cancelled) return;
        const composed = composeCapabilityViews(definitions, assemblies);
        setGroups(composed);
        setTotal(assemblies.length);
      } catch {
        if (!cancelled) setGroups({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Puzzle className="h-5 w-5 text-ink-3" />
        <p className="text-[13px] text-ink-2">该 Agent 尚未装配能力</p>
        <p className="text-[12px] text-ink-3">能力装配入口将在后续阶段开放</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {CAPABILITY_TYPE_OPTIONS.map((type) => {
        const items = groups[type.id];
        if (!items || items.length === 0) return null;
        const Icon = TYPE_ICONS[type.id];
        const enabledCount = items.filter((v) => v.assembly.enabled).length;
        return (
          <div key={type.id}>
            <div className="flex items-center gap-2 px-2">
              <Icon className="h-3.5 w-3.5 text-ink-3" />
              <h4 className="flex-1 text-[12.5px] font-semibold text-ink">
                {type.label}
              </h4>
              <span className="text-[11.5px] text-ink-3">
                {enabledCount}/{items.length} 启用
              </span>
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5">
              {items.map(({ definition, assembly }) => (
                <div
                  key={assembly.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      assembly.enabled ? "bg-success" : "bg-ink-3/60"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink">
                      {definition.name}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-3">
                      {definition.description}
                    </p>
                  </div>
                  {!assembly.enabled && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                    >
                      已停用
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
