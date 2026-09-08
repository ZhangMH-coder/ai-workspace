"use client";

import Link from "next/link";
import { Activity, Bot } from "lucide-react";

import { formatDuration, formatRelativeTime, formatTokens } from "@/lib/format";
import type { Agent, AgentRun, RunStatus } from "@/lib/types";

const STATUS_META: Record<RunStatus, { label: string; dot: string }> = {
  success: { label: "成功", dot: "bg-success" },
  failed: { label: "失败", dot: "bg-danger" },
  running: { label: "运行中", dot: "bg-info" },
};

export function ActivityList({
  runs,
  agents,
}: {
  runs: AgentRun[];
  agents: Agent[];
}) {
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "未知 Agent";

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Activity className="h-5 w-5 text-ink-3" />
        <p className="text-[13px] text-ink-2">当前时间范围暂无运行记录</p>
        <p className="text-[12px] text-ink-3">触发一次运行后，结果会出现在这里</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {runs.slice(0, 7).map((run) => {
        const meta = STATUS_META[run.status];
        return (
          <Link
            key={run.id}
            href={`/agents/${run.agentId}`}
            className="group flex items-center gap-3 border-b border-border/70 px-5 py-3.5 transition-colors duration-150 last:border-b-0 hover:bg-white/[0.025]"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink">
                <span className="font-medium">{agentName(run.agentId)}</span>
                <span className="text-ink-3"> · {run.summary}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {meta.label} · {formatDuration(run.durationMs)} · {formatTokens(run.tokensUsed)}{" "}
                tokens · {formatRelativeTime(run.startedAt)}
              </p>
            </div>
            <Bot className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}

export function ActivityListSkeleton() {
  return (
    <div className="flex flex-col px-5 py-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border/70 py-3.5 last:border-b-0">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/15" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.08]" />
            <div className="mt-1.5 h-2.5 w-2/5 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}
