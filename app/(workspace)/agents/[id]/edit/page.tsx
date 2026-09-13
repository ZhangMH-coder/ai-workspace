"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";
import { useEffect } from "react";

import { AgentForm } from "@/components/agents/agent-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";

/** S1.60：编辑 Agent（复用 AgentForm 编辑模式，保存走 updateAgent） */
export default function AgentEditPage() {
  const params = useParams<{ id: string }>();
  const agentId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const hydrate = useWorkspaceStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  const agent = agents.find((a) => a.id === agentId);

  if (!agent || agent.archivedAt) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <Bot className="h-6 w-6 text-ink-3" />
        <p className="text-[14px] font-medium text-ink-2">未找到该 Agent</p>
        <p className="text-[13px] text-ink-3">它可能已被归档，或链接有误</p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/agents">
            <ArrowLeft />
            返回列表
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`编辑 ${agent.name}`}
        description="修改名称、模型、描述与系统提示词"
        actions={
          <Button variant="ghost" asChild>
            <Link href={`/agents/${agent.id}`}>
              <ArrowLeft />
              返回详情
            </Link>
          </Button>
        }
      />
      <AgentForm initial={agent} />
    </div>
  );
}
