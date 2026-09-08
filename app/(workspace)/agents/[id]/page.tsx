"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { CapabilityList } from "@/components/agents/capability-list";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatDuration, formatNumber, formatPercent, formatRelativeTime, formatTokens } from "@/lib/format";
import { modelLabel } from "@/lib/types";
import { selectAgentStats, useWorkspaceStore } from "@/stores/workspace";

function RunBadge({ status }: { status: "success" | "failed" | "running" }) {
  const map = {
    success: "border-success/30 bg-success/10 text-success",
    failed: "border-danger/30 bg-danger/10 text-danger",
    running: "border-info/30 bg-info/10 text-info",
  } as const;
  const label = { success: "成功", failed: "失败", running: "运行中" } as const;
  return (
    <Badge variant="outline" className={`w-12 justify-center text-[11px] font-medium ${map[status]}`}>
      {label[status]}
    </Badge>
  );
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const runs = useWorkspaceStore((s) => s.runs);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const runAgent = useWorkspaceStore((s) => s.runAgent);

  const [running, setRunning] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );
  }

  const agent = agents.find((a) => a.id === agentId);

  if (!agent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <Bot className="h-6 w-6 text-ink-3" />
        <p className="text-[14px] font-medium text-ink-2">未找到该 Agent</p>
        <p className="text-[13px] text-ink-3">它可能已被删除，或链接有误</p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/agents">
            <ArrowLeft />
            返回列表
          </Link>
        </Button>
      </div>
    );
  }

  const ownRuns = runs.filter((r) => r.agentId === agent.id);
  const stats = selectAgentStats(runs, agent.id);

  async function handleRun() {
    if (running) return;
    setRunning(true);
    try {
      const run = await runAgent(agentId);
      toast.success(run.status === "success" ? "运行完成" : "运行失败（演示）");
    } catch {
      toast.error("运行失败，请重试");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={agent.name}
        description={agent.description}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href="/agents">
                <ArrowLeft />
                返回列表
              </Link>
            </Button>
            <Button onClick={handleRun} disabled={running}>
              {running ? <Loader2 className="animate-spin" /> : <Play />}
              {running ? "运行中…" : "运行"}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {/* 运行历史 */}
        <Card className="rounded-xl bg-surface-1 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">运行历史</h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {formatNumber(stats.totalRuns)} 次 · 成功率{" "}
                {stats.totalRuns > 0 ? formatPercent(stats.successRate) : "—"} · 平均{" "}
                {stats.totalRuns > 0 ? formatDuration(stats.avgDurationMs) : "—"}
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
              {formatTokens(stats.totalTokens)} tokens
            </Badge>
          </div>

          {ownRuns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Play className="h-5 w-5 text-ink-3" />
              <p className="text-[13px] text-ink-2">还没有运行记录</p>
              <p className="text-[12px] text-ink-3">点击右上角「运行」触发第一次运行</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {ownRuns.slice(0, 12).map((run) => (
                <div
                  key={run.id}
                  className="flex items-start gap-3 border-b border-border/70 px-5 py-3.5 last:border-b-0"
                >
                  <RunBadge status={run.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{run.summary}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {formatRelativeTime(run.startedAt)} · {formatDuration(run.durationMs)} ·{" "}
                      {formatTokens(run.tokensUsed)} tokens · {run.messages} 条消息
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 右侧：配置 + 装配能力 */}
        <div className="flex flex-col gap-3">
          <Card className="rounded-xl bg-surface-1 p-5">
            <h3 className="text-[14px] font-semibold text-ink">配置</h3>
            <dl className="mt-4 space-y-3.5">
              <div>
                <dt className="text-[12px] text-ink-3">状态</dt>
                <dd className="mt-1">
                  <AgentStatusBadge status={agent.status} />
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">模型</dt>
                <dd className="mt-1 text-[13px] font-medium text-ink">{modelLabel(agent.model)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">创建时间</dt>
                <dd className="mt-1 text-[13px] text-ink-2">{formatDateTime(agent.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">最近运行</dt>
                <dd className="mt-1 text-[13px] text-ink-2">
                  {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "未运行过"}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">系统提示词</dt>
                <dd className="mt-1.5 rounded-lg border border-border bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-ink-2">
                  {agent.systemPrompt}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="rounded-xl bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-ink">已装配能力</h3>
              <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
                只读 · Phase 3
              </Badge>
            </div>
            <div className="mt-4">
              <CapabilityList agentId={agent.id} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
