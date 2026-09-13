/**
 * PinnedStrip —— 置顶资源快捷条（S1.51）
 *
 * 置顶资源无论在哪一页都能看到：跨页拉取（ids 精确取回），横向小卡直达详情；
 * 点击 PinOff 即时取消置顶（store 单一数据源，persist v6）。
 */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pin, PinOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { fetchDiscoveredResources } from "@/lib/services/resource-discovery";
import { resourceTypeLabel, type DiscoveredResource } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export function PinnedStrip() {
  const pinnedResourcePaths = useWorkspaceStore((s) => s.pinnedResourcePaths);
  const toggleResourcePin = useWorkspaceStore((s) => s.toggleResourcePin);
  const [items, setItems] = useState<DiscoveredResource[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // set 均在异步回调内（避免级联渲染）；置顶为空 → 空数组（隐藏区块）
    Promise.resolve()
      .then(() =>
        pinnedResourcePaths.length === 0
          ? []
          : fetchDiscoveredResources({ ids: pinnedResourcePaths }).then((r) => r.items)
      )
      .then((v) => {
        if (!cancelled) setItems(v);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pinnedResourcePaths]);

  if (!items) return null;
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Pin className="size-3.5 text-amber-300" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
          置顶资源
        </p>
        <span className="text-[10.5px] text-ink-3">{items.length} 个 · 跨页可见</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((r) => (
          <div
            key={r.sourcePath}
            className="group flex items-center gap-2.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2.5 transition-colors hover:border-amber-400/30"
          >
            <Link href={`/resources/${r.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-[12.5px] font-medium text-ink">{r.name}</p>
              <p className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="border-white/10 px-1.5 py-0 text-[10px] font-normal text-ink-3"
                >
                  {resourceTypeLabel(r.type)}
                </Badge>
                <span className="truncate font-mono text-[10px] text-ink-3">{r.source}</span>
              </p>
            </Link>
            <button
              type="button"
              onClick={() => toggleResourcePin(r.sourcePath)}
              title="取消置顶"
              aria-label={`取消置顶 ${r.name}`}
              className="shrink-0 rounded-md p-1 text-ink-3 opacity-0 transition-all hover:bg-white/[0.06] hover:text-ink group-hover:opacity-100"
            >
              <PinOff className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
