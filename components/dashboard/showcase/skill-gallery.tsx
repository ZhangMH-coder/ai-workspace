/**
 * 展示首页 — 精选 Hermes 技能画廊（真实数据）
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DiscoveredResource } from "@/lib/types";

function usageOf(resource: DiscoveredResource): string {
  const u = resource.metadata?.usage;
  if (typeof u === "string" && u.trim()) return u;
  return resource.description || "（无描述）";
}

export function SkillGallery({ skills }: { skills: DiscoveredResource[] }) {
  if (skills.length === 0) return null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">精选 Hermes 技能</p>
        <Link href="/resources?harness=hermes" className="text-[12px] text-ink-3 hover:text-primary">
          查看全部 →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((s, i) => {
          const category =
            typeof s.metadata?.category === "string" ? s.metadata.category : null;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + 0.05 * i, duration: 0.3, ease: "easeOut" }}
            >
              <Link
                href={`/resources/${s.id}`}
                className="group flex h-full flex-col rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-primary/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-medium text-ink">{s.name}</p>
                  <ArrowUpRight className="size-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-primary" />
                </div>
                {category ? (
                  <Badge variant="outline" className="mt-1.5 w-fit border-white/10 text-[10px] font-normal text-ink-3">
                    <FolderOpen className="mr-1 size-2.5" />
                    {category}
                  </Badge>
                ) : null}
                <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-ink-2">
                  {usageOf(s)}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
