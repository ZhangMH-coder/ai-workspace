/**
 * 使用建议 · 预设问题（S1.47 / S1.50）
 *
 * 基于真实资源信息（名称 / 类型 / 描述）按类型模板确定性生成预设问题，
 * 点击复制后可直接去支持该资源的 Harness 使用。
 * 模板统一在 lib/prompts.ts（与任务智能技能建议共用），不调用 LLM，不伪造内容。
 */
"use client";

import { useMemo, useState } from "react";
import { Check, Copy, MessageSquareQuote } from "lucide-react";

import type { DiscoveredResource } from "@/lib/types";
import { resourceTypeLabel } from "@/lib/types";
import { presetPromptsForResource } from "@/lib/prompts";

export function SuggestedPrompts({ resource }: { resource: DiscoveredResource }) {
  const prompts = useMemo(() => presetPromptsForResource(resource), [resource]);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleCopy(prompt: string, idx: number) {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // 剪贴板不可用时忽略
    }
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 2000);
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-1.5">
        <MessageSquareQuote className="size-3.5 text-primary" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
          使用建议 · 预设问题
        </p>
        <span className="text-[10.5px] text-ink-3">
          点击复制，去支持该 {resourceTypeLabel(resource.type)} 的 Harness 使用
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {prompts.map((p, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => void handleCopy(p, i)}
              className="group flex w-full items-start gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-left transition-colors hover:border-primary/25 hover:bg-primary/[0.04]"
            >
              <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink-2">{p}</span>
              {copiedIdx === i ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              ) : (
                <Copy className="mt-0.5 size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
