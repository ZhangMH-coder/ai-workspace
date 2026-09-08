"use client";

import type { AgentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_META: Record<AgentStatus, { label: string; className: string }> = {
  active: { label: "运行中", className: "border-success/30 bg-success/10 text-success" },
  idle: { label: "空闲", className: "border-white/10 bg-white/[0.05] text-ink-2" },
  error: { label: "异常", className: "border-danger/30 bg-danger/10 text-danger" },
  paused: { label: "已暂停", className: "border-warning/30 bg-warning/10 text-warning" },
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${meta.className}`}>
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}
