"use client";

/**
 * 关联 Agent 面板（Phase 3 第五阶段：Projects 最小闭环）
 *
 * 从「工作区 Agent 资产」为指定项目关联 / 查看 Agent。
 * - 数据完全来自单一 Store（agents + projectAgents），与项目详情同源实时一致
 * - 状态区分：已关联（Badge 禁用）/ 未关联（可关联）
 * - 操作经 Store actions（内部走 Service 写契约），成功/失败均有 toast 反馈
 */
import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { modelLabel } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export function AgentPicker({
  projectId,
  projectName,
  open,
  onOpenChange,
}: {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agents = useWorkspaceStore((s) => s.agents);
  const projectAgents = useWorkspaceStore((s) => s.projectAgents);
  const attachAgentToProject = useWorkspaceStore(
    (s) => s.attachAgentToProject
  );

  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const linkedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pa of projectAgents) {
      if (pa.projectId === projectId) ids.add(pa.agentId);
    }
    return ids;
  }, [projectAgents, projectId]);

  const q = query.trim().toLowerCase();
  const filtered = agents.filter(
    (a) =>
      q === "" ||
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
  );

  async function handleAttach(agentId: string, name: string) {
    if (busyId) return;
    setBusyId(agentId);
    try {
      await attachAgentToProject(projectId, agentId);
      toast.success(`已关联「${name}」`);
    } catch {
      toast.error("关联失败，请重试");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>关联 Agent</DialogTitle>
          <DialogDescription>
            从工作区为「{projectName}」关联已有 Agent，可搜索名称或描述
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索 Agent 名称或描述…"
            className="pl-9"
            autoFocus
            aria-label="搜索可用 Agent"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-5 w-5 text-ink-3" />
              <p className="text-[13px] text-ink-2">未找到匹配的 Agent</p>
              <p className="text-[12px] text-ink-3">换个关键词试试</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((a) => {
                const linked = linkedIds.has(a.id);
                const busy = busyId === a.id;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ${
                      linked ? "" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {a.name}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-3">
                        {a.description} · {modelLabel(a.model)}
                      </p>
                    </div>

                    {linked ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-brand/30 bg-brand/10 text-[10.5px] font-normal text-brand"
                      >
                        已关联
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void handleAttach(a.id, a.name)}
                        disabled={busy}
                        className="shrink-0"
                      >
                        {busy && (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        )}
                        关联
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
