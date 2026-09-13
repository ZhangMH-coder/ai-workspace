"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, Sparkles } from "lucide-react";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { formatNumber, formatPercent, formatRelativeTime, formatTokens } from "@/lib/format";
import { templateForAgentName } from "@/lib/agents/templates";
import { modelLabel, type Agent, type Project, type RunsStats } from "@/lib/types";

/**
 * S1.60：Agent 卡片（团队工作台版）
 * - 状态灯 + 模型徽标 + 最近运行摘要
 * - 来源模板匹配时展示「候选任务」快捷入口（点击进入详情并预填运行指令）
 */
export function AgentCard({
  agent,
  stats,
  projectsOf = [],
}: {
  agent: Agent;
  /** 全部时间运行统计（服务端 /runs/stats 聚合） */
  stats: RunsStats;
  /** 该 Agent 所属的项目（只引用，派生自 projectAgents） */
  projectsOf?: Project[];
}) {
  const template = templateForAgentName(agent.name);
  const quickTasks = template?.suggestedTasks ?? [];
  const hasRuns = stats.totals.runs > 0;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-surface-1 p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/15 hover:bg-surface-2 focus-within:ring-2 focus-within:ring-brand/40">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/agents/${agent.id}`}
          className="flex min-w-0 items-center gap-3 focus-visible:outline-none"
          aria-label={`查看 ${agent.name} 详情`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/5 transition-colors duration-150 group-hover:bg-brand-soft">
            <Bot className="h-[18px] w-[18px] text-ink-2 transition-colors duration-150 group-hover:text-brand" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{agent.name}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-3">{modelLabel(agent.model)}</p>
          </div>
        </Link>
        <AgentStatusBadge status={agent.status} />
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5em] text-[12.5px] leading-relaxed text-ink-2">
        {agent.description}
      </p>

      {/* S1.60：来源模板的候选任务快捷入口 */}
      {quickTasks.length > 0 ? (
        <div className="mt-3 flex items-start gap-1.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand/70" />
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {quickTasks.slice(0, 2).map((task) => (
              <Link
                key={task}
                href={`/agents/${agent.id}?task=${encodeURIComponent(task)}`}
                className="rounded-md border border-border/70 px-2 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
              >
                {task}
              </Link>
            ))}
            {quickTasks.length > 2 ? (
              <Link
                href={`/agents/${agent.id}`}
                className="rounded-md px-1.5 py-0.5 text-[11px] text-ink-3 transition-colors hover:text-ink-1"
              >
                +{quickTasks.length - 2}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {projectsOf.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="所属项目">
          <span className="text-[11px] text-ink-3">项目</span>
          {projectsOf.slice(0, 2).map((p) => (
            <span
              key={p.id}
              className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-ink-2"
            >
              {p.name}
            </span>
          ))}
          {projectsOf.length > 2 ? (
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-ink-3">
              +{projectsOf.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3.5 text-[12px]">
        <div className="flex items-center gap-4 text-ink-3">
          <span>{formatNumber(stats.totals.runs)} 次运行</span>
          <span className={hasRuns ? "text-ink-2" : "text-ink-3"}>
            {hasRuns ? `${formatPercent(stats.totals.successRate)} 成功` : "暂无运行"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-3">
            {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "未运行过"}
          </span>
          <span className="text-ink-3">{formatTokens(stats.totals.tokens)}</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </div>
        <div className="h-5 w-14 animate-pulse rounded-full bg-white/[0.05]" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
      </div>
      <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-white/[0.04]" />
    </div>
  );
}
