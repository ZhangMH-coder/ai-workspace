"use client";

/**
 * 代码智囊团模板区块（S1.56）
 *
 * - 展示 5 个通用代码协作 Agent 模板（架构师/实现/审查/测试/审批）
 * - 每个模板卡：角色徽标 + 名称 + 职责 + 候选工作（3 条）+ 「创建此 Agent」
 * - 创建走 store.createAgent → Service → SQLite（真实落库，非演示数据）
 * - 创建成功后列表实时更新；避免与已创建的同名 Agent 重复创建（按 name 去重）
 */
import { useState } from "react";
import { Bot, Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CODE_BRAINTRUST_TEMPLATES, type AgentTemplate } from "@/lib/agents/templates";
import { useWorkspaceStore } from "@/stores/workspace";

const ROLE_ACCENT: Record<string, string> = {
  架构师: "text-brand",
  实现工程师: "text-sky-300",
  代码审查员: "text-amber-300",
  测试工程师: "text-emerald-300",
  发布审批人: "text-violet-300",
};

export function AgentTemplates({ agentsCreated = [] }: { agentsCreated?: string[] }) {
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
      toast.success(`已创建「${t.name}」`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setCreating(null);
    }
  }

  const createdSet = new Set(agentsCreated);

  return (
    <Card className="rounded-xl bg-surface-1">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/10">
          <Users className="h-3.5 w-3.5 text-brand" />
        </div>
        <div className="flex-1">
          <h2 className="text-[14px] font-semibold text-ink">代码智囊团</h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            通用代码协作角色：拆解 → 实现 → 审查 → 测试 → 审批。一键创建为真实 Agent（可再编辑模型与提示词）
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {CODE_BRAINTRUST_TEMPLATES.map((t) => {
          const done = createdSet.has(t.name);
          const busy = creating === t.id;
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
                variant={done ? "outline" : "default"}
                className="mt-3 w-full"
                disabled={busy || done}
                onClick={() => void handleCreate(t)}
              >
                {busy ? <Loader2 className="animate-spin" /> : done ? <Check /> : <Bot />}
                {busy ? "创建中…" : done ? "已创建" : "创建此 Agent"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
