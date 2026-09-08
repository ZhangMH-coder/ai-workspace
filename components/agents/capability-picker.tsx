"use client";

/**
 * 装配能力面板（Phase 3 第二阶段）
 *
 * 从「能力资产库」为指定 Agent 装配 / 启用能力。
 * - 数据完全来自单一 Store（capabilityDefinitions + agentCapabilities），与列表同源实时一致
 * - 三类状态区分：未装配（可装配）/ 已装配启用（禁用装配）/ 已装配停用（可启用）
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
import { CAPABILITY_TYPE_ICONS } from "@/lib/capability-meta";
import { CAPABILITY_TYPE_OPTIONS } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export function CapabilityPicker({
  agentId,
  agentName,
  open,
  onOpenChange,
}: {
  agentId: string;
  agentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const definitions = useWorkspaceStore((s) => s.capabilityDefinitions);
  const agentCapabilities = useWorkspaceStore((s) => s.agentCapabilities);
  const attachCapability = useWorkspaceStore((s) => s.attachCapability);
  const setCapabilityEnabled = useWorkspaceStore((s) => s.setCapabilityEnabled);

  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const assemblyByDef = useMemo(() => {
    const map = new Map<string, { id: string; enabled: boolean }>();
    for (const ac of agentCapabilities) {
      if (ac.agentId === agentId) map.set(ac.capabilityId, ac);
    }
    return map;
  }, [agentCapabilities, agentId]);

  const q = query.trim().toLowerCase();
  const filtered = definitions.filter(
    (d) =>
      q === "" ||
      d.name.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q)
  );

  async function handleAttach(capabilityId: string, name: string) {
    if (busyId) return;
    setBusyId(capabilityId);
    try {
      await attachCapability(agentId, capabilityId);
      toast.success(`已装配「${name}」`);
    } catch {
      toast.error("装配失败，请重试");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEnable(assemblyId: string, name: string) {
    if (busyId) return;
    setBusyId(assemblyId);
    try {
      await setCapabilityEnabled(assemblyId, true);
      toast.success(`已启用「${name}」`);
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>装配能力</DialogTitle>
          <DialogDescription>
            从能力库为 {agentName} 选择能力，可搜索名称或描述
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索能力名称或描述…"
            className="pl-9"
            autoFocus
            aria-label="搜索可用能力"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-5 w-5 text-ink-3" />
              <p className="text-[13px] text-ink-2">未找到匹配的能力</p>
              <p className="text-[12px] text-ink-3">换个关键词试试</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {CAPABILITY_TYPE_OPTIONS.map((type) => {
                const items = filtered.filter((d) => d.type === type.id);
                if (items.length === 0) return null;
                const Icon = CAPABILITY_TYPE_ICONS[type.id];
                return (
                  <div key={type.id}>
                    <div className="flex items-center gap-2 px-1">
                      <Icon className="h-3.5 w-3.5 text-ink-3" />
                      <h4 className="flex-1 text-[12.5px] font-semibold text-ink">
                        {type.label}
                      </h4>
                      <span className="text-[11.5px] text-ink-3">
                        {items.length} 项
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {items.map((d) => {
                        const assembly = assemblyByDef.get(d.id);
                        const busy = busyId === d.id || busyId === assembly?.id;
                        const archived = d.lifecycle === "archived";
                        return (
                          <div
                            key={d.id}
                            className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ${
                              archived ? "opacity-60" : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate text-[12.5px] font-medium ${
                                  archived ? "text-ink-3" : "text-ink"
                                }`}
                              >
                                {d.name}
                              </p>
                              <p className="truncate text-[11.5px] text-ink-3">
                                {d.description}
                              </p>
                            </div>

                            {archived ? (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                              >
                                已归档
                              </Badge>
                            ) : !assembly ? (
                              <Button
                                size="sm"
                                onClick={() => void handleAttach(d.id, d.name)}
                                disabled={busy}
                                className="shrink-0"
                              >
                                {busy && (
                                  <Loader2 className="animate-spin" aria-hidden="true" />
                                )}
                                装配
                              </Button>
                            ) : assembly.enabled ? (
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-brand/30 bg-brand/10 text-[10.5px] font-normal text-brand"
                                >
                                  已启用
                                </Badge>
                                <span aria-hidden="true" className="w-14" />
                              </div>
                            ) : (
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                                >
                                  已停用
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    void handleEnable(assembly.id, d.name)
                                  }
                                  disabled={busy}
                                >
                                  {busy && (
                                    <Loader2 className="animate-spin" aria-hidden="true" />
                                  )}
                                  启用
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
