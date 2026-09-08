"use client";

import Link from "next/link";
import { Plus, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AgentCard,
  AgentCardSkeleton,
} from "@/components/agents/agent-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const resetDemoData = useWorkspaceStore((s) => s.resetDemoData);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  async function handleReset() {
    setResetting(true);
    try {
      await resetDemoData();
      toast.success("演示数据已重置为初始状态");
    } catch {
      toast.error("重置失败，请重试");
    } finally {
      setResetting(false);
      setResetOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agents"
        description="创建、配置与运行你的智能体"
        actions={
          <>
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="default">
                  <RotateCcw />
                  重置演示数据
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[92vw] max-w-md rounded-xl">
                <DialogHeader>
                  <DialogTitle>重置演示数据？</DialogTitle>
                  <DialogDescription>
                    将丢弃当前所有 Agent 与运行记录，恢复到初始演示数据（5 个
                    Agent）。此操作会同步更新本地持久化数据，不可撤销。
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setResetOpen(false)}
                    disabled={resetting}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReset}
                    disabled={resetting}
                  >
                    {resetting ? "重置中…" : "确认重置"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button asChild>
              <Link href="/agents/new">
                <Plus />
                新建 Agent
              </Link>
            </Button>
          </>
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
