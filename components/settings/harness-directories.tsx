/**
 * Settings —— Harness 目录清单（客户端，来自同一 Store 数据源）。
 *
 * 与 /resources 的 HarnessGrid 同源（discovery.overview.harnesses），
 * 展示每个 Harness 的真实探测路径与资源数。
 */
"use client";

import { useEffect } from "react";
import { Check, CircleSlash2, FolderSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";

export function HarnessDirectories() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const overview = useWorkspaceStore((s) => s.discovery.overview);
  const fetchOverview = useWorkspaceStore((s) => s.fetchDiscoveryOverview);

  useEffect(() => {
    void hydrate().then(() => fetchOverview());
  }, [hydrate, fetchOverview]);

  if (!hydrated || !overview) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[64px] rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  const harnesses = overview.harnesses.filter((h) => h.found);

  if (harnesses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.07] py-8 text-ink-3">
        <FolderSearch className="size-5" />
        <p className="text-[12px]">尚未扫描本机（在「Local Resources」页点击扫描）</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {harnesses.map((h) => (
        <div
          key={h.harnessId}
          className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/[0.08]">
            <Check className="size-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[12.5px] font-medium text-ink">{h.harnessName}</p>
              <Badge
                variant="outline"
                className="border-white/10 bg-white/[0.03] px-1.5 py-0 text-[10px] font-normal text-ink-2"
              >
                {h.resourceCount} 资源
              </Badge>
            </div>
            <p className="truncate font-mono text-[10.5px] text-ink-2">{h.rootPath}</p>
          </div>
        </div>
      ))}
      {overview.harnesses.filter((h) => !h.found).length > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-ink-3">
          <CircleSlash2 className="size-4 shrink-0" />
          <p className="text-[11.5px]">
            另有 {overview.harnesses.filter((h) => !h.found).length} 个 Harness 未在本机命中
            （Claude / Codex 等目录不存在或未配置）
          </p>
        </div>
      ) : null}
    </div>
  );
}
