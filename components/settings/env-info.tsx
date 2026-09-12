/**
 * Settings —— 本机环境信息（服务端渲染，真实数据）。
 *
 * 展示运行模式 / SQLite 数据文件路径与大小；纯只读，不做可写偏好。
 */
import { Database, HardDrive, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function EnvInfo({
  mode,
  dbPath,
  dbSizeBytes,
}: {
  mode: "real" | "mock";
  dbPath: string;
  dbSizeBytes: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-primary" />
          <p className="text-[11px] text-ink-2">运行模式</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-semibold text-ink">{mode === "real" ? "Real" : "Mock"}</p>
          <Badge
            variant="outline"
            className="border-white/10 bg-white/[0.03] px-1.5 py-0 text-[10px] font-normal text-ink-2"
          >
            {mode === "real" ? "SQLite 直连" : "无真实数据 · 空态"}
          </Badge>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-3">
          读写走 Drizzle + better-sqlite3（服务端）
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Database className="size-3.5 text-primary" />
          <p className="text-[11px] text-ink-2">数据文件</p>
        </div>
        <p className="truncate font-mono text-[13px] font-medium text-ink" title={dbPath}>
          {dbPath}
        </p>
        <p className="text-[11px] text-ink-3">
          当前体积 {formatBytes(dbSizeBytes)} · 可由 DATABASE_URL 覆盖
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <HardDrive className="size-3.5 text-primary" />
          <p className="text-[11px] text-ink-2">存储策略</p>
        </div>
        <p className="text-[13px] font-medium text-ink">仅本地</p>
        <p className="text-[11px] leading-relaxed text-ink-3">
          数据目录已 gitignore，不随仓库发布；无远程服务器，扫描与存储均在本机
        </p>
      </div>
    </div>
  );
}
