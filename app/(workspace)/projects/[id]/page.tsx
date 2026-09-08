"use client";

/**
 * Project 详情（Phase 3 第五阶段：Projects 最小业务闭环）
 *
 * - 项目摘要：Agent 数 / 总运行 / 成功率 / 总 Tokens（全部派生，不复制数据）
 * - 最近 30 天口径与 Dashboard 一致（selectRunsInProjectWindow → selectRunsInRange）
 * - 关联 Agent 列表：实时响应 Store（attach / detach 即时更新）
 * - 操作：关联（Picker）/ 解绑（Dialog 确认），全部经 Service → Store
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot, FolderKanban, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { AgentPicker } from "@/components/projects/agent-picker";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatRelativeTime, formatTokens } from "@/lib/format";
import { modelLabel } from "@/lib/types";
import {
  selectAgentStats,
  selectAgentsInProject,
  selectProjectStats,
  selectRunsInProjectWindow,
  useWorkspaceStore,
} from "@/stores/workspace";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const projects = useWorkspaceStore((s) => s.projects);
  const projectAgents = useWorkspaceStore((s) => s.projectAgents);
  const agents = useWorkspaceStore((s) => s.agents);
  const runs = useWorkspaceStore((s) => s.runs);
  const detachAgentFromProject = useWorkspaceStore(
    (s) => s.detachAgentFromProject
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [detachTarget, setDetachTarget] = useState<{ id: string; agentName: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const projectAgentsOf = useMemo(
    () => projectAgents.filter((pa) => pa.projectId === projectId),
    [projectAgents, projectId]
  );

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-[120px] w-full rounded-xl" />
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
    );
  }

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <FolderKanban className="h-6 w-6 text-ink-3" />
        <p className="text-[14px] font-medium text-ink-2">未找到该项目</p>
        <p className="text-[13px] text-ink-3">它可能已被移除，或链接有误</p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/projects">
            <ArrowLeft />
            返回项目列表
          </Link>
        </Button>
      </div>
    );
  }

  const stats = selectProjectStats(runs, projectAgents, projectId);
  const projectAgentsList = selectAgentsInProject(agents, projectAgents, projectId);
  const recent30d = selectRunsInProjectWindow(
    runs,
    projectAgents,
    projectId,
    "30d"
  );

  async function handleConfirmDetach() {
    if (!detachTarget || busy) return;
    setBusy(true);
    try {
      await detachAgentFromProject(detachTarget.id);
      toast.success(`已解除「${detachTarget.agentName}」的关联`);
      setDetachTarget(null);
    } catch {
      toast.error("解除关联失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <Button variant="ghost" asChild>
            <Link href="/projects">
              <ArrowLeft />
              返回项目列表
            </Link>
          </Button>
        }
      />

      {/* 项目摘要（全部派生） */}
      <Card className="rounded-xl bg-surface-1">
        <div className="flex items-center gap-2 px-5 pt-4">
          <FolderKanban className="h-3.5 w-3.5 text-ink-3" />
          <h3 className="text-[14px] font-semibold text-ink">项目摘要</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 divide-x divide-border/60 border-t border-border/60 lg:grid-cols-4">
          {[
            { label: "Agent 数", value: String(stats.agentCount), hint: "已关联" },
            { label: "总运行", value: formatNumber(stats.totalRuns), hint: "累计" },
            {
              label: "成功率",
              value: `${Math.round(stats.successRate * 100)}%`,
              hint: "全部时间",
            },
            {
              label: "Tokens",
              value: formatTokens(stats.totalTokens),
              hint: "累计",
            },
          ].map((m) => (
            <div key={m.label} className="px-5 py-4">
              <p className="text-[11.5px] text-ink-3">{m.label}</p>
              <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink">
                {m.value}
              </p>
              <p className="mt-1.5 text-[11px] text-ink-3/70">{m.hint}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3 text-[12px]">
          <span className="text-ink-3">最近 30 天（与 Dashboard 同口径）：</span>
          <span className="font-medium text-ink">{stats.recent30dRuns} 次运行</span>
          <span className="text-ink-3">·</span>
          <span className="font-medium text-ink">
            {Math.round(stats.recent30dSuccessRate * 100)}% 成功率
          </span>
          {recent30d.length > 0 && (
            <span className="ml-auto text-ink-3/70">
              最近活跃 {formatRelativeTime(recent30d[0].startedAt)}
            </span>
          )}
        </div>
      </Card>

      {/* 关联 Agent */}
      <Card className="rounded-xl bg-surface-1">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Users className="h-3.5 w-3.5 text-ink-3" />
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-ink">关联 Agent</h3>
            <p className="mt-0.5 text-[12px] text-ink-3">
              Project 只引用 Agent，不复制数据；统计实时派生
            </p>
          </div>
          <Button size="sm" onClick={() => setPickerOpen(true)}>
            <Plus />
            关联 Agent
          </Button>
        </div>

        {projectAgentsList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Bot className="h-5 w-5 text-ink-3" />
            <p className="text-[13px] text-ink-2">尚未关联 Agent</p>
            <p className="text-[12px] text-ink-3">
              关联工作区已有 Agent，项目运行摘要将自动生成
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {projectAgentsList.map((agent, i) => {
              const agentStats = selectAgentStats(runs, agent.id);
              const pa = projectAgentsOf.find((x) => x.agentId === agent.id);
              return (
                <li
                  key={agent.id}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.02] ${
                    i > 0 ? "border-t border-border/60" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="truncate text-[13.5px] font-medium text-ink transition-colors hover:text-brand"
                      >
                        {agent.name}
                      </Link>
                      <AgentStatusBadge status={agent.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      {agent.description} · {modelLabel(agent.model)}
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-4 text-[12px] sm:flex">
                    <div className="text-right">
                      <p className="font-medium tabular-nums text-ink">
                        {agentStats.totalRuns} 次
                      </p>
                      <p className="text-[11px] text-ink-3">运行</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium tabular-nums text-ink">
                        {Math.round(agentStats.successRate * 100)}%
                      </p>
                      <p className="text-[11px] text-ink-3">成功率</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-ink">
                        {pa ? formatRelativeTime(pa.addedAt) : "—"}
                      </p>
                      <p className="text-[11px] text-ink-3">加入</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-ink-3 hover:text-danger"
                    onClick={() =>
                      pa &&
                      setDetachTarget({ id: pa.id, agentName: agent.name })
                    }
                    aria-label={`解除 ${agent.name} 的关联`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AgentPicker
        projectId={projectId}
        projectName={project.name}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />

      {/* 解绑确认 */}
      <Dialog open={detachTarget !== null} onOpenChange={(o) => !o && setDetachTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>解除 Agent 关联</DialogTitle>
            <DialogDescription>
              将「{detachTarget?.agentName}」从「{project.name}」移除。
              Agent 本身不受影响，仍保留在工作区，可随时重新关联。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetachTarget(null)} disabled={busy}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDetach} disabled={busy}>
              确认解除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
