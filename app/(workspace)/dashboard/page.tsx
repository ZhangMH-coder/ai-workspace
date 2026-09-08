"use client";

import Link from "next/link";
import { CalendarDays, Gauge, Plus, Timer, Zap, Activity } from "lucide-react";

import {
  ActivityList,
  ActivityListSkeleton,
} from "@/components/dashboard/activity-list";
import { ProjectsOverview } from "@/components/dashboard/projects-overview";
import {
  MetricCard,
  MetricCardSkeleton,
} from "@/components/dashboard/metric-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TrendChart } from "@/components/charts/trend-chart";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercent, formatTokens } from "@/lib/format";
import { useWorkspaceStore, EMPTY_RUNS_STATS } from "@/stores/workspace";
import { TIME_RANGE_OPTIONS, timeRangeLabel } from "@/lib/types";
import { useEffect } from "react";

function useDashboardData() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const recentRuns = useWorkspaceStore((s) => s.recentRuns);
  const stats = useWorkspaceStore((s) => s.stats);
  const timeRange = useWorkspaceStore((s) => s.timeRange);
  const setTimeRange = useWorkspaceStore((s) => s.setTimeRange);
  const hydrate = useWorkspaceStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { hydrated, agents, recentRuns, stats, timeRange, setTimeRange };
}

function pctDelta(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "新增" : null;
  const delta = ((current - previous) / previous) * 100;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

export default function DashboardPage() {
  const { hydrated, agents, recentRuns, stats, timeRange, setTimeRange } = useDashboardData();
  // P4-3：统计来自服务端 /runs/stats 聚合（hydrate 后保证存在），不再前端全量拉取 + 内存统计
  const global = stats?.global ?? EMPTY_RUNS_STATS;
  const previous = stats?.previous ?? EMPTY_RUNS_STATS;

  const activeAgents = agents.filter((a) => a.status === "active" || a.status === "idle").length;
  const successRate = global.totals.successRate;
  const failedCount = global.totals.failed;
  const tokens = global.totals.tokens;

  const runsDelta = pctDelta(global.totals.runs, previous.totals.runs);
  const tokensDelta = pctDelta(global.totals.tokens, previous.totals.tokens);

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
                  {timeRangeLabel(timeRange)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onSelect={() => setTimeRange(option.id)}
                  >
                    {option.label}
                    {option.id === timeRange ? " ✓" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/agents/new">
                <Plus />
                新建 Agent
              </Link>
            </Button>
          </>
        }
      />

      {/* 指标卡 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {!hydrated ? (
          <>
            <MetricCardSkeleton label="活跃 Agent" icon={Zap} />
            <MetricCardSkeleton label="本月运行" icon={Activity} />
            <MetricCardSkeleton label="成功率" icon={Gauge} />
            <MetricCardSkeleton label="Tokens 用量" icon={Timer} />
          </>
        ) : (
          <>
            <MetricCard
              label="活跃 Agent"
              icon={Zap}
              value={formatNumber(activeAgents)}
              deltaLabel={`共 ${agents.length} 个 Agent`}
            />
            <MetricCard
              label="本月运行"
              icon={Activity}
              value={formatNumber(global.totals.runs)}
              delta={runsDelta ?? undefined}
              deltaLabel="较上一时段"
              tone={runsDelta?.startsWith("-") ? "danger" : "success"}
            />
            <MetricCard
              label="成功率"
              icon={Gauge}
              value={formatPercent(successRate)}
              delta={failedCount > 0 ? `${failedCount} 次失败` : "全部成功"}
              deltaLabel="时间范围内"
              tone={failedCount > 0 ? "danger" : "success"}
            />
            <MetricCard
              label="Tokens 用量"
              icon={Timer}
              value={formatTokens(tokens)}
              delta={tokensDelta ?? undefined}
              deltaLabel="较上一时段"
              tone={tokensDelta?.startsWith("-") ? "danger" : "success"}
            />          </>
        )}
      </div>

      {/* 趋势图 + 最近活动 */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="rounded-xl bg-surface-1 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">运行趋势</h3>
              <p className="mt-0.5 text-[12px] text-ink-3">各 Agent 运行量与成功率</p>
            </div>
            <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
              {timeRangeLabel(timeRange)}
            </Badge>
          </div>
          <div className="px-4 pb-4 pt-5 sm:px-5">
            {hydrated ? (
              <TrendChart
                key={timeRange}
                data={global.daily}
                rangeLabel={timeRangeLabel(timeRange)}
              />
            ) : (
              <div className="h-[240px] animate-pulse rounded-lg bg-white/[0.04]" />
            )}
          </div>
        </Card>

        <Card className="rounded-xl bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[14px] font-semibold text-ink">最近活动</h3>
            <Activity className="h-4 w-4 rotate-90 text-ink-3" />
          </div>
          {hydrated ? (
            <ActivityList runs={recentRuns} agents={agents} />
          ) : (
            <ActivityListSkeleton />
          )}
        </Card>
      </div>

      {/* 项目维度摘要 */}
      <ProjectsOverview hydrated={hydrated} />

      {/* 快捷操作 */}
      <QuickActions />
    </div>
  );
}
