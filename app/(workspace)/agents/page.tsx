"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect } from "react";

import {
  AgentCard,
  AgentCardSkeleton,
} from "@/components/agents/agent-card";
import { AgentTemplates } from "@/components/agents/agent-templates";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore, EMPTY_RUNS_STATS } from "@/stores/workspace";
import type { Project, ProjectAgent } from "@/lib/types";

function projectsOfAgent(
  projects: Project[],
  projectAgents: ProjectAgent[],
  agentId: string
): Project[] {
  const ids = new Set(
    projectAgents.filter((pa) => pa.agentId === agentId).map((pa) => pa.projectId)
  );
  return projects.filter((p) => ids.has(p.id));
}

export default function AgentsPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const stats = useWorkspaceStore((s) => s.stats);
  const projects = useWorkspaceStore((s) => s.projects);
  const projectAgents = useWorkspaceStore((s) => s.projectAgents);
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

      {/* S1.56：代码智囊团模板（空态/非空态都展示，一键创建为真实 Agent） */}
      <AgentTemplates agentsCreated={agents.map((a) => a.name)} />

      {!hydrated ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
          <p className="text-[14px] font-medium text-ink-2">还没有 Agent</p>
          <p className="text-[13px] text-ink-3">
            从上方代码智囊团一键创建，或新建自定义智能体
          </p>
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
                stats={stats?.byAgent[agent.id] ?? EMPTY_RUNS_STATS}
                projectsOf={projectsOfAgent(projects, projectAgents, agent.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
