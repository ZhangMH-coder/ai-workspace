/**
 * 相关资源推荐（真实派生，S1.28）
 * 共享 ResourceCapability 能力标签优先，其次同 Harness + 同类型；
 * 点击进入对应资源详情，可继续溯源到真实 sourcePath。
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";

export function RelatedResources({ resourceId }: { resourceId: string }) {
  const items = useWorkspaceStore((s) => s.discovery.relatedResources);
  const loading = useWorkspaceStore((s) => s.discovery.relatedLoading);
  const fetchRelated = useWorkspaceStore((s) => s.fetchRelatedResources);

  useEffect(() => {
    void fetchRelated(resourceId);
  }, [resourceId, fetchRelated]);

  return (
    <Card className="border-white/[0.07] bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
        <Link2 className="size-3.5 text-primary" />
        <h3 className="text-[13px] font-medium text-ink">相关资源</h3>
        <span className="text-[11px] text-ink-3">按共享能力 / 同类 Harness 派生</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-[12px] text-ink-3">
          未发现可关联的资源（无共享能力标签，且无同 Harness 同类资源）。
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.04]">
          {items.map((r, i) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25, ease: "easeOut" }}
            >
              <Link
                href={`/resources/${r.id}`}
                className="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-ink">{r.name}</p>
                    <Badge variant="outline" className="h-4.5 shrink-0 border-white/10 px-1.5 text-[10px] text-ink-2">
                      {r.type}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ink-3" title={r.sourcePath}>
                    {r.sourcePath}
                  </p>
                  {r.usage ? (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-2" title={r.usage}>
                      使用建议：{r.usage}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-ink-3">{r.reason}</span>
                  <ArrowRight className="size-3.5 text-ink-3 transition-colors group-hover:text-primary" />
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}
