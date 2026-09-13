"use client";

/**
 * Project 详情（S1.55：项目 = 使用场景组织单元）
 *
 * - 项目摘要：名称/描述/关联技能数/资源类型分布（全部派生，来自真实扫描索引）
 * - 关联技能网格：展示真实资源卡片（名称/分类/来源 Harness/描述），点击进资源详情，hover 可预览
 * - 操作：添加技能（Picker，搜索本机真实资源）/ 移除技能（确认），全部经 Service → Store
 * - 只删关系，不删真实资源；Agent / Run 相关旧区块已按用户决定从 UI 移除（后端兼容保留）
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FolderKanban, Plus, Search, Trash2, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { resourceTypeLabel, type ProjectResource, type ResourceType } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

/** 稳定空引用：避免 selector 每次返回新数组导致 zustand 无限重渲染 */
const EMPTY_RESOURCES: ProjectResource[] = [];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const projects = useWorkspaceStore((s) => s.projects);
  const projectResources = useWorkspaceStore((s) => s.projectResourcesById[projectId] ?? EMPTY_RESOURCES);
  const fetchProjectResources = useWorkspaceStore((s) => s.fetchProjectResources);
  const attachProjectResources = useWorkspaceStore((s) => s.attachProjectResources);
  const detachProjectResource = useWorkspaceStore((s) => s.detachProjectResource);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) void fetchProjectResources(projectId);
  }, [hydrated, fetchProjectResources, projectId]);

  // Hooks 必须无条件调用：类型分布在 early-return 之前计算
  const typeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of projectResources) {
      const t = r.resource.type;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [projectResources]);

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

  async function handleConfirmRemove() {
    if (!removeTarget || busy) return;
    setBusy(true);
    try {
      await detachProjectResource(projectId, removeTarget.id);
      toast.success(`已移除「${removeTarget.name}」`);
      setRemoveTarget(null);
    } catch {
      toast.error("移除失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={project.name}
        description={project.description || "这是一个使用场景项目"}
        actions={
          <Button variant="ghost" asChild>
            <Link href="/projects">
              <ArrowLeft />
              返回项目列表
            </Link>
          </Button>
        }
      />

      {/* 项目摘要 */}
      <Card className="rounded-xl bg-surface-1">
        <div className="flex items-center gap-2 px-5 pt-4">
          <FolderKanban className="h-3.5 w-3.5 text-ink-3" />
          <h3 className="text-[14px] font-semibold text-ink">项目摘要</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 divide-x divide-border/60 border-t border-border/60 lg:grid-cols-3">
          <div className="px-5 py-4">
            <p className="text-[11.5px] text-ink-3">关联技能</p>
            <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink">
              {projectResources.length}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-3/70">真实本机资源</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11.5px] text-ink-3">类型分布</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {typeDistribution.length === 0 ? (
                <p className="text-[12px] text-ink-3">—</p>
              ) : (
                typeDistribution.map((t) => (
                  <Badge key={t.type} variant="outline" className="border-white/10 text-[10px] font-normal text-ink-2">
                    {resourceTypeLabel(t.type as ResourceType)} · {t.count}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11.5px] text-ink-3">创建时间</p>
            <p className="mt-1 text-[14px] font-medium tabular-nums text-ink">
              {new Date(project.createdAt).toLocaleDateString("zh-CN")}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-3/70">
              最近更新 {formatRelativeTime(project.updatedAt)}
            </p>
          </div>
        </div>
      </Card>

      {/* 关联技能 */}
      <Card className="rounded-xl bg-surface-1">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Wrench className="h-3.5 w-3.5 text-ink-3" />
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-ink">关联技能</h3>
            <p className="mt-0.5 text-[12px] text-ink-3">
              本场景下可用的真实本机技能 · 只引用不复制 · 点击查看资源详情
            </p>
          </div>
          <Button size="sm" onClick={() => setPickerOpen(true)}>
            <Plus />
            添加技能
          </Button>
        </div>

        {projectResources.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Wrench className="h-5 w-5 text-ink-3" />
            <p className="text-[13px] text-ink-2">尚未关联技能</p>
            <p className="text-[12px] text-ink-3">
              从本机真实技能中挑选适合这个场景的资源，随时可移除
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {projectResources.map((pr) => {
              const r = pr.resource;
              const c = typeof r.metadata?.category === "string" ? r.metadata.category : null;
              return (
                <div
                  key={pr.id}
                  className="group relative flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-primary/30 hover:bg-white/[0.05]"
                >
                  <Link href={`/resources/${r.id}`} className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-ink">{r.name}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {c ? (
                        <Badge variant="outline" className="border-white/10 text-[10px] font-normal text-ink-3">
                          {c}
                        </Badge>
                      ) : null}
                      <Badge variant="outline" className="border-white/10 text-[10px] font-normal text-ink-3">
                        {resourceTypeLabel(r.type as ResourceType)}
                      </Badge>
                      {r.source ? (
                        <Badge variant="outline" className="border-white/10 text-[10px] font-normal text-ink-3">
                          {r.source}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-ink-2">
                      {r.description || "（无描述）"}
                    </p>
                    <p
                      className="mt-2 truncate font-mono text-[10px] text-ink-3"
                      title={r.sourcePath}
                    >
                      {r.sourcePath}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setRemoveTarget({ id: r.id, name: r.name })}
                    aria-label={`移除 ${r.name}`}
                    className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-white/5 hover:text-danger group-hover:flex"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ResourcePicker
        key={pickerOpen ? "open" : "closed"}
        projectId={projectId}
        projectName={project.name}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        attachedIds={new Set(projectResources.map((pr) => pr.resourceId))}
        onAttach={async (resourceIds) => {
          await attachProjectResources(projectId, resourceIds);
        }}
      />

      {/* 移除确认 */}
      <Dialog open={removeTarget !== null} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>移除技能</DialogTitle>
            <DialogDescription>
              将「{removeTarget?.name}」从「{project.name}」移除。仅解除关联，不会删除本机真实资源。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={busy}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={busy}>
              确认移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 添加技能 Picker：搜索本机真实技能 → 勾选 → 批量添加 */
function ResourcePicker({
  projectId,
  projectName,
  open,
  onOpenChange,
  attachedIds,
  onAttach,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachedIds: Set<string>;
  onAttach: (resourceIds: string[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const allResources = useWorkspaceStore((s) => s.discovery.resources);
  const loading = useWorkspaceStore((s) => s.discovery.loading);
  const fetchDiscoveredResources = useWorkspaceStore((s) => s.fetchDiscoveredResources);

  // 挂载时拉取一次候选（Dialog 由外层 key 重挂载，初始即空态）
  useEffect(() => {
    void fetchDiscoveredResources({ pageSize: 50, search: undefined });
  }, [fetchDiscoveredResources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allResources.filter(
      (r) =>
        !attachedIds.has(r.id) &&
        (q === "" ||
          r.name.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          (r.source ?? "").toLowerCase().includes(q))
    );
  }, [allResources, attachedIds, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAttach() {
    if (busy || selected.size === 0) return;
    setBusy(true);
    try {
      await onAttach(Array.from(selected));
      toast.success(`已添加 ${selected.size} 个技能`);
      onOpenChange(false);
    } catch {
      toast.error("添加失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加技能到「{projectName}」</DialogTitle>
          <DialogDescription>
            从本机真实扫描结果中选择技能；已关联的自动隐藏
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索技能名称 / 描述 / 来源…"
            className="bg-white/[0.03] pl-8"
          />
        </div>
        <div className="flex max-h-[320px] flex-col gap-1 overflow-auto">
          {loading && filtered.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-ink-3">加载中…</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-ink-3">
              {query ? "没有匹配的技能" : "没有可添加的技能"}
            </p>
          ) : (
            filtered.slice(0, 30).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r.id)}
                aria-pressed={selected.has(r.id)}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected.has(r.id)
                    ? "border-primary/40 bg-primary/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-ink">{r.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {r.source ?? "未知来源"} · {r.type}
                    {typeof r.metadata?.category === "string" ? ` · ${r.metadata.category}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-ink-3">{selected.has(r.id) ? "已选" : "选择"}</span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void handleAttach()} disabled={busy || selected.size === 0}>
            {busy ? "添加中…" : `添加所选（${selected.size}）`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
