"use client";

/**
 * Local Resources —— 本机 AI Harness 资源发现（V1 MVP）
 *
 * 真实数据验证页面：展示扫描到的真实资源（无 Demo 数据）；
 * 支持重新扫描（只读、幂等）；未扫描 / 未发现 / Mock 模式展示真实空态。
 */
import { useEffect } from "react";
import { RotateCcw, ScanSearch } from "lucide-react";
import { toast } from "sonner";

import { EmptyDiscovery } from "@/components/resources/empty-discovery";
import { HarnessGrid } from "@/components/resources/harness-grid";
import { ResourceTable } from "@/components/resources/resource-table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";
import { __USE_MOCK__ } from "@/lib/services/mode";
import { resourceTypeLabel, type ResourceType } from "@/lib/types";

export default function ResourcesPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const overview = useWorkspaceStore((s) => s.discovery.overview);
  const scanning = useWorkspaceStore((s) => s.discovery.scanning);
  const loading = useWorkspaceStore((s) => s.discovery.loading);
  const error = useWorkspaceStore((s) => s.discovery.error);
  const fetchOverview = useWorkspaceStore((s) => s.fetchDiscoveryOverview);
  const runScan = useWorkspaceStore((s) => s.runResourceScan);

  useEffect(() => {
    void hydrate().then(() => fetchOverview());
  }, [hydrate, fetchOverview]);

  async function handleScan() {
    try {
      await runScan();
      await fetchOverview();
      toast.success("扫描完成：已更新本机资源索引");
    } catch {
      toast.error("扫描失败，请查看错误信息");
    }
  }

  const scanRun = overview?.scanRun ?? null;
  const total = overview?.totalResources ?? 0;
  const parseableCount = overview?.parseableCount ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Local Resources"
        description="只读发现本机真实存在的 AI Harness / Skill / Agent 资源并建立统一索引（无演示数据）"
        actions={
          <Button onClick={handleScan} disabled={scanning} className="h-8 gap-1.5 text-[12px]">
            {scanning ? (
              <RotateCcw className="size-3.5 animate-spin" />
            ) : (
              <ScanSearch className="size-3.5" />
            )}
            {scanning ? "扫描中…" : scanRun ? "重新扫描" : "扫描本机资源"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[12px] text-danger">
          资源发现请求失败：{error}
        </div>
      ) : null}

      {!hydrated || (loading && !overview) ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[92px] rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : scanRun === null ? (
        /* 未扫描 / Mock / 未发现 → 结构化空态（不伪造） */
        <EmptyDiscovery mode={__USE_MOCK__ ? "mock" : "never-scanned"} locations={null} />
      ) : (
        <div className="flex flex-col gap-5">
          {/* 统计条 */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="已索引资源"
              value={String(total)}
              hint={`${parseableCount} 个已解析`}
            />
            <StatCard
              label="命中的 Harness"
              value={String(overview?.harnesses.filter((h) => h.found).length ?? 0)}
              hint="详见下方网格"
            />
            <StatCard
              label="上次扫描"
              value={formatAgo(scanRun.finishedAt)}
              hint={scanRun.status === "partial" ? "部分失败（partial）" : "completed"}
            />
            <StatCard
              label="本次覆盖位置"
              value={String(scanRun.locations.length)}
              hint="候选根 + Harness 命中"
            />
          </div>

          {/* 类型分布 */}
          {Object.keys(scanRun.byType).length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(scanRun.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="border-white/10 bg-white/[0.03] px-2.5 py-1 font-normal"
                  >
                    <span className="text-ink-2">{resourceTypeLabel(type as ResourceType)}</span>
                    <span className="ml-1.5 font-medium text-ink">{n}</span>
                  </Badge>
                ))}
            </div>
          ) : null}

          {/* Harness 命中 */}
          <HarnessGrid harnesses={overview?.harnesses ?? []} totalResources={total} />

          {/* 资源列表 */}
          <Card className="border-white/10 bg-transparent">
            <CardHeader className="px-4 pt-4">
              <CardTitle className="text-[14px] font-semibold text-ink">
                资源索引
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ResourceTable />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className="text-[22px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {hint ? <p className="text-[11px] text-ink-3">{hint}</p> : null}
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
