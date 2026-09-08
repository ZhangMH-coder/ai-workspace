"use client";

import { CalendarDays, Gauge, Plus, Timer, Zap, Activity } from "lucide-react";
import { toast } from "sonner";

import {
  ActivityPlaceholder,
  ChartPlaceholder,
  MetricCardSkeleton,
  QuickActions,
} from "@/components/dashboard/dashboard-placeholders";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const metrics = [
  { label: "活跃 Agent", icon: Zap },
  { label: "本月运行", icon: Activity },
  { label: "成功率", icon: Gauge },
  { label: "Tokens 用量", icon: Timer },
] as const;

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="概览"
        description="你的 AI 工作区运行状态总览"
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="default">
                  <CalendarDays className="text-ink-3" />
                  最近 30 天
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => toast("已切换时间范围（演示）")}>
                  今天
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("已切换时间范围（演示）")}>
                  最近 7 天
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("已切换时间范围（演示）")}>
                  最近 30 天
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => toast("该功能将在后续阶段开放")}>
              <Plus />
              新建 Agent
            </Button>
          </>
        }
      />

      {/* 指标骨架 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCardSkeleton key={metric.label} label={metric.label} icon={metric.icon} />
        ))}
      </div>

      {/* 图表占位 + 最近活动占位 */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPlaceholder />
        </div>
        <ActivityPlaceholder />
      </div>

      {/* 快捷操作 */}
      <QuickActions />
    </div>
  );
}
