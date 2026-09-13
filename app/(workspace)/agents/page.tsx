"use client";

import Link from "next/link";
import { Bot, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AgentCard,
  AgentCardSkeleton,
} from "@/components/agents/agent-card";
import { AgentTemplates } from "@/components/agents/agent-templates";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore, EMPTY_RUNS_STATS } from "@/stores/workspace";
import type { AgentStatus, Project, ProjectAgent } from "@/lib/types";

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

/** S1.60：状态筛选选项（AgentStatus 运行时状态；active=运行中） */
const STATUS_FILTERS: { id: AgentStatus | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "active", label: "运行中" },
  { id: "idle", label: "空闲" },
  { id: "error", label: "异常" },
  { id: "paused", label: "暂停" },
];

export default function AgentsPage() {
  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const agents = useWorkspaceStore((s) => s.agents);
  const stats = useWorkspaceStore((s) => s.stats);
  const projects = useWorkspaceStore((s) => s.projects);
  const projectAgents = useWorkspaceStore((s) => s.projectAgents);
  const hydrate = useWorkspaceStore((s) => s.hydrate);

  // S1.60：团队工作台工具条（搜索 + 状态筛选，前端过滤；归档已由服务端列表排除）
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    });
  }, [agents, query, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agents"
        description="智能体团队工作台：创建、配置与运行你的智能体"
        actions={
          <Button asChild>
            <Link href="/agents/new">
              <Plus />
              新建 Agent
            </Link>
          </Button>
        }
      />

      {/* S1.59：角色模板库（已添加状态联动，空态/非空态都展示） */}
      <AgentTemplates agents={agents} />

      {/* S1.60：工作台工具条 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-[300px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`搜索 Agent（共 ${agents.length} 个）…`}
            className="h-8 pl-8 text-[12.5px]"
            aria-label="搜索 Agent"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-white/[0.02] p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                statusFilter === f.id
                  ? "bg-white/[0.08] text-ink"
                  : "text-ink-3 hover:text-ink-1"
              }`}
              aria-pressed={statusFilter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
          {agents.length === 0 ? (
            <>
              <Bot className="h-6 w-6 text-ink-3" />
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
            </>
          ) : (
            <>
              <Search className="h-6 w-6 text-ink-3" />
              <p className="text-[14px] font-medium text-ink-2">
                没有匹配「{query || statusFilter}」的 Agent
              </p>
              <p className="text-[13px] text-ink-3">换个关键词或状态试试</p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-3">
            {query || statusFilter !== "all"
              ? `匹配 ${filtered.length}/${agents.length} 个 Agent`
              : `共 ${agents.length} 个 Agent`}
            {" · 点击卡片查看详情与运行历史"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((agent) => (
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
