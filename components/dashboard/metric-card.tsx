"use client";

import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  icon: Icon,
  value,
  delta,
  deltaLabel,
  tone = "default",
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  delta?: string;
  deltaLabel?: string;
  tone?: "default" | "success" | "danger";
}) {
  const deltaColor =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-ink-2";

  return (
    <Card className="rounded-xl bg-surface-1 p-5 transition-colors duration-150 hover:ring-white/15">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
          <Icon className="h-4 w-4 text-ink-3" />
        </div>
      </div>
      <p className="mt-4 text-[26px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {delta ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-[12px]">
          <span className={`font-medium ${deltaColor}`}>{delta}</span>
          <span className="text-ink-3">{deltaLabel ?? "较上一时段"}</span>
        </p>
      ) : (
        <p className="mt-2.5 text-[12px] text-ink-3">{deltaLabel}</p>
      )}
    </Card>
  );
}

export function MetricCardSkeleton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-xl bg-surface-1 p-5">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
          <Icon className="h-4 w-4 text-ink-3" />
        </div>
      </div>
      <div className="mt-4 h-7 w-28 animate-pulse rounded-md bg-white/[0.08]" />
      <div className="mt-2.5 flex items-center gap-2">
        <div className="h-4 w-14 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </Card>
  );
}
