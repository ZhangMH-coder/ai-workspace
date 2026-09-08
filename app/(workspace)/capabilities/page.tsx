"use client";

/**
 * Capability Asset Hub（Phase 3 第三阶段，方案 A）
 *
 * 统一呈现 CapabilityDefinition 资产层：系统有哪些能力资产、类型、状态、被哪些 Agent 使用。
 * - 单一数据源：capabilityDefinitions + agentCapabilities + agents（与 Agent 详情装配管理同源）
 * - 统一信息架构：All / Skills / Memory / Rules / Tools（URL query 驱动，可分享可刷新）
 * - 四类能力共用同一数据模型与组件，不复制独立页面
 * - Definition 只读；状态为派生（使用中 / 未使用）
 */
import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Blocks, ChevronRight } from "lucide-react";

import { CapabilityTypeBadge } from "@/components/capabilities/capability-type-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CAPABILITY_TYPE_OPTIONS,
  type CapabilityType,
} from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

const FILTERS: { id: "all" | CapabilityType; label: string }[] = [
  { id: "all", label: "All" },
  ...CAPABILITY_TYPE_OPTIONS.map((t) => ({ id: t.id as CapabilityType, label: t.label })),
];

function isType(value: string | null): CapabilityType | null {
  return CAPABILITY_TYPE_OPTIONS.some((t) => t.id === value)
    ? (value as CapabilityType)
    : null;
}

export default function CapabilitiesPage() {
  return (
    <Suspense fallback={<CapabilitiesSkeleton />}>
      <CapabilitiesContent />
    </Suspense>
  );
}

function CapabilitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = isType(searchParams.get("type"));

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const definitions = useWorkspaceStore((s) => s.capabilityDefinitions);
  const agentCapabilities = useWorkspaceStore((s) => s.agentCapabilities);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const usedByCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const ac of agentCapabilities) {
      map.set(ac.capabilityId, (map.get(ac.capabilityId) ?? 0) + 1);
    }
    return map;
  }, [agentCapabilities]);

  const visible = useMemo(() => {
    const base = activeType
      ? definitions.filter((d) => d.type === activeType)
      : definitions;
    return [...base].sort((a, b) => {
      const typeOrder = (t: CapabilityType) =>
        CAPABILITY_TYPE_OPTIONS.findIndex((o) => o.id === t);
      return typeOrder(a.type) - typeOrder(b.type) || a.name.localeCompare(b.name, "zh");
    });
  }, [definitions, activeType]);

  if (!hydrated) return <CapabilitiesSkeleton />;

  const totalUsed = agentCapabilities.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="能力资产"
        description="系统全部能力定义：类型、状态与使用情况，点击查看被哪些 Agent 使用"
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-white/10 px-2.5 py-1 text-[12px] text-ink-3 sm:inline">
              {definitions.length} 个资产 · {totalUsed} 个装配
            </span>
          </div>
        }
      />

      {/* 类型筛选 */}
      <div
        role="tablist"
        aria-label="按类型筛选能力资产"
        className="flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-white/[0.03] p-1"
      >
        {FILTERS.map((f) => {
          const active = (f.id === "all" ? null : f.id) === activeType;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() =>
                router.push(f.id === "all" ? "/capabilities" : `/capabilities?type=${f.id}`)
              }
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                active
                  ? "bg-surface-2 text-ink shadow-sm"
                  : "text-ink-3 hover:bg-white/[0.04] hover:text-ink-2"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 资产列表 */}
      <Card className="overflow-hidden rounded-xl bg-surface-1">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Blocks className="h-6 w-6 text-ink-3" />
            <p className="text-[13.5px] text-ink-2">该类型暂无能力资产</p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {visible.map((d, i) => {
              const count = usedByCount.get(d.id) ?? 0;
              return (
                <li key={d.id}>
                  <Link
                    href={`/capabilities/${d.id}`}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50",
                      i > 0 && "border-t border-border/60"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {d.name}
                      </p>
                      <p className="hidden truncate text-[12px] text-ink-3 sm:block sm:max-w-[42%]">
                        {d.description}
                      </p>
                    </div>

                    <div className="hidden shrink-0 md:block">
                      <CapabilityTypeBadge type={d.type} />
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex items-center gap-1.5 text-[12px]",
                          count > 0 ? "text-ink-2" : "text-ink-3"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            count > 0 ? "bg-success" : "bg-ink-3/50"
                          )}
                          aria-hidden="true"
                        />
                        {count > 0 ? "使用中" : "未使用"}
                      </span>
                      <span className="hidden w-20 text-right text-[12px] tabular-nums text-ink-3 sm:block">
                        {count > 0 ? `${count} 个 Agent` : "—"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink-2" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CapabilitiesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-10 w-96 max-w-full rounded-lg" />
      <div className="space-y-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
