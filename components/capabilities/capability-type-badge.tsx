"use client";

/** 能力类型徽章（图标 + 标签，中性克制配色；Capability Hub / 详情页共用） */
import { Badge } from "@/components/ui/badge";
import { CAPABILITY_TYPE_ICONS } from "@/lib/capability-meta";
import { CAPABILITY_TYPE_OPTIONS, type CapabilityType } from "@/lib/types";

export function CapabilityTypeBadge({
  type,
  withIcon = true,
}: {
  type: CapabilityType;
  withIcon?: boolean;
}) {
  const meta = CAPABILITY_TYPE_OPTIONS.find((o) => o.id === type);
  const Icon = CAPABILITY_TYPE_ICONS[type];
  return (
    <Badge
      variant="outline"
      className="gap-1 border-white/10 text-[11px] font-normal text-ink-2"
    >
      {withIcon && <Icon className="h-3 w-3 text-ink-3" />}
      {meta?.label ?? type}
    </Badge>
  );
}
