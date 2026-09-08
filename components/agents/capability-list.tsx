"use client";

/**
 * Agent 已装配能力（可编辑，Phase 3 第二阶段）
 *
 * 基于 Capability 数据模型渲染，数据完全来自单一 Store：
 * - 定义资产（capabilityDefinitions）+ 装配关系（agentCapabilities）同源实时一致
 * - 按类型分组（map 驱动，不硬编码四个模块的业务逻辑）
 * - 操作：启用 / 停用 / 解绑（Dialog 二次确认），全部经 Store actions
 * - 三态：已装配启用（品牌色状态点）/ 已装配停用（中性点 + Badge）；未装配在装配面板中呈现
 */
import { useState } from "react";
import { Loader2, Puzzle, Trash2 } from "lucide-react";
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
import { CAPABILITY_TYPE_ICONS } from "@/lib/capability-meta";
import {
  composeCapabilityViews,
  type AgentCapabilityView,
} from "@/lib/services/capabilities";
import { CAPABILITY_TYPE_OPTIONS } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export function CapabilityList({
  agentId,
  agentName,
  onOpenPicker,
}: {
  agentId: string;
  agentName: string;
  onOpenPicker: () => void;
}) {
  const capabilityDefinitions = useWorkspaceStore(
    (s) => s.capabilityDefinitions
  );
  const agentCapabilities = useWorkspaceStore((s) => s.agentCapabilities);
  const setCapabilityEnabled = useWorkspaceStore((s) => s.setCapabilityEnabled);
  const detachCapability = useWorkspaceStore((s) => s.detachCapability);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [detachTarget, setDetachTarget] = useState<AgentCapabilityView | null>(
    null
  );

  const groups = composeCapabilityViews(
    capabilityDefinitions,
    agentCapabilities.filter((ac) => ac.agentId === agentId)
  );
  const total = agentCapabilities.filter((ac) => ac.agentId === agentId).length;

  async function handleToggleEnabled(view: AgentCapabilityView) {
    if (busyId) return;
    setBusyId(view.assembly.id);
    try {
      await setCapabilityEnabled(
        view.assembly.id,
        !view.assembly.enabled
      );
      toast.success(
        view.assembly.enabled
          ? `已停用「${view.definition.name}」`
          : `已启用「${view.definition.name}」`
      );
    } catch {
      toast.error("操作失败，请重试");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDetach() {
    if (!detachTarget || busyId) return;
    setBusyId(detachTarget.assembly.id);
    try {
      await detachCapability(detachTarget.assembly.id);
      toast.success(`已解绑「${detachTarget.definition.name}」`);
      setDetachTarget(null);
    } catch {
      toast.error("解绑失败，请重试");
    } finally {
      setBusyId(null);
    }
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Puzzle className="h-5 w-5 text-ink-3" />
        <p className="text-[13px] text-ink-2">尚未装配能力</p>
        <p className="text-[12px] text-ink-3">
          从能力库为 {agentName} 添加 Skills / Memory / Rules / Tools
        </p>
        <Button size="sm" className="mt-1" onClick={onOpenPicker}>
          装配能力
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {CAPABILITY_TYPE_OPTIONS.map((type) => {
          const items = groups[type.id];
          if (!items || items.length === 0) return null;
          const Icon = CAPABILITY_TYPE_ICONS[type.id];
          const enabledCount = items.filter((v) => v.assembly.enabled).length;
          return (
            <div key={type.id}>
              <div className="flex items-center gap-2 px-2">
                <Icon className="h-3.5 w-3.5 text-ink-3" />
                <h4 className="flex-1 text-[12.5px] font-semibold text-ink">
                  {type.label}
                </h4>
                <span className="text-[11.5px] text-ink-3">
                  {enabledCount}/{items.length} 启用
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {items.map((view) => {
                  const busy = busyId === view.assembly.id;
                  const archived = view.definition.lifecycle === "archived";
                  return (
                    <div
                      key={view.assembly.id}
                      className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          view.assembly.enabled ? "bg-success" : "bg-ink-3/60"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[12.5px] font-medium ${
                            archived ? "text-ink-3" : "text-ink"
                          }`}
                        >
                          {view.definition.name}
                        </p>
                        <p className="truncate text-[11.5px] text-ink-3">
                          {view.definition.description}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {archived && (
                          <Badge
                            variant="outline"
                            className="border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                          >
                            已归档
                          </Badge>
                        )}
                        {!view.assembly.enabled && (
                          <Badge
                            variant="outline"
                            className="border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                          >
                            已停用
                          </Badge>
                        )}
                        {archived ? (
                          <span
                            aria-hidden="true"
                            className="w-[38px] text-center text-[11.5px] text-ink-3/70"
                          >
                            冻结
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`text-[11.5px] font-normal ${
                              view.assembly.enabled
                                ? "text-ink-3 hover:text-ink"
                                : "text-success hover:text-success"
                            }`}
                            onClick={() => void handleToggleEnabled(view)}
                            disabled={busy}
                          >
                            {busy && (
                              <Loader2 className="animate-spin" aria-hidden="true" />
                            )}
                            {view.assembly.enabled ? "停用" : "启用"}
                          </Button>
                        )}
                        {archived ? (
                          <span className="w-7" aria-hidden="true" />
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-ink-3 hover:text-danger"
                            onClick={() => setDetachTarget(view)}
                            disabled={busy}
                            aria-label={`解绑 ${view.definition.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 解绑确认 */}
      <Dialog
        open={detachTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDetachTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>解绑能力</DialogTitle>
            <DialogDescription>
              将「{detachTarget?.definition.name}」从 {agentName}{" "}
              移除，该能力可随时重新装配。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDetachTarget(null)}
              disabled={busyId !== null}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDetach()}
              disabled={busyId !== null}
            >
              {busyId === detachTarget?.assembly.id && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              确认解绑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
