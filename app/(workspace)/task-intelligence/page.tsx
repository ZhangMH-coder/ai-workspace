"use client";

/**
 * 任务智能入口页（Phase 3）：任务理解与能力编排。
 * 所有推荐来自真实本地资源分析出的能力标签；零 Demo 数据。
 */
import { PageHeader } from "@/components/shared/page-header";
import { TaskIntelligenceView } from "@/components/task-intelligence/task-intelligence-view";

export default function TaskIntelligencePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Task Intelligence"
        description="任务 → 拆解 → 能力需求 → 真实资源推荐（可追溯证据链，仅编排不执行）"
      />
      <TaskIntelligenceView />
    </div>
  );
}
