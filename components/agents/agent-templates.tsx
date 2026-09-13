"use client";

/**
 * 角色模板库区块（S1.59 重构）
 *
 * - 不直接平铺「创建入口」：每张卡与已创建 Agent 联动，展示「已添加 / 未添加」状态。
 * - 已添加：显示真实 Agent（名称 / 状态徽标 / 查看详情跳转），不再重复创建。
 * - 未添加：显示模板信息 + 「添加」按钮（store.createAgent → Service → SQLite 真实落库）。
 * - 按分组渲染：代码协作（拆解 → 实现 → 审查 → 测试 → 审批）+ 通用角色。
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Check, Loader2, Library, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AGENT_TEMPLATES,
  TEMPLATE_GROUPS,
  type AgentTemplate,
} from "@/lib/agents/templates";
import { useWorkspaceStore } from "@/stores/workspace";
import type { Agent } from "@/lib/types";

const ROLE_ACCENT: Record<string, string> = {
  架构师: "text-brand",
  实现工程师: "text-sky-300",
  代码审查员: "text-amber-300",
  测试工程师: "text-emerald-300",
  发布审批人: "text-violet-300",
  内容创作: "text-pink-300",
  数据分析: "text-cyan-300",
  翻译: "text-teal-300",
  研究助理: "text-orange-300",
  写作润色: "text-lime-300",
};

export function AgentTemplates({ agents = [] }: { agents?: Agent[] }) {
  const createAgent = useWorkspaceStore((s) => s.createAgent);
  const [creating, setCreating] = useState<string | null>(null);

  async function handleCreate(t: AgentTemplate) {
    if (creating) return;
    setCreating(t.id);
    try {
      await createAgent({
        name: t.name,
        model: "auto",
        description: t.description,
        systemPrompt: t.systemPrompt,
      });
      toast.success(`已添加「${t.name}」到我的 Agents`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setCreating(null);
    }
  }

  // 已添加：按模板名匹配真实 Agent（同名去重）
  const byName = new Map(agents.map((a) => [a.name, a]));

  return (
    <Card className="rounded-xl bg-surface-1">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
          <Library className="h-3.5 w-3.5 text-brand" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-ink">角色模板库</h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            按角色一键添加为真实 Agent；已添加的角色直接进入详情，不会重复创建
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {TEMPLATE_GROUPS.map((group) => {
          const templates = AGENT_TEMPLATES.filter((t) => t.group === group.id);
          const addedCount = templates.filter((t) => byName.has(t.name)).length;
          return (
            <section key={group.id} aria-labelledby={`tpl-${group.id}`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h3 id={`tpl-${group.id}`} className="text-[12.5px] font-semibold text-ink">
                  {group.label}
                </h3>
                <span className="text-[11px] text-ink-3">{group.hint}</span>
                <span className="ml-auto text-[11px] text-ink-3">
                  已添加 {addedCount}/{templates.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((t) => {
                  const existing = byName.get(t.name);
                  const busy = creating === t.id;
                  if (existing) {
                    return (
                      <div
                        key={t.id}
                        className="flex flex-col rounded-xl border border-brand/20 bg-brand/[0.05] p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
                              <Bot className={`h-3.5 w-3.5 ${ROLE_ACCENT[t.role] ?? "text-ink-2"}`} />
                            </div>
                            <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                          </div>
                          <Badge className="border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                            <Check className="mr-1 size-3" />
                            已添加
                          </Badge>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-2">
                          {t.description}
                        </p>

                        <div className="mt-3 flex-1 border-t border-white/[0.06] pt-2.5">
                          <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
                            关联 Agent
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="truncate text-[12px] text-ink-1">
                              {existing.description || t.description}
                            </span>
                          </div>
                        </div>

                        <Button size="sm" variant="outline" className="mt-3 w-full" asChild>
                          <Link href={`/agents/${existing.id}`}>
                            查看详情
                            <ArrowRight className="ml-1.5 size-3" />
                          </Link>
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-white/15"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.05]">
                            <Bot className={`h-3.5 w-3.5 ${ROLE_ACCENT[t.role] ?? "text-ink-2"}`} />
                          </div>
                          <p className="text-[13px] font-semibold text-ink">{t.name}</p>
                        </div>
                        <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-ink-3">
                          {t.role}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-2">
                        {t.description}
                      </p>

                      <div className="mt-3 flex-1 border-t border-white/[0.06] pt-2.5">
                        <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">
                          候选工作
                        </p>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {t.suggestedTasks.map((task) => (
                            <li key={task} className="flex items-start gap-1.5 text-[11.5px] text-ink-2">
                              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-brand/70" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        size="sm"
                        variant="default"
                        className="mt-3 w-full"
                        disabled={busy}
                        onClick={() => void handleCreate(t)}
                      >
                        {busy ? <Loader2 className="animate-spin" /> : <Plus />}
                        {busy ? "添加中…" : "添加此角色"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
