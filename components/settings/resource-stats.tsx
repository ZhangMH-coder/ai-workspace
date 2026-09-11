/**
 * Settings —— 资源统计与扫描策略（只读展示，真实数据）。
 */
"use client";

import { ShieldCheck } from "lucide-react";

import { useWorkspaceStore } from "@/stores/workspace";
import { resourceTypeLabel, type ResourceType } from "@/lib/types";

const POLICIES = [
  { title: "严格只读", desc: "扫描仅读取文件内容与元数据，从不修改 / 移动 / 删除原始 Harness 文件" },
  { title: "幂等扫描", desc: "重复扫描不产生重复资源；已消失的路径自动清理为孤儿记录" },
  { title: "真实空态", desc: "无法解析的资源保留真实路径并标记「发现但暂无法解析」，绝不伪造数据" },
  { title: "可追溯", desc: "每个资源都保留 sourcePath，可追溯到原始文件；能力标签带 evidenceRef" },
];

export function ResourceStats() {
  const overview = useWorkspaceStore((s) => s.discovery.overview);

  const scanRun = overview?.scanRun ?? null;
  const byType = scanRun?.byType ?? {};

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="已索引资源" value={overview ? String(overview.totalResources) : "…"} />
        <Stat
          label="已解析"
          value={overview ? String(overview.parseableCount) : "…"}
          hint={`${overview ? overview.totalResources - overview.parseableCount : 0} 个待解析`}
        />
        <Stat
          label="命中的 Harness"
          value={overview ? String(overview.harnesses.filter((h) => h.found).length) : "…"}
        />
        <Stat
          label="上次扫描"
          value={scanRun ? formatAgo(scanRun.finishedAt) : "—"}
          hint={scanRun ? scanRun.status : "未扫描"}
        />
      </div>

      {Object.keys(byType).length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, n]) => (
              <span
                key={type}
                className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-ink-2"
              >
                {resourceTypeLabel(type as ResourceType)}
                <span className="ml-1 font-medium text-ink">{n}</span>
              </span>
            ))}
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-2">
        {POLICIES.map((p) => (
          <div key={p.title} className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary/80" />
            <p className="text-[11.5px] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">{p.title}</span>
              <span className="text-ink-3"> — {p.desc}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className="text-[20px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {hint ? <p className="text-[11px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "刚刚";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} 分钟前`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} 小时前`;
  return new Date(iso).toLocaleDateString();
}
