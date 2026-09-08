"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect } from "react";

import {
  AgentCard,
  AgentCardSkeleton,
} from "@/components/agents/agent-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore, selectAgentStats } from "@/stores/workspace";

export default function AgentsPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const runs = useWorkspaceStore((s) => s.runs);
  const hydrate = useWorkspaceStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agents"
        description="创建、配置与运行你的智能体"
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Plus />
              新建 Agent
            </Link>
          </Button>
        }
      />

      {!hydrated ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-[14px] font-medium text-ink-2">还没有 Agent</p>
          <p className="text-[13px] text-ink-3">创建第一个智能体，开始你的 AI 工作流</p>
          <Button asChild className="mt-2">
            <Link href="/agents/new">
              <Plus />
              新建 Agent
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-3">
            共 {agents.length} 个 Agent · 点击卡片查看详情与运行历史
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                stats={selectAgentStats(runs, agent.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
