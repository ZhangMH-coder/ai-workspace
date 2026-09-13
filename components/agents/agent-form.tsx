"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, RefreshCw, Search, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, ModelId } from "@/lib/types";
import { fetchAvailableModels, polishSystemPrompt } from "@/lib/services/ai";
import { useWorkspaceStore } from "@/stores/workspace";

/** S1.33：按模型名前缀推断厂商分组（真实模型列表的展示层归类，不修改数据） */
const VENDOR_ORDER = ["DeepSeek", "智谱 GLM", "MiniMax", "Kimi", "通义千问", "豆包", "OpenAI", "Anthropic", "Google", "开源模型", "其他"];

function vendorOf(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("deepseek")) return "DeepSeek";
  if (m.includes("glm") || m.includes("chatglm")) return "智谱 GLM";
  if (m.includes("minimax")) return "MiniMax";
  if (m.includes("kimi") || m.includes("moonshot")) return "Kimi";
  if (m.includes("qwen")) return "通义千问";
  if (m.includes("doubao") || m.includes("ark") || m.startsWith("seed")) return "豆包";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3")) return "OpenAI";
  if (m.includes("claude")) return "Anthropic";
  if (m.includes("gemini")) return "Google";
  if (m.includes("llama") || m.includes("mistral") || m.includes("gemma")) return "开源模型";
  return "其他";
}

/** S1.33：真实模型按厂商分组（组内保持端点返回顺序；未识别归「其他」） */
function groupModels(models: string[]): Array<[string, string[]]> {
  const byVendor = new Map<string, string[]>();
  for (const m of models) {
    const v = vendorOf(m);
    if (!byVendor.has(v)) byVendor.set(v, []);
    byVendor.get(v)!.push(m);
  }
  const ordered = VENDOR_ORDER.filter((v) => byVendor.has(v)).map((v) => [v, byVendor.get(v)!] as [string, string[]]);
  for (const [v, list] of byVendor) {
    if (!ordered.some(([ov]) => ov === v)) ordered.push([v, list]);
  }
  return ordered;
}

/** S1.60：创建 / 编辑双模式表单（initial 存在即编辑模式，保存走 updateAgent） */
export function AgentForm({ initial }: { initial?: Agent }) {
  const router = useRouter();
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const updateAgent = useWorkspaceStore((s) => s.updateAgent);

  const [name, setName] = useState(initial?.name ?? "");
  const [model, setModel] = useState<ModelId>(initial?.model ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [submitting, setSubmitting] = useState(false);
  // S1.44：系统提示词专业润色
  const [polishing, setPolishing] = useState(false);
  const [polishTip, setPolishTip] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);

  // S1.30：模型列表来自真实 Provider 端点（Settings → AI Provider），不硬编码假模型
  const [models, setModels] = useState<string[] | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  // S1.33：模型搜索过滤
  const [modelQuery, setModelQuery] = useState("");

  // S1.33：真实模型分组（搜索过滤后）
  const modelGroups = useMemo(() => {
    if (!models || models.length === 0) return [];
    const q = modelQuery.trim().toLowerCase();
    const filtered = q ? models.filter((m) => m.toLowerCase().includes(q)) : models;
    return groupModels(filtered);
  }, [models, modelQuery]);
  const filteredCount = modelGroups.reduce((n, [, ms]) => n + ms.length, 0);

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

  /** S1.44：调用当前 LLM 润色系统提示词；未配 Key 按 code 如实提示，不伪造 */
  async function handlePolish() {
    const trimmed = systemPrompt.trim();
    if (!trimmed) {
      setPolishError("请先输入系统提示词草稿，再点击润色");
      return;
    }
    if (polishing) return;
    setPolishing(true);
    setPolishTip(null);
    setPolishError(null);
    try {
      const res = await polishSystemPrompt(trimmed);
      setSystemPrompt(res.polished);
      setPolishTip(`已用 ${res.model} 润色完成`);
    } catch (e) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      if (code === "LLM_NOT_CONFIGURED") {
        setPolishError("未配置 LLM API Key：请到 Settings → AI Provider 填写后重试");
      } else if (code === "VALIDATION_ERROR") {
        setPolishError("系统提示词为空，请先输入内容");
      } else {
        setPolishError(e instanceof Error ? e.message : "润色失败，请稍后重试");
      }
    } finally {
      setPolishing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (initial) {
        await updateAgent(initial.id, { name, model, description, systemPrompt });
        toast.success(`Agent「${name}」已更新`);
        router.push(`/agents/${initial.id}`);
      } else {
        const agent = await createAgent({ name, model, description, systemPrompt });
        toast.success(`Agent「${agent.name}」已创建`);
        router.push(`/agents/${agent.id}`);
      }
    } catch {
      toast.error(initial ? "保存失败，请重试" : "创建失败，请重试");
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
              <div className="grid gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
                  <Input
                    value={modelQuery}
                    onChange={(e) => setModelQuery(e.target.value)}
                    placeholder={`搜索模型（共 ${models.length} 个）…`}
                    className="h-8 pl-8 text-[12.5px]"
                    aria-label="搜索模型"
                  />
                </div>
                {modelGroups.length === 0 ? (
                  <p className="py-3 text-center text-[12px] text-ink-3">没有匹配「{modelQuery}」的模型</p>
                ) : (
                  <div className="grid max-h-[300px] gap-3 overflow-auto pr-1">
                    {modelGroups.map(([vendor, ms]) => (
                      <div key={vendor} className="grid gap-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                          {vendor} · {ms.length}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ms.map((m) => (
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
                      </div>
                    ))}
                  </div>
                )}
                {filteredCount > 0 ? (
                  <p className="text-[11px] text-ink-3">
                    {filteredCount}/{models.length} 个模型 · 当前选中：{model || "未选择"}
                  </p>
                ) : null}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-ink-3">不填写时使用默认提示词</p>
              <button
                type="button"
                onClick={() => void handlePolish()}
                disabled={polishing || !systemPrompt.trim()}
                className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[12px] text-ink-2 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="用 AI 润色系统提示词"
              >
                {polishing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Wand2 className="size-3" />
                )}
                {polishing ? "润色中…" : "专业润色"}
              </button>
            </div>
            {polishTip ? (
              <p className="text-[12px] text-emerald-300">{polishTip}</p>
            ) : null}
            {polishError ? (
              <p className="text-[12px] text-warning">{polishError}</p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? <Loader2 className="animate-spin" /> : <Bot />}
          {submitting
            ? initial
              ? "保存中…"
              : "创建中…"
            : initial
              ? "保存修改"
              : "创建 Agent"}
        </Button>
      </div>
    </form>
  );
}
