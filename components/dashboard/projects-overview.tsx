"use client";

/**
 * Dashboard 项目维度摘要（Phase 3 第六阶段）
 *
 * - 数据全部来自单一 Store（projects + projectAgents + runs），与 Project Detail 完全同源；
 * - 统计复用 selectProjectStats（内部走 selectRunsInProjectWindow → selectRunsInRange 统一窗口），
 *   不重新实现任何统计逻辑；
 * - 每行可点击进入对应 Project Detail。
 */
import Link from "next/link";
import { FolderKanban, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/format";
import {
  selectProjectStats,
  selectRunsInProjectWindow,
  sortProjectsByActivity,
  useWorkspaceStore,
} from "@/stores/workspace";
import { cn } from "@/lib/utils";

export function ProjectsOverview({ hydrated }: { hydrated: boolean }) {
  const projects = useWorkspaceStore((s) => s.projects);
  const projectAgents = useWorkspaceStore((s) => s.projectAgents);
  const runs = useWorkspaceStore((s) => s.runs);

  if (!hydrated) {
    return (
      <Card className="rounded-xl bg-surface-1">
        <div className="border-b border-border px-5 py-4">
          <div className="h-3.5 w-10 animate-pulse rounded bg-white/[0.08]" />
          <div className="mt-1.5 h-3 w-44 animate-pulse rounded bg-white/[0.05]" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border/70 px-5 py-3.5 last:border-b-0"
            >
              <div className="h-6 w-6 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-white/[0.07]" />
                <div className="h-2.5 w-48 animate-pulse rounded bg-white/[0.04]" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-white/[0.05]" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const sorted = sortProjectsByActivity(projects);

  return (
    <Card className="rounded-xl bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-ink-3" />
          <div>
            <h3 className="text-[14px] font-semibold text-ink">项目</h3>
            <p className="mt-0.5 text-[12px] text-ink-3">
              业务组织上下文 · 统计与项目详情同源
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">查看全部</Link>
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <FolderKanban className="h-5 w-5 text-ink-3" />
          <p className="text-[13px] text-ink-2">暂无项目</p>
          <p className="text-[12px] text-ink-3">
            创建项目后，这里会展示每个项目的运行摘要
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((p) => {
            const stats = selectProjectStats(runs, projectAgents, p.id);
            const recent30d = selectRunsInProjectWindow(
              runs,
              projectAgents,
              p.id,
              "30d"
            );
            const lastActive =
              recent30d.length > 0
                ? recent30d.reduce((a, b) =>
                    new Date(a.startedAt).getTime() >
                    new Date(b.startedAt).getTime()
                      ? a
                      : b
                  ).startedAt
                : p.updatedAt;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex items-center gap-3 border-b border-border/70 px-5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:bg-white/[0.025]"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <FolderKanban className="h-3.5 w-3.5 text-ink-3 transition-colors duration-150 group-hover:text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {p.name}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {p.description}
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-4 text-[12px] sm:flex">
                  <span className="text-ink-3">
                    <span className="font-medium tabular-nums text-ink-2">
                      {stats.agentCount}
                    </span>{" "}
                    Agent
                  </span>
                  <span className="text-ink-3">
                    <span className="font-medium tabular-nums text-ink-2">
                      {stats.recent30dRuns}
                    </span>{" "}
                    次运行
                  </span>
                  <span
                    className={cn(
                      "w-14 text-right tabular-nums",
                      stats.recent30dSuccessRate >= 0.9
                        ? "font-medium text-success"
                        : "text-ink-3"
                    )}
                  >
                    {Math.round(stats.recent30dSuccessRate * 100)}%
                  </span>
                </div>
                <p className="w-24 shrink-0 text-right text-[11px] text-ink-3/70">
                  {formatRelativeTime(lastActive)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
