"use client";

/**
 * 资源能力索引页（Phase 2）：从真实资源归纳出的能力（可追溯）+ 任务匹配。
 */
import { PageHeader } from "@/components/shared/page-header";
import { CapabilityIndexView } from "@/components/resources/analysis/capability-index-view";

export default function ResourceCapabilitiesPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Resource Capabilities"
        description="从本机真实 Harness 资源归纳的能力索引（AI 分析，可追溯；无演示数据）"
      />
      <CapabilityIndexView />
    </div>
  );
}
