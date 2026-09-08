"use client";

/**
 * 能力定义创建 / 编辑表单（Dialog）
 *
 * - 创建：类型 + 名称 + 描述 → createCapability（Service → Store，default active）
 * - 编辑：预填现有值，保存 → updateCapability（仅元信息，不动生命周期）
 * - Loading（提交中禁用）/ Error（Service 抛错 toast）/ Empty（空名称禁用提交）
 * - 打开时通过 key 重挂载初始化表单，避免 effect 内 setState
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CAPABILITY_TYPE_OPTIONS,
  type CapabilityDefinition,
  type CapabilityType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

export function CapabilityFormDialog({
  open,
  onOpenChange,
  editingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入 id 为编辑模式；为空为创建模式 */
  editingId?: string;
}) {
  const definitions = useWorkspaceStore((s) => s.capabilityDefinitions);
  const editing = editingId
    ? definitions.find((d) => d.id === editingId)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        {open && (
          <CapabilityFormBody
            key={editingId ?? "create"}
            editing={editing}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CapabilityFormBody({
  editing,
  onClose,
}: {
  editing?: CapabilityDefinition;
  onClose: () => void;
}) {
  const createCapability = useWorkspaceStore((s) => s.createCapability);
  const updateCapability = useWorkspaceStore((s) => s.updateCapability);

  const [type, setType] = useState<CapabilityType>(editing?.type ?? "skill");
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateCapability({
          id: editing.id,
          type,
          name: name.trim(),
          description: description.trim(),
        });
        toast.success(`已更新「${name.trim()}」`);
      } else {
        await createCapability({
          type,
          name: name.trim(),
          description: description.trim(),
        });
        toast.success(`已创建「${name.trim()}」`);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "编辑能力" : "新建能力"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "仅修改元信息；生命周期由归档/恢复管理。"
            : "新能力默认处于 Active，可立即被 Agent 装配。"}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cap-type" className="text-[12.5px] text-ink-2">
            类型
          </Label>
          <div
            id="cap-type"
            role="radiogroup"
            aria-label="能力类型"
            className="grid grid-cols-4 gap-1 rounded-lg bg-white/[0.03] p-1"
          >
            {CAPABILITY_TYPE_OPTIONS.map((t) => {
              const active = t.id === type;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                    active
                      ? "bg-surface-2 text-ink shadow-sm"
                      : "text-ink-3 hover:bg-white/[0.04] hover:text-ink-2"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cap-name" className="text-[12.5px] text-ink-2">
            名称
          </Label>
          <Input
            id="cap-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：周报生成"
            autoFocus
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cap-desc" className="text-[12.5px] text-ink-2">
            描述
          </Label>
          <Textarea
            id="cap-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简要说明能力用途与边界"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting && <Loader2 className="animate-spin" />}
          {editing ? "保存修改" : "创建能力"}
        </Button>
      </DialogFooter>
    </>
  );
}
