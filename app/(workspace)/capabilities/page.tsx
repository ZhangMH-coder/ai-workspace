"use client";

/**
 * Capability Asset Hub（Phase 3 第四阶段：资产生命周期管理）
 *
 * 统一呈现 CapabilityDefinition 资产层：类型、生命周期状态、派生使用状态、被哪些 Agent 使用。
 * - 单一数据源：capabilityDefinitions + agentCapabilities（与 Asset Detail / Agent Detail / Picker 同源）
 * - 信息架构：All / Skills / Memory / Rules / Tools（URL query 驱动）
 * - 两维状态：生命周期（Active/Archived，落模型）+ 使用状态（Used/Unused，派生）
 * - 资产生命周期操作入口：新建（Dialog）；归档/恢复/编辑在资产详情页
 * - 低成本体验增强：本地搜索（名称/描述）+ 排序（名称 / 使用数），不改领域模型
 */
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Blocks, ChevronRight, Plus, Search } from "lucide-react";

import { CapabilityFormDialog } from "@/components/capabilities/capability-form-dialog";
import { CapabilityLifecycleBadge } from "@/components/capabilities/capability-lifecycle-badge";
import { CapabilityTypeBadge } from "@/components/capabilities/capability-type-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CAPABILITY_TYPE_OPTIONS,
  type CapabilityType,
} from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

const FILTERS: { id: "all" | CapabilityType; label: string }[] = [
  { id: "all", label: "All" },
  ...CAPABILITY_TYPE_OPTIONS.map((t) => ({
    id: t.id as CapabilityType,
    label: t.label,
  })),
];

type SortKey = "name" | "usage";

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

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [formOpen, setFormOpen] = useState(false);

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
    const q = query.trim().toLowerCase();
    const base = (activeType
      ? definitions.filter((d) => d.type === activeType)
      : definitions
    ).filter(
      (d) =>
        q === "" ||
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );

    const typeOrder = (t: CapabilityType) =>
      CAPABILITY_TYPE_OPTIONS.findIndex((o) => o.id === t);
    return [...base].sort((a, b) => {
      if (sort === "usage") {
        const diff = (usedByCount.get(b.id) ?? 0) - (usedByCount.get(a.id) ?? 0);
        if (diff !== 0) return diff;
      }
      return typeOrder(a.type) - typeOrder(b.type) || a.name.localeCompare(b.name, "zh");
    });
  }, [definitions, activeType, query, sort, usedByCount]);

  if (!hydrated) return <CapabilitiesSkeleton />;

  const totalUsed = agentCapabilities.length;
  const archivedCount = definitions.filter((d) => d.lifecycle === "archived").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="能力资产"
        description="能力定义资产库：生命周期与使用状态一目了然，点击查看被哪些 Agent 使用"
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-white/10 px-2.5 py-1 text-[12px] text-ink-3 sm:inline">
              {definitions.length} 个资产 · {totalUsed} 个装配
            </span>
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              新建能力
            </Button>
          </div>
        }
      />

      {/* 类型筛选 + 搜索 + 排序 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                  router.push(
                    f.id === "all" ? "/capabilities" : `/capabilities?type=${f.id}`
                  )
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

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称或描述…"
              aria-label="搜索能力资产"
              className="h-9 w-56 pl-8 text-[12.5px]"
            />
          </div>
          <div
            role="group"
            aria-label="排序方式"
            className="flex items-center gap-0.5 rounded-lg bg-white/[0.03] p-1"
          >
            {(
              [
                { id: "name", label: "名称" },
                { id: "usage", label: "使用数" },
              ] as { id: SortKey; label: string }[]
            ).map((s) => {
              const active = sort === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                    active
                      ? "bg-surface-2 text-ink shadow-sm"
                      : "text-ink-3 hover:bg-white/[0.04] hover:text-ink-2"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 资产列表 */}
      <Card className="overflow-hidden rounded-xl bg-surface-1">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Blocks className="h-6 w-6 text-ink-3" />
            <p className="text-[13.5px] text-ink-2">
              {query.trim()
                ? "没有匹配的能力资产"
                : activeType
                  ? "该类型暂无能力资产"
                  : "暂无能力资产"}
            </p>
            {query.trim() && (
              <p className="text-[12px] text-ink-3">试试其他关键词</p>
            )}
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
                      <p
                        className={cn(
                          "truncate text-[13.5px] font-medium",
                          d.lifecycle === "archived"
                            ? "text-ink-3"
                            : "text-ink"
                        )}
                      >
                        {d.name}
                      </p>
                      <p className="hidden truncate text-[12px] text-ink-3 sm:block sm:max-w-[38%]">
                        {d.description}
                      </p>
                    </div>

                    <div className="hidden shrink-0 md:block">
                      <CapabilityTypeBadge type={d.type} />
                    </div>

                    <div className="hidden shrink-0 lg:block">
                      <CapabilityLifecycleBadge lifecycle={d.lifecycle} />
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

      {archivedCount > 0 && (
        <p className="text-[12px] text-ink-3">
          其中 {archivedCount} 个资产已归档（Archived）：不可再被新 Agent 装配，
          已有装配关系保留展示。
        </p>
      )}

      <CapabilityFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

function CapabilitiesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-10 w-full max-w-[560px] rounded-lg" />
      <div className="space-y-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
