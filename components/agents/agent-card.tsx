"use client";

import Link from "next/link";
import { ArrowUpRight, Bot } from "lucide-react";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { formatNumber, formatPercent, formatRelativeTime, formatTokens } from "@/lib/format";
import { modelLabel, type Agent, type Project } from "@/lib/types";
import { selectAgentStats } from "@/stores/workspace";

export function AgentCard({
  agent,
  stats,
  projectsOf = [],
}: {
  agent: Agent;
  stats: ReturnType<typeof selectAgentStats>;
  /** 该 Agent 所属的项目（只引用，派生自 projectAgents） */
  projectsOf?: Project[];
}) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface-1 p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/15 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] transition-colors duration-150 group-hover:bg-brand-soft">
            <Bot className="h-4 w-4 text-ink-2 transition-colors duration-150 group-hover:text-brand" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{agent.name}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-3">{modelLabel(agent.model)}</p>
          </div>
        </div>
        <AgentStatusBadge status={agent.status} />
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5em] text-[12.5px] leading-relaxed text-ink-2">
        {agent.description}
      </p>

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
          <span>{formatNumber(stats.totalRuns)} 次运行</span>
          <span className={stats.successRate > 0 ? "text-ink-2" : "text-ink-3"}>
            {stats.totalRuns > 0 ? `${formatPercent(stats.successRate)} 成功` : "暂无运行"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-3">
            {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "未运行过"}
          </span>
          <span className="text-ink-3">{formatTokens(stats.totalTokens)}</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-ink-3 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-1 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.06]" />
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
