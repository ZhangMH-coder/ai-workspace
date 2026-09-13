"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Cpu,
  Loader2,
  Pencil,
  Play,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { CapabilityList } from "@/components/agents/capability-list";
import { CapabilityPicker } from "@/components/agents/capability-picker";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatDuration, formatNumber, formatPercent, formatRelativeTime, formatRunErrorCode, formatTokens } from "@/lib/format";
import { templateForAgentName } from "@/lib/agents/templates";
import { modelLabel, normalizeRunStatus, runStatusMeta, type AgentRun, type RunStatus } from "@/lib/types";
import { EMPTY_RUNS_STATS, useWorkspaceStore } from "@/stores/workspace";

function RunBadge({ status }: { status: string }) {
  const s = normalizeRunStatus(status);
  const meta = runStatusMeta[s];
  return (
    <Badge variant="outline" className={`w-16 justify-center text-[11px] font-medium ${meta.badge}`}>
      {meta.label}
    </Badge>
  );
}

/** S1.60：运行状态流转可视化（排队的次序 + 终态颜色）；running/queued 显示脉冲动画 */
function RunTimelineDot({ status }: { status: RunStatus }) {
  const live = status === "queued" || status === "running";
  const color =
    status === "succeeded"
      ? "bg-success"
      : status === "failed"
        ? "bg-danger"
        : status === "cancelled"
          ? "bg-warning"
          : "bg-info";
  return (
    <span className="relative mt-[5px] flex h-2.5 w-2.5 shrink-0">
      {live ? (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />
      ) : null}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color} ring-4 ring-white/[0.03]`} />
    </span>
  );
}

/** S1.60：系统提示词可读化卡片（按 Markdown ## 标题分段；无标题时整段展示） */
function PromptCard({ prompt }: { prompt: string }) {
  const sections = prompt
    .split(/\n(?=##\s)/)
    .map((seg) => seg.trim())
    .filter(Boolean);

  if (sections.length <= 1) {
    return (
      <p className="whitespace-pre-wrap rounded-lg border border-border bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-ink-2">
        {prompt}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {sections.map((seg, i) => {
        const m = seg.match(/^##\s+(.+)$/m);
        const title = m?.[1] ?? `第 ${i + 1} 段`;
        const body = m ? seg.slice(m[0].length).trim() : seg;
        return (
          <div key={i} className="rounded-lg border border-border bg-white/[0.03] p-3">
            <p className="text-[12px] font-semibold text-brand/90">{title}</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">
              {body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** S1.60：运行失败错误面板（error_code 可读 + 展开消息；provider_unavailable 引导 Settings） */
function RunErrorPanel({ run }: { run: AgentRun }) {
  const isProvider = run.errorCode === "provider_unavailable";
  return (
    <div
      className="rounded-lg border border-danger/25 bg-danger/[0.06] p-3"
      role="alert"
    >
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-danger">
        <CircleAlert className="size-3.5" />
        {formatRunErrorCode(run.errorCode)}
      </p>
      {run.errorMessage ? (
        <p className="mt-1.5 break-words text-[12px] leading-relaxed text-ink-2">
          {run.errorMessage}
        </p>
      ) : null}
      {isProvider ? (
        <Button
          variant="outline"
          size="sm"
          asChild
          className="mt-2.5 h-7 gap-1.5 text-[12px]"
        >
          <Link href="/settings">
            <Settings className="size-3.5" />
            前往 Settings 配置 AI Provider
          </Link>
        </Button>
      ) : null}
      {run.errorCode ? (
        <p className="mt-1.5 font-mono text-[10.5px] text-ink-3">code: {run.errorCode}</p>
      ) : null}
    </div>
  );
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const stats = useWorkspaceStore((s) => s.stats);
  const agentRuns = useWorkspaceStore((s) => s.agentRunsById[agentId]);
  const fetchAgentRuns = useWorkspaceStore((s) => s.fetchAgentRuns);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const runAgent = useWorkspaceStore((s) => s.runAgent);
  const archiveAgent = useWorkspaceStore((s) => s.archiveAgent);

  const [running, setRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // S1.60：从列表卡片「候选任务」进入时预填运行指令
  const [runInput, setRunInput] = useState(searchParams.get("task") ?? "");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  // S1.60：归档两段式确认（点击后 3 秒内再点确认）
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) void fetchAgentRuns(agentId);
  }, [hydrated, fetchAgentRuns, agentId]);

  // S1.60：归档确认超时自动复位
  useEffect(() => {
    if (!confirmArchive) return;
    const t = setTimeout(() => setConfirmArchive(false), 3000);
    return () => clearTimeout(t);
  }, [confirmArchive]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );
  }

  const agent = agents.find((a) => a.id === agentId);

  if (!agent || agent.archivedAt) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <Bot className="h-6 w-6 text-ink-3" />
        <p className="text-[14px] font-medium text-ink-2">未找到该 Agent</p>
        <p className="text-[13px] text-ink-3">它可能已被归档，或链接有误</p>
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
  const template = templateForAgentName(agent.name);
  const quickTasks = template?.suggestedTasks ?? [];

  async function handleRun(input?: string) {
    if (running || !agent) return;
    setRunning(true);
    try {
      const run = await runAgent(agentId, input?.trim() || undefined);
      await fetchAgentRuns(agentId, true); // S1.30：运行后强制重拉明细，列表与真实 Run 落库同步
      // S1.60：失败时自动展开该条错误面板
      if (run.status === "failed") {
        setExpandedRunId(run.id);
        toast.error("运行失败");
      } else {
        toast.success("运行完成");
      }
    } catch {
      toast.error("运行失败，请重试");
    } finally {
      setRunning(false);
    }
  }

  async function handleArchive() {
    if (!agent) return;
    if (!confirmArchive) {
      setConfirmArchive(true);
      return;
    }
    try {
      await archiveAgent(agentId);
      toast.success(`Agent「${agent.name}」已归档`);
      router.push("/agents");
    } catch {
      toast.error("归档失败，请重试");
      setConfirmArchive(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={agent.name}
        description={agent.description}
        actions={
          <Button variant="ghost" asChild>
            <Link href="/agents">
              <ArrowLeft />
              返回列表
            </Link>
          </Button>
        }
      />

      {/* 身份区：一眼看清「是谁、什么状态、能干什么」 */}
      <Card className="rounded-xl bg-surface-1">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft ring-1 ring-brand/20">
              <Bot className="h-6 w-6 text-brand" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">{agent.name}</h2>
                <AgentStatusBadge status={agent.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                <span className="flex items-center gap-1">
                  <Cpu className="size-3" />
                  {modelLabel(agent.model)}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  创建于 {formatDateTime(agent.createdAt)}
                </span>
                <span>最近运行 {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "未运行过"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/agents/${agent.id}/edit`}>
                <Pencil className="size-3.5" />
                编辑
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleArchive()}
              className={
                confirmArchive
                  ? "border-danger/40 bg-danger/10 text-danger hover:bg-danger/15"
                  : "text-ink-2 hover:text-danger"
              }
            >
              <Trash2 className="size-3.5" />
              {confirmArchive ? "确认归档" : "归档"}
            </Button>
          </div>
        </div>

        {/* 候选任务快捷入口（来自来源模板） */}
        {quickTasks.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-5 py-3">
            <span className="flex items-center gap-1 text-[12px] text-ink-3">
              <Sparkles className="size-3.5 text-brand/70" />
              候选任务
            </span>
            {quickTasks.map((task) => (
              <button
                key={task}
                type="button"
                onClick={() => setRunInput(task)}
                className="rounded-md border border-border/70 px-2.5 py-1 text-[12px] text-ink-2 transition-colors hover:border-brand/40 hover:text-brand"
              >
                {task}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* 运行区 + 历史时间线 */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          {/* 运行区 */}
          <Card className="rounded-xl bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-ink">运行</h3>
              <div className="flex items-center gap-2 text-[12px] text-ink-3">
                <span>{formatNumber(totals.runs)} 次</span>
                <span>成功率 {totals.runs > 0 ? formatPercent(totals.successRate) : "—"}</span>
                <span>平均 {totals.runs > 0 ? formatDuration(totals.avgDurationMs) : "—"}</span>
                <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
                  {formatTokens(totals.tokens)} tokens
                </Badge>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Input
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRun(runInput);
                }}
                placeholder="给 Agent 的指令（可留空，发送默认任务）"
                className="h-10"
                aria-label="运行指令"
              />
              <Button onClick={() => void handleRun(runInput)} disabled={running} className="h-10">
                {running ? <Loader2 className="animate-spin" /> : <Play />}
                {running ? "运行中…" : "运行"}
              </Button>
            </div>
            {running ? (
              <div className="mt-3 flex items-center gap-2" aria-live="polite">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className="block h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-info/70" />
                </span>
                <span className="shrink-0 text-[11.5px] text-info">排队 → 运行中</span>
              </div>
            ) : null}
          </Card>

          {/* 历史时间线 */}
          <Card className="rounded-xl bg-surface-1">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-[14px] font-semibold text-ink">运行历史</h3>
              <p className="mt-0.5 text-[12px] text-ink-3">点击节点展开输出 / 错误详情</p>
            </div>

            {ownRuns.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Play className="h-5 w-5 text-ink-3" />
                <p className="text-[13px] text-ink-2">还没有运行记录</p>
                <p className="text-[12px] text-ink-3">输入指令并点击「运行」触发第一次运行</p>
              </div>
            ) : (
              <div className="px-5 py-4">
                <ol className="relative flex flex-col gap-1">
                  {ownRuns.slice(0, 20).map((run, idx) => {
                    const expanded = expandedRunId === run.id;
                    const isLast = idx === Math.min(ownRuns.length, 20) - 1;
                    return (
                      <li key={run.id} className="relative">
                        {/* 时间线竖线 */}
                        {!isLast ? (
                          <span className="absolute left-[5px] top-6 h-[calc(100%-4px)] w-px bg-white/[0.07]" />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setExpandedRunId(expanded ? null : run.id)}
                          className="relative flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-2"
                          aria-expanded={expanded}
                        >
                          <RunTimelineDot status={normalizeRunStatus(run.status)} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <RunBadge status={run.status} />
                              <p className="min-w-0 flex-1 truncate text-[13px] text-ink">
                                {run.summary || "（无摘要）"}
                              </p>
                            </div>
                            <p className="mt-1 pl-0 text-[12px] text-ink-3">
                              {formatRelativeTime(run.startedAt)} · {formatDuration(run.durationMs)} ·{" "}
                              {formatTokens(run.tokensUsed)} tokens · {run.messages} 条消息
                            </p>
                          </div>
                          <ChevronDown
                            className={`mt-1 h-4 w-4 shrink-0 text-ink-3 transition-transform ${
                              expanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {expanded ? (
                          <div className="ml-6 pb-3 pl-2">
                            {run.status === "failed" && (run.errorCode || run.errorMessage) ? (
                              <RunErrorPanel run={run} />
                            ) : run.output ? (
                              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/25 p-3 font-mono text-[12px] leading-relaxed text-ink-2">
                                {run.output}
                              </pre>
                            ) : (
                              <p className="text-[12px] text-ink-3">
                                该运行未保存输出内容（S1.31 之前的旧记录）
                              </p>
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </Card>
        </div>

        {/* 右侧：配置 + 装配能力 */}
        <div className="flex flex-col gap-3">
          <Card className="rounded-xl bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-ink">配置</h3>
              <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-[12px] text-ink-2">
                <Link href={`/agents/${agent.id}/edit`}>
                  <Pencil className="size-3" />
                  编辑
                </Link>
              </Button>
            </div>
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
                <dt className="text-[12px] text-ink-3">最近运行</dt>
                <dd className="mt-1 text-[13px] text-ink-2">
                  {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "未运行过"}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">系统提示词</dt>
                <dd className="mt-1.5">
                  <PromptCard prompt={agent.systemPrompt} />
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="rounded-xl bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-ink">已装配能力</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-normal text-ink-3">
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
