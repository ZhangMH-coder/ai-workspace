import { Bot } from "lucide-react";

import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { PageHeader } from "@/components/shared/page-header";

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Agents" description="创建、配置与运行你的智能体" />
      <ModulePlaceholder
        icon={Bot}
        title="模块建设中"
        description="该模块将在后续阶段实现。当前阶段已完成产品外壳、导航与基础视觉体系。"
      />
    </div>
  );
}
