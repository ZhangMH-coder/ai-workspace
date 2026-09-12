/**
 * 展示首页 — Hermes 配置亮点 + 人设（来自真实 config.yaml / SOUL.md）
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Cpu, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DiscoveredResource } from "@/lib/types";

interface HermesConfigMeta {
  defaultModel?: string | null;
  provider?: string | null;
  modelCount?: number | null;
}

function metaOf(resource: DiscoveredResource): HermesConfigMeta {
  const m = resource.metadata ?? {};
  return {
    defaultModel: typeof m.defaultModel === "string" ? m.defaultModel : null,
    provider: typeof m.provider === "string" ? m.provider : null,
    modelCount: typeof m.modelCount === "number" ? m.modelCount : null,
  };
}

function usageOf(resource: DiscoveredResource): string {
  const u = resource.metadata?.usage;
  if (typeof u === "string" && u.trim()) return u;
  return resource.description || "（无描述）";
}

export function HermesSpotlight({
  config,
  profiles,
  manualModel,
}: {
  config: DiscoveredResource | null;
  profiles: DiscoveredResource[];
  /** AI Workspace 手动配置的生效模型（如已配置；不覆盖 Hermes 自身配置，仅叠加展示） */
  manualModel?: string | null;
}) {
  const cfg = config ? metaOf(config) : null;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {/* 配置卡 */}
      {config && cfg ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35, ease: "easeOut" }}
        >
          <Card className="h-full border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Cpu className="size-4" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-ink">Hermes 运行配置</p>
                <p className="text-[11px] text-ink-3">来自 config.yaml · 只读</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {cfg.defaultModel ? (
                <Badge className="border-primary/25 bg-primary/10 text-primary">
                  默认模型 {cfg.defaultModel}
                </Badge>
              ) : null}
              {cfg.provider ? (
                <Badge variant="outline" className="border-white/10 text-ink-2">
                  Provider {cfg.provider}
                </Badge>
              ) : null}
              {typeof cfg.modelCount === "number" && cfg.modelCount > 0 ? (
                <Badge variant="outline" className="border-white/10 text-ink-2">
                  {cfg.modelCount} 个可用模型
                </Badge>
              ) : null}
              {manualModel ? (
                <Badge variant="outline" className="border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                  AI Workspace 当前生效 · {manualModel}
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-ink-2">
              {usageOf(config)}
            </p>
            <Link
              href={`/resources/${config.id}`}
              className="mt-3 inline-block text-[12px] font-medium text-primary hover:underline"
            >
              查看配置详情 →
            </Link>
          </Card>
        </motion.div>
      ) : null}

      {/* 人设卡 */}
      {profiles.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.35, ease: "easeOut" }}
        >
          <Card className="h-full border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <UserRound className="size-4" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-ink">你的 Hermes 人设</p>
                <p className="text-[11px] text-ink-3">来自 profiles/*/SOUL.md</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {profiles.map((p) => (
                <Link
                  key={p.id}
                  href={`/resources/${p.id}`}
                  className="group flex items-start justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-primary/25"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-3">{usageOf(p)}</p>
                  </div>
                  <span className="mt-0.5 shrink-0 text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
