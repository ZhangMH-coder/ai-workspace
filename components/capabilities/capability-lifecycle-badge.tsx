"use client";

/** 生命周期徽章（Active / Archived）；「使用状态 Used/Unused」由装配数据派生，不在此组件内 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CapabilityLifecycle } from "@/lib/types";

export function CapabilityLifecycleBadge({
  lifecycle,
}: {
  lifecycle: CapabilityLifecycle;
}) {
  const archived = lifecycle === "archived";
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 text-[11px] font-normal",
        archived
          ? "border-white/10 text-ink-3"
          : "border-white/10 text-ink-2"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          archived ? "bg-ink-3/60" : "bg-brand"
        )}
        aria-hidden="true"
      />
      {archived ? "Archived" : "Active"}
    </Badge>
  );
}
