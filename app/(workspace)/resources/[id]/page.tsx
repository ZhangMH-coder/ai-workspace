"use client";

/**
 * 资源详情页：真实来源溯源 + 能力分析（Phase 2）。
 */
import { useEffect } from "react";
import { useParams } from "next/navigation";

import { EmptyDiscovery } from "@/components/resources/empty-discovery";
import { InsightPanel } from "@/components/resources/analysis/insight-panel";
import { ResourceDetail } from "@/components/resources/resource-detail";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";

export default function ResourceDetailPage() {
  const params = useParams<{ id: string }>();
  const detail = useWorkspaceStore((s) => s.discovery.resourceDetail);
  const loading = useWorkspaceStore((s) => s.discovery.loading);
  const error = useWorkspaceStore((s) => s.discovery.error);
  const fetchDetail = useWorkspaceStore((s) => s.fetchResourceDetail);

  useEffect(() => {
    void fetchDetail(params.id);
  }, [params.id, fetchDetail]);

  if (loading && !detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-64 bg-white/[0.04]" />
        <Skeleton className="h-40 w-full rounded-xl bg-white/[0.04]" />
        <Skeleton className="h-28 w-full rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <EmptyDiscovery mode="none-found" locations={null} />
    );
  }

  if (!detail) return null;
  return (
    <div className="flex flex-col gap-4">
      <ResourceDetail resource={detail} />
      <Separator className="bg-white/[0.06]" />
      <InsightPanel resourceId={detail.id} />
    </div>
  );
}
