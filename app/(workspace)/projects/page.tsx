"use client";

/**
 * Projects 列表（S1.55：项目 = 使用场景组织单元）
 *
 * - 项目卡片：名称/描述/关联真实技能数/资源类型分布（resourceCount 与 resourceTypes 由服务端派生）
 * - 资源数据全部来自本机真实扫描索引，不复制资源实体
 * - 「新建项目」→ Dialog → 创建成功跳转详情引导关联技能
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { useWorkspaceStore, sortProjectsByActivity } from "@/stores/workspace";

export default function ProjectsPage() {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const projects = useWorkspaceStore((s) => s.projects);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = sortProjectsByActivity(projects);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="项目"
        description="使用场景组织单元：把本机真实技能/资源挂到场景下，随时知道这个场景有什么可用"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            新建项目
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 rounded-xl bg-surface-1 py-16 text-center">
          <FolderKanban className="h-6 w-6 text-ink-3" />
          <p className="text-[13.5px] text-ink-2">暂无项目</p>
          <p className="text-[12px] text-ink-3">创建一个使用场景（如「写小红书笔记」），再把相关技能关联进来</p>
          <Button size="sm" className="mt-1" onClick={() => setFormOpen(true)}>
            <Plus />
            新建项目
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const resourceCount = p.resourceCount ?? 0;
            const types = p.resourceTypes ?? [];
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex flex-col rounded-xl border border-border/60 bg-surface-1 p-4 transition-colors duration-150 hover:border-white/10 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                      <FolderKanban className="h-4 w-4 text-ink-2" />
                    </div>
                    <p className="truncate text-[13.5px] font-semibold text-ink">
                      {p.name}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                    Active
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 min-h-[34px] text-[12px] leading-relaxed text-ink-3">
                  {p.description}
                </p>

                <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-[12px]">
                  <span className="font-medium tabular-nums text-ink-2">
                    {resourceCount} 个技能
                  </span>
                  {types.slice(0, 3).map((t) => (
                    <span
                      key={t.type}
                      className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10.5px] text-ink-3"
                    >
                      {t.type} · {t.count}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-ink-3/70">
                  最近更新 {formatRelativeTime(p.updatedAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <ProjectFormDialog
        key={String(formOpen)}
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(projectId) => router.push(`/projects/${projectId}`)}
      />
    </div>
  );
}
