"use client";

/**
 * 新建项目表单（Dialog）
 *
 * - 名称 + 描述 → createProject（Service → Store，status=active）
 * - Loading（提交中禁用）/ Error（Service 抛错 toast）/ Empty（空名称禁用提交）
 * - 创建成功后由调用方跳转项目详情
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
import { useWorkspaceStore } from "@/stores/workspace";

export function ProjectFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 创建成功后回调（携带新项目 id，用于跳转详情） */
  onCreated: (projectId: string) => void;
}) {
  const createProject = useWorkspaceStore((s) => s.createProject);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Dialog 打开时由外层 key 重挂载重置（与能力表单同一模式）

  const canSubmit = name.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
      });
      toast.success(`已创建项目「${project.name}」`);
      onOpenChange(false);
      onCreated(project.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>
            项目是业务组织上下文：把已有 Agent 组织到一个业务单元下，
            项目级运行摘要自动派生，不复制任何数据。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="prj-name" className="text-[12.5px] text-ink-2">
              名称
            </Label>
            <Input
              id="prj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：客服提效"
              autoFocus
              className="h-9"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="prj-desc" className="text-[12.5px] text-ink-2">
              描述
            </Label>
            <Textarea
              id="prj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要说明项目目标与范围"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="animate-spin" />}
            创建项目
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
