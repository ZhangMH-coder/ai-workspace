/**
 * DistributionBars —— 资源分布（S1.51）
 *
 * 真实数据横向条：资源类型分布 + 能力标签分类分布（无外部图表依赖，纯 CSS）。
 * 数据来自服务端聚合（byType / listCapabilityIndex），零演示数据。
 */
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";

import { resourceTypeLabel, type ResourceType } from "@/lib/types";
import type { CapabilityCategory } from "@/lib/types";

const MAX_BARS = 9;
const BAR_COLORS = [
  "bg-violet-400/70",
  "bg-sky-400/60",
  "bg-emerald-400/60",
  "bg-amber-400/60",
  "bg-rose-400/60",
  "bg-cyan-400/60",
  "bg-lime-400/60",
  "bg-fuchsia-400/60",
  "bg-orange-400/60",
];

function Bars({
  title,
  data,
  fmt,
}: {
  title: string;
  data: { label: string; value: number; hint?: string }[];
  fmt: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="size-3.5 text-primary" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{title}</p>
      </div>
      {data.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-ink-3">暂无数据（如实）</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.slice(0, MAX_BARS).map((d, i) => (
            <div key={d.label} className="flex items-center gap-2">
              <span
                className="w-20 shrink-0 truncate text-[11px] text-ink-2"
                title={d.hint ?? d.label}
              >
                {d.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                  style={{ width: `${Math.max(3, (d.value / max) * 100)}%` }}
                  title={`${d.label}: ${fmt(d.value)}`}
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-[11px] text-ink">
                {fmt(d.value)}
              </span>
            </div>
          ))}
          {data.length > MAX_BARS ? (
            <p className="text-[10px] text-ink-3">其余 {data.length - MAX_BARS} 类未展开</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function DistributionBars({
  byType,
  capabilityCategories,
}: {
  byType: Partial<Record<ResourceType, number>>;
  capabilityCategories: { category: CapabilityCategory; count: number }[];
}) {
  const typeRows = useMemo(
    () =>
      Object.entries(byType)
        .map(([t, n]) => ({ label: resourceTypeLabel(t as ResourceType), value: n ?? 0 }))
        .sort((a, b) => b.value - a.value),
    [byType],
  );
  const capRows = useMemo(
    () =>
      capabilityCategories
        .map((c) => ({ label: c.category, value: c.count }))
        .sort((a, b) => b.value - a.value),
    [capabilityCategories],
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <Bars title="资源类型分布" data={typeRows} fmt={(v) => String(v)} />
      <Bars title="能力标签分类分布" data={capRows} fmt={(v) => String(v)} />
    </div>
  );
}
