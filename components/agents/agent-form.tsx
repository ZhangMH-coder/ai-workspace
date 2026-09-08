"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODEL_OPTIONS, type ModelId } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export function AgentForm() {
  const router = useRouter();
  const createAgent = useWorkspaceStore((s) => s.createAgent);

  const [name, setName] = useState("");
  const [model, setModel] = useState<ModelId>("doubao-pro");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const agent = await createAgent({ name, model, description, systemPrompt });
      toast.success(`Agent「${agent.name}」已创建`);
      router.push(`/agents/${agent.id}`);
    } catch {
      toast.error("创建失败，请重试");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="rounded-xl bg-surface-1 p-6">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="agent-name" className="text-[13px] text-ink-2">
              名称 <span className="text-danger">*</span>
            </Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：客户支持助手"
              className="h-9"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-[13px] text-ink-2">模型</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODEL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setModel(option.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                    model === option.id
                      ? "border-brand/50 bg-brand-soft"
                      : "border-border bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <Bot
                    className={`h-4 w-4 shrink-0 ${
                      model === option.id ? "text-brand" : "text-ink-3"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{option.label}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">{option.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-desc" className="text-[13px] text-ink-2">
              描述
            </Label>
            <Input
              id="agent-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个 Agent 负责什么工作"
              className="h-9"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agent-prompt" className="text-[13px] text-ink-2">
              系统提示词
            </Label>
            <Textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="可选：定义角色、行为边界与输出规范"
              className="min-h-[96px] resize-y"
            />
            <p className="text-[12px] text-ink-3">不填写时使用默认提示词</p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? <Loader2 className="animate-spin" /> : <Bot />}
          {submitting ? "创建中…" : "创建 Agent"}
        </Button>
      </div>
    </form>
  );
}
