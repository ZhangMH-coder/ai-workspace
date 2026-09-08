/**
 * Resource Discovery —— Harness 命中网格（V1 MVP）
 *
 * 展示每个 Harness 的命中结果：根路径 + 资源数 + 分类数；未命中的如实显示 found=false。
 */
import { Check, CircleSlash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { HarnessScanSummary } from "@/lib/types";

export function HarnessGrid({
  harnesses,
  totalResources,
}: {
  harnesses: HarnessScanSummary[];
  totalResources: number;
}) {
  if (harnesses.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {harnesses.map((h) => (
        <div
          key={h.harnessId}
          className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-md border ${
                  h.found
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.04] text-ink-2"
                }`}
              >
                {h.found ? (
                  <Check className="size-3.5" />
                ) : (
                  <CircleSlash2 className="size-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{h.harnessName}</p>
                <p className="truncate text-[11px] text-ink-2">{h.harnessId}</p>
              </div>
            </div>
            <Badge
              variant={h.found ? "default" : "outline"}
              className={h.found ? "" : "border-white/10 text-ink-2"}
            >
              {h.resourceCount}
            </Badge>
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-[11px] text-ink-2">
              {h.found ? h.rootPath : "未在候选位置命中"}
            </p>
          </div>
          {!h.found ? (
            <p className="text-[11px] text-ink-3">该 Harness 在本机未安装或未配置</p>
          ) : null}
        </div>
      ))}
      {totalResources === 0 ? (
        <p className="col-span-full text-center text-[12px] text-ink-3">
          所有 Harness 合计 0 个资源（无伪造数据：目录存在但无可识别资源时如实显示 0）
        </p>
      ) : null}
    </div>
  );
}
