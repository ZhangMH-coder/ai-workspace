"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AgentForm } from "@/components/agents/agent-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export default function NewAgentPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="新建 Agent"
        description="定义名称、模型与系统提示词，创建后即可运行"
        actions={
          <Button variant="ghost" asChild>
            <Link href="/agents">
              <ArrowLeft />
              返回列表
            </Link>
          </Button>
        }
      />
      <AgentForm />
    </div>
  );
}
