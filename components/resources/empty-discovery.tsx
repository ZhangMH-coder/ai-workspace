/**
 * Resource Discovery —— 空态 / 未发现态（V1 MVP）
 *
 * 原则：不伪造数据。未扫描 / 未发现 / Mock 模式分别展示真实状态与原因，
 * 并列出扫描过的候选位置（来自服务端 scan_run.locations 或默认候选根）。
 */
import { FileQuestion, Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ScanLocation } from "@/lib/types";

/** 未执行过扫描时的默认候选根说明（与服务端 buildCandidates 一致） */
const DEFAULT_CANDIDATES: ScanLocation[] = [
  { path: "HOME", label: "HOME", hits: [] },
  { path: "LOCALAPPDATA", label: "LOCALAPPDATA", hits: [] },
  { path: "APPDATA", label: "APPDATA", hits: [] },
  { path: "CWD", label: "CWD", hits: [] },
];

export function EmptyDiscovery({
  mode,
  locations,
  scanRunStatus,
}: {
  /** "never-scanned" | "mock" | "none-found" */
  mode: "never-scanned" | "mock" | "none-found";
  locations?: ScanLocation[] | null;
  scanRunStatus?: string;
}) {
  const shown = locations && locations.length > 0 ? locations : DEFAULT_CANDIDATES;

  const title =
    mode === "mock"
      ? "Mock 模式不执行真实扫描"
      : mode === "none-found"
        ? "未发现本地资源"
        : "尚未扫描本地资源";

  const desc =
    mode === "mock"
      ? "当前运行于 Mock 模式（前端回滚通道）。本功能只读取真实本地文件，Mock 模式不扫描、不生成任何演示数据。请以 Real 模式运行以发现本机 Harness 资源。"
      : mode === "none-found"
        ? "已按候选位置完成扫描，但未发现可识别的 AI Harness 资源。以下是本次扫描覆盖的位置："
        : "点击「扫描本机资源」开始只读发现本机存在的 AI Harness / Skill / Agent 资源。扫描仅读取文件元数据，不修改任何原始文件。";

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05]">
        {mode === "none-found" ? (
          <FileQuestion className="size-5 text-ink-2" />
        ) : (
          <Radar className="size-5 text-ink-2" />
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-ink-2">{desc}</p>
      </div>

      {mode !== "mock" ? (
        <div className="mt-1 w-full max-w-xl">
          <Separator className="bg-white/[0.06]" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {shown.map((loc) => (
              <Badge
                key={loc.label}
                variant="outline"
                className="border-white/10 bg-white/[0.04] px-2.5 py-1 font-normal text-ink-2"
              >
                <span className="font-medium text-ink">{loc.label}</span>
                <span className="ml-1.5 max-w-[220px] truncate font-mono text-[11px]">
                  {loc.path === "HOME" || loc.path === "LOCALAPPDATA" || loc.path === "APPDATA" || loc.path === "CWD"
                    ? `环境根：${loc.path}`
                    : loc.path}
                </span>
              </Badge>
            ))}
          </div>
          {scanRunStatus === "partial" ? (
            <p className="mt-3 text-[12px] text-warning">
              本次扫描部分 Harness 失败（partial），结果可能不完整。
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
