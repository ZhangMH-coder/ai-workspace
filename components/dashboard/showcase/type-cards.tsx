/**
 * 展示首页 — 资源类型分类卡（技能 / 人设 / 规则 / 插件）
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Puzzle, ScrollText, Sparkles } from "lucide-react";

import { formatNumber } from "@/lib/format";

export interface TypeCardData {
  type: string;
  label: string;
  count: number;
  description: string;
}

const ICONS: Record<string, React.ReactNode> = {
  skill: <Sparkles className="size-4" />,
  prompt: <Bot className="size-4" />,
  rule: <ScrollText className="size-4" />,
  plugin: <Puzzle className="size-4" />,
};

export function TypeCards({ cards }: { cards: TypeCardData[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.type}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + 0.07 * i, duration: 0.35, ease: "easeOut" }}
        >
          <Link
            href={`/resources?type=${c.type}`}
            className="group block h-full rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-primary/30 hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {ICONS[c.type] ?? null}
              </div>
              <span className="text-[24px] font-semibold tracking-tight text-ink">
                {formatNumber(c.count)}
              </span>
            </div>
            <p className="mt-3 text-[14px] font-medium text-ink">{c.label}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-3">
              {c.description}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
