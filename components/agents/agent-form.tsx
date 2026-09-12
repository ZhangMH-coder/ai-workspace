"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ModelId } from "@/lib/types";
import { fetchAvailableModels } from "@/lib/services/ai";
import { useWorkspaceStore } from "@/stores/workspace";

export function AgentForm() {
  const router = useRouter();
  const createAgent = useWorkspaceStore((s) => s.createAgent);

  const [name, setName] = useState("");
  const [model, setModel] = useState<ModelId>("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // S1.30：模型列表来自真实 Provider 端点（Settings → AI Provider），不硬编码假模型
  const [models, setModels] = useState<string[] | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);

  async function loadModels() {
    setModelsLoading(true);
    try {
      const res = await fetchAvailableModels();
      setModels(res.models);
      // 已配置端点：默认选中生效模型；未拉取到列表时保持自由输入
      if (res.models && res.models.length > 0) {
        setModel((prev) => prev || (res.models!.includes(res.model) ? res.model : res.models![0]));
      } else if (res.configured && res.model) {
        setModel((prev) => prev || res.model);
      }
    } catch {
      setModels(null);
    } finally {
      setModelsLoading(false);
    }
  }

  // S1.30：初始拉取真实模型列表（仅异步 setState，避免 effect 内同步 setState）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetchAvailableModels();
        if (!alive) return;
        setModels(res.models);
        if (res.models && res.models.length > 0) {
          setModel((prev) => prev || (res.models!.includes(res.model) ? res.model : res.models![0]));
        } else if (res.configured && res.model) {
          setModel((prev) => prev || res.model);
        }
      } catch {
        if (alive) setModels(null);
      } finally {
        if (alive) setModelsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canSubmit = name.trim().length > 0 && !submitting && model.trim().length > 0;

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
            <div className="flex items-center justify-between">
              <Label className="text-[13px] text-ink-2">模型</Label>
              <button
                type="button"
                onClick={() => void loadModels()}
                className="flex items-center gap-1 text-[12px] text-ink-3 transition-colors hover:text-ink-1"
                aria-label="刷新模型列表"
              >
                <RefreshCw className={`size-3 ${modelsLoading ? "animate-spin" : ""}`} />
                刷新
              </button>
            </div>

            {modelsLoading ? (
              <div className="flex h-[72px] items-center justify-center gap-2 rounded-xl border border-border bg-white/[0.02] text-[13px] text-ink-3">
                <Loader2 className="size-4 animate-spin" />
                正在读取模型列表…
              </div>
            ) : models && models.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                      model === m
                        ? "border-brand/50 bg-brand-soft text-ink"
                        : "border-border bg-white/[0.02] text-ink-2 hover:border-white/15"
                    }`}
                  >
                    <Bot
                      className={`size-3.5 ${
                        model === m ? "text-brand" : "text-ink-3"
                      }`}
                    />
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                <Input
                  id="agent-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="手动输入模型标识，如 deepseek-v4-flash-0731"
                  className="h-9"
                />
                <p className="text-[12px] text-ink-3">
                  {models === null
                    ? "未获取到模型列表：请先在 Settings → AI Provider 完成连接配置，再刷新重试"
                    : "当前端点未返回模型列表，可手动输入模型标识"}
                </p>
              </div>
            )}
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
