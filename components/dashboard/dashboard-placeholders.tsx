"use client";

import {
  ArrowUpRight,
  BarChart3,
  Bot,
  FolderKanban,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/* Phase 1 骨架占位组件：仅为视觉演示，不含业务数据逻辑 */

export function MetricCardSkeleton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-xl bg-surface-1 p-5 transition-colors duration-150 hover:ring-white/15">
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

export function ChartPlaceholder() {
  return (
    <Card className="rounded-xl bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">运行趋势</h3>
          <p className="mt-0.5 text-[12px] text-ink-3">各 Agent 运行量与成功率</p>
        </div>
        <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
          最近 30 天
        </Badge>
      </div>
      <div className="relative flex h-[264px] items-center justify-center px-5 pb-5 pt-2">
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="chart-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M32 0H0V32"
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#chart-grid)" />
        </svg>
        <div className="relative flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8">
          <BarChart3 className="h-5 w-5 text-ink-3" />
          <p className="text-[13px] font-medium text-ink-2">图表区域</p>
          <p className="text-[12px] text-ink-3">运行数据将在后续阶段接入</p>
        </div>
      </div>
    </Card>
  );
}

export function ActivityPlaceholder() {
  return (
    <Card className="rounded-xl bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 className="text-[14px] font-semibold text-ink">最近活动</h3>
        <BarChart3 className="h-4 w-4 rotate-90 text-ink-3" />
      </div>
      <div className="flex flex-col gap-4 p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/15" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.08]" />
              <div className="mt-1.5 h-2.5 w-2/5 animate-pulse rounded bg-white/[0.05]" />
            </div>
            <div className="h-2.5 w-10 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function QuickActions() {
  const actions = [
    { icon: Bot, title: "新建 Agent", description: "创建并配置新的智能体" },
    { icon: FolderKanban, title: "新建项目", description: "组织任务与协作" },
    { icon: Sparkles, title: "浏览技能", description: "从技能库发现能力" },
  ];

  return (
    <div>
      <h3 className="mb-3 text-[14px] font-semibold text-ink">快捷操作</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => toast("该功能将在后续阶段开放")}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-white/15 hover:bg-surface-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] transition-colors duration-150 group-hover:bg-brand-soft">
              <action.icon className="h-4 w-4 text-ink-2 transition-colors duration-150 group-hover:text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{action.title}</p>
              <p className="mt-0.5 truncate text-[12px] text-ink-3">{action.description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}
