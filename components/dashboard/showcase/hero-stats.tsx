/**
 * 展示首页 — Hero 大数字统计（真实数据）
 */
import { motion } from "framer-motion";
import { Boxes, CheckCircle2, Gauge, Sparkles } from "lucide-react";

import { formatNumber } from "@/lib/format";

export interface HeroStatsData {
  totalResources: number;
  parseableCount: number;
  harnessCount: number;
  hermesCount: number;
  lastScannedAt: string | null;
}

function StatItem({
  icon,
  value,
  label,
  delay,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-[20px] font-semibold leading-tight tracking-tight text-ink">{value}</p>
        <p className="text-[11px] text-ink-3">{label}</p>
      </div>
    </motion.div>
  );
}

export function HeroStats({ data }: { data: HeroStatsData | null }) {
  if (!data) return null;
  const items = [
    { icon: <Boxes className="size-4" />, value: formatNumber(data.totalResources), label: "已发现真实资源" },
    { icon: <CheckCircle2 className="size-4" />, value: formatNumber(data.parseableCount), label: "成功解析" },
    { icon: <Gauge className="size-4" />, value: formatNumber(data.harnessCount), label: "Harness 框架" },
    { icon: <Sparkles className="size-4" />, value: formatNumber(data.hermesCount), label: "Hermes 资源 · 你的主力" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((it, i) => (
          <StatItem key={it.label} icon={it.icon} value={it.value} label={it.label} delay={0.08 * i} />
        ))}
      </div>
      {data.lastScannedAt ? (
        <p className="text-center text-[11px] text-ink-3">
          上次扫描 <span className="text-ink-2">{formatAgo(data.lastScannedAt)}</span> · 数据只存本地库
        </p>
      ) : null}
    </div>
  );
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "刚刚";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} 分钟前`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} 小时前`;
  return new Date(iso).toLocaleString();
}
