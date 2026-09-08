"use client";

/**
 * Capability 资产详情（Phase 3 第四阶段：资产生命周期管理）
 *
 * - 两维状态：生命周期（Active/Archived，落模型）+ 使用状态（Used/Unused，派生）
 * - 资产生命周期操作：编辑（元信息）/ 归档（软删除，Dialog 确认）/ 恢复
 * - Used by：装配该资产的 Agent 列表；archived 资产的装配行带「已归档」标记（数据不悬空）
 * - 全部写操作经 Service → Store，页面不直接修改领域数据
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { Archive, ArrowLeft, Blocks, Bot, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { CapabilityFormDialog } from "@/components/capabilities/capability-form-dialog";
import { CapabilityLifecycleBadge } from "@/components/capabilities/capability-lifecycle-badge";
import { CapabilityTypeBadge } from "@/components/capabilities/capability-type-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
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
import { CAPABILITY_TYPE_ICONS } from "@/lib/capability-meta";
import { formatDateTime } from "@/lib/format";
import { CAPABILITY_TYPE_OPTIONS } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export default function CapabilityDetailPage() {
  const params = useParams<{ id: string }>();
  const capabilityId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const definitions = useWorkspaceStore((s) => s.capabilityDefinitions);
  const agentCapabilities = useWorkspaceStore((s) => s.agentCapabilities);
  const agents = useWorkspaceStore((s) => s.agents);
  const archiveCapability = useWorkspaceStore((s) => s.archiveCapability);
  const restoreCapability = useWorkspaceStore((s) => s.restoreCapability);

  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const usedBy = useMemo(() => {
    const assemblies = agentCapabilities.filter(
      (ac) => ac.capabilityId === capabilityId
    );
    return assemblies
      .map((assembly) => ({
        assembly,
        agent: agents.find((a) => a.id === assembly.agentId),
      }))
      .filter((x): x is { assembly: (typeof assemblies)[number]; agent: NonNullable<(typeof agents)[number]> } => Boolean(x.agent))
      .sort((a, b) =>
        a.assembly.enabled === b.assembly.enabled
          ? a.agent.name.localeCompare(b.agent.name, "zh")
          : a.assembly.enabled
            ? -1
            : 1
      );
  }, [agentCapabilities, agents, capabilityId]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );
  }

  const definition = definitions.find((d) => d.id === capabilityId);

  if (!definition) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <Blocks className="h-6 w-6 text-ink-3" />
        <p className="text-[14px] font-medium text-ink-2">未找到该能力资产</p>
        <p className="text-[13px] text-ink-3">它可能已被移除，或链接有误</p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/capabilities">
            <ArrowLeft />
            返回资产库
          </Link>
        </Button>
      </div>
    );
  }

  const archived = definition.lifecycle === "archived";
  const typeMeta = CAPABILITY_TYPE_OPTIONS.find((t) => t.id === definition.type);
  const TypeIcon = CAPABILITY_TYPE_ICONS[definition.type];
  const enabledCount = usedBy.filter((u) => u.assembly.enabled).length;
  const inUse = usedBy.length > 0;

  const handleArchive = async () => {
    setBusy(true);
    try {
      await archiveCapability(definition.id);
      toast.success(`已归档「${definition.name}」`);
      setArchiveOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "归档失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      await restoreCapability(definition.id);
      toast.success(`已恢复「${definition.name}」`);
      setRestoreOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "恢复失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={definition.name}
        description={definition.description}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/capabilities">
                <ArrowLeft />
                返回资产库
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              编辑
            </Button>
            {archived ? (
              <Button onClick={() => setRestoreOpen(true)}>
                <RotateCcw />
                恢复
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-ink-2 hover:text-ink"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive />
                归档
              </Button>
            )}
          </div>
        }
      />

      {archived && (
        <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <Archive className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            该能力已归档（软删除）：不能再被新的 Agent 装配；已有装配关系
            {usedBy.length > 0 ? "保留展示并冻结管理" : "不受影响"}。可随时恢复为 Active。
          </p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {/* 主区：基本信息 + Used by */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Card className="rounded-xl bg-surface-1 p-5">
            <h3 className="text-[14px] font-semibold text-ink">基本信息</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-ink-3">类型</dt>
                <dd className="mt-1.5">
                  <CapabilityTypeBadge type={definition.type} />
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">生命周期</dt>
                <dd className="mt-1.5">
                  <CapabilityLifecycleBadge lifecycle={definition.lifecycle} />
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">使用状态（派生）</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${inUse ? "bg-success" : "bg-ink-3/50"}`}
                    aria-hidden="true"
                  />
                  {inUse ? "使用中" : "未使用"}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">装配数</dt>
                <dd className="mt-1.5 text-[13px] font-medium text-ink">
                  {usedBy.length} 个 Agent
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[12px] text-ink-3">描述</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                  {definition.description}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[12px] text-ink-3">能力标识</dt>
                <dd className="mt-1.5 font-mono text-[12px] text-ink-3">
                  {definition.id}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="rounded-xl bg-surface-1">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-[14px] font-semibold text-ink">被使用的 Agent（Used by）</h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                装配该能力资产的 Agent 及其装配状态
              </p>
            </div>

            {usedBy.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Bot className="h-5 w-5 text-ink-3" />
                <p className="text-[13px] text-ink-2">暂无 Agent 使用该能力</p>
                <p className="text-[12px] text-ink-3">
                  {archived
                    ? "该能力已归档，不可再被新 Agent 装配"
                    : "可在任一 Agent 详情的「装配能力」中添加"}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {usedBy.map(({ agent, assembly }, i) => (
                  <li key={assembly.id}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50 ${
                        i > 0 ? "border-t border-border/60" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">
                          {agent.name}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-ink-3">
                          装配于 {formatDateTime(assembly.createdAt)} · {assembly.enabled ? "已启用" : "已停用"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <AgentStatusBadge status={agent.status} />
                        {archived && (
                          <Badge
                            variant="outline"
                            className="border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                          >
                            已归档
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            assembly.enabled
                              ? "border-brand/30 bg-brand/10 text-[10.5px] font-normal text-brand"
                              : "border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                          }
                        >
                          {assembly.enabled ? "已启用" : "已停用"}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* 右列：装配概览 */}
        <Card className="h-fit rounded-xl bg-surface-1 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
              <TypeIcon className="h-4 w-4 text-ink-2" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">装配概览</h3>
              <p className="text-[12px] text-ink-3">{typeMeta?.label}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-ink-3">总使用</dt>
              <dd className="text-[13px] font-semibold tabular-nums text-ink">
                {usedBy.length} 个 Agent
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-ink-3">已启用</dt>
              <dd className="text-[13px] font-medium tabular-nums text-success">
                {enabledCount}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-ink-3">已停用</dt>
              <dd className="text-[13px] font-medium tabular-nums text-ink-3">
                {usedBy.length - enabledCount}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* 编辑 */}
      <CapabilityFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editingId={definition.id}
      />

      {/* 归档确认 */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>归档「{definition.name}」？</DialogTitle>
            <DialogDescription>
              归档为软删除：该能力不能再被新的 Agent 装配；
              {usedBy.length > 0
                ? `已有 ${usedBy.length} 个 Agent 的装配关系将保留展示并冻结管理（不自动解绑）。`
                : "当前无 Agent 装配它。"}
              归档后可随时恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArchiveOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button variant="outline" onClick={handleArchive} disabled={busy}>
              {busy ? "归档中…" : "确认归档"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 恢复确认 */}
      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>恢复「{definition.name}」？</DialogTitle>
            <DialogDescription>
              恢复为 Active：可重新被 Agent 装配；已有装配关系恢复可管理。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button onClick={handleRestore} disabled={busy}>
              {busy ? "恢复中…" : "确认恢复"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
