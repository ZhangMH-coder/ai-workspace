"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot, Loader2, Play, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { CapabilityList } from "@/components/agents/capability-list";
import { CapabilityPicker } from "@/components/agents/capability-picker";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatDuration, formatNumber, formatPercent, formatRelativeTime, formatTokens } from "@/lib/format";
import { modelLabel, normalizeRunStatus, runStatusMeta } from "@/lib/types";
import { EMPTY_RUNS_STATS, useWorkspaceStore } from "@/stores/workspace";

function RunBadge({ status }: { status: string }) {
  const s = normalizeRunStatus(status);
  const meta = runStatusMeta[s];
  return (
    <Badge variant="outline" className={`w-14 justify-center text-[11px] font-medium ${meta.badge}`}>
      {meta.label}
    </Badge>
  );
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const stats = useWorkspaceStore((s) => s.stats);
  const agentRuns = useWorkspaceStore((s) => s.agentRunsById[agentId]);
  const fetchAgentRuns = useWorkspaceStore((s) => s.fetchAgentRuns);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const runAgent = useWorkspaceStore((s) => s.runAgent);

  const [running, setRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [runInput, setRunInput] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) void fetchAgentRuns(agentId);
  }, [hydrated, fetchAgentRuns, agentId]);

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

  // P4-3：统计来自服务端 /runs/stats（byAgent 全部时间）；运行历史明细按需拉取
  const agentStats = stats?.byAgent[agent.id] ?? EMPTY_RUNS_STATS;
  const ownRuns = agentRuns ?? [];
  const { totals } = agentStats;

  async function handleRun(input?: string) {
    if (running) return;
    setRunning(true);
    try {
      const run = await runAgent(agentId, input?.trim() || undefined);
      await fetchAgentRuns(agentId, true); // S1.30：运行后强制重拉明细，列表与真实 Run 落库同步
      toast.success(run.status === "succeeded" ? "运行完成" : "运行失败");
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
                {formatNumber(totals.runs)} 次 · 成功率{" "}
                {totals.runs > 0 ? formatPercent(totals.successRate) : "—"} · 平均{" "}
                {totals.runs > 0 ? formatDuration(totals.avgDurationMs) : "—"}
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
              {formatTokens(totals.tokens)} tokens
            </Badge>
          </div>

          {/* S1.30：真实 LLM 运行输入 */}
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Input
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRun(runInput);
              }}
              placeholder="给 Agent 的指令（可留空，发送默认任务）"
              className="h-9"
              aria-label="运行指令"
            />
            <Button onClick={() => void handleRun(runInput)} disabled={running} size="sm">
              {running ? <Loader2 className="animate-spin" /> : <Play />}
              {running ? "运行中…" : "运行"}
            </Button>
          </div>

          {ownRuns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Play className="h-5 w-5 text-ink-3" />
              <p className="text-[13px] text-ink-2">还没有运行记录</p>
              <p className="text-[12px] text-ink-3">输入指令并点击「运行」触发第一次运行</p>
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
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal text-ink-3"
                >
                  可管理 · Phase 3
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                  <Plus />
                  装配能力
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <CapabilityList
                agentId={agent.id}
                agentName={agent.name}
                onOpenPicker={() => setPickerOpen(true)}
              />
            </div>
          </Card>

          <CapabilityPicker
            agentId={agent.id}
            agentName={agent.name}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
          />
        </div>
      </div>
    </div>
  );
}
