/**
 * 按类别分组浏览 —— 将 Hermes 技能按真实 category 元数据分组展示。
 *
 * 数据：全量拉取 harness=hermes&type=skill（分页合并），按 metadata.category 聚合，
 * 无 category 的技能归入「未分类」。零演示数据。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FolderOpen, LayoutGrid } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { fetchDiscoveredResources } from "@/lib/services/resource-discovery";
import type { DiscoveredResource } from "@/lib/types";

function usageOf(resource: DiscoveredResource): string {
  const u = resource.metadata?.usage;
  if (typeof u === "string" && u.trim()) return u;
  return resource.description || "（无描述）";
}

export function CategoryBrowser() {
  const [skills, setSkills] = useState<DiscoveredResource[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: DiscoveredResource[] = [];
        let page = 1;
        for (;;) {
          const r = await fetchDiscoveredResources({
            harness: "hermes",
            type: "skill",
            parseable: true,
            page,
            pageSize: 100,
          });
          all.push(...r.items);
          if (all.length >= r.total || all.length === 0) break;
          page += 1;
        }
        if (!cancelled) setSkills(all);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    if (!skills) return [];
    const map = new Map<string, DiscoveredResource[]>();
    for (const s of skills) {
      const cat =
        typeof s.metadata?.category === "string" && s.metadata.category.trim()
          ? s.metadata.category
          : "未分类";
      const arr = map.get(cat) ?? [];
      arr.push(s);
      map.set(cat, arr);
    }
    return [...map.entries()]
      .map(([category, items]) => ({ category, items, count: items.length }))
      .sort((a, b) => b.count - a.count);
  }, [skills]);

  if (error) {
    return (
      <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[12px] text-danger">
        类别加载失败：{error}
      </div>
    );
  }

  if (skills === null) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full rounded-xl bg-white/[0.04]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.07] py-10 text-ink-3">
        <LayoutGrid className="size-5" />
        <p className="text-[12px]">未找到可分类的技能资源</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12px] text-ink-3">
        Hermes 技能共 {skills.length} 个 · {groups.length} 个类别
      </p>
      {groups.map((g) => (
        <section key={g.category} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-3.5 text-primary" />
            <h3 className="text-[13px] font-semibold text-ink">{g.category}</h3>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10.5px] text-ink-3">
              {g.count}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((s) => (
              <Link
                key={s.id}
                href={`/resources/${s.id}`}
                className="group flex h-full flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-primary/30 hover:bg-white/[0.04]"
              >
                <p className="truncate text-[12.5px] font-medium text-ink">{s.name}</p>
                <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-relaxed text-ink-2">
                  {usageOf(s)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
