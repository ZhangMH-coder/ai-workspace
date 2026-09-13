/**
 * 使用建议 · 预设问题（S1.47）
 *
 * 基于真实资源信息（名称 / 类型 / 描述）按类型模板确定性生成预设问题，
 * 点击复制后可直接去支持该资源的 Harness 使用。
 * 纯启发式模板，不调用 LLM，不伪造内容；模板固定、仅注入真实字段。
 */
"use client";

import { useMemo, useState } from "react";
import { Check, Copy, MessageSquareQuote } from "lucide-react";

import type { DiscoveredResource, ResourceType } from "@/lib/types";
import { resourceTypeLabel } from "@/lib/types";

type PromptBuilder = (name: string, desc: string) => string[];

const TYPE_PROMPT_BUILDERS: Record<ResourceType, PromptBuilder> = {
  skill: (n, d) => [
    `请使用「${n}」技能的标准流程，帮我完成一个典型任务，并直接给出可用的最终产出。`,
    `调用「${n}」技能处理我的实际需求${d ? `，围绕「${d}」这类场景` : ""}，并说明它适用于哪些情况。`,
    `以「${n}」技能专家的身份，给我演示一个完整可执行的应用示例。`,
  ],
  agent: (n, d) => [
    `启动「${n}」智能体，帮我处理一个具体任务并给出结果。`,
    `让「${n}」智能体负责这个需求${d ? `（${d}）` : ""}，把分工和产出说清楚。`,
    `用「${n}」智能体演示一次完整的处理流程，说明它的能力边界。`,
  ],
  command: (n, d) => [
    `执行「${n}」命令，帮我完成对应操作并解释输出。`,
    `告诉我「${n}」命令在什么场景下使用、有什么前置条件${d ? `（${d}）` : ""}。`,
    `用「${n}」命令处理我给出的输入，给出结果和说明。`,
  ],
  rule: (n, d) => [
    `请在后续回答中遵守「${n}」规则${d ? `（${d}）` : ""}。`,
    `把「${n}」作为我的行为准则，按它约束你的输出风格和边界。`,
    `用「${n}」规则审视下面的需求，告诉我哪些部分会受它影响。`,
  ],
  prompt: (n, d) => [
    `把「${n}」作为提示词模板，套用到一个实际场景并输出结果。`,
    `用「${n}」提示词引导你完成一次任务，展示它的效果${d ? `（${d}）` : ""}。`,
    `解释「${n}」适合解决什么问题，并给我一个改造示例。`,
  ],
  mcp: (n, d) => [
    `通过「${n}」MCP 工具，帮我完成对应操作${d ? `（${d}）` : ""}。`,
    `调用「${n}」MCP，把结果整理成可用的输出。`,
    `告诉我「${n}」MCP 能做什么、怎么接入。`,
  ],
  plugin: (n, d) => [
    `使用「${n}」插件，帮我处理对应的任务${d ? `（${d}）` : ""}。`,
    `加载「${n}」插件能力，应用到我的需求上并给出结果。`,
    `用「${n}」插件给我演示一次完整使用。`,
  ],
  other: (n, d) => [
    `使用本机已发现的「${n}」资源${d ? `（${d}）` : ""}，帮我完成对应任务。`,
    `解释「${n}」是做什么的，并给我一个实际使用示例。`,
    `把「${n}」应用到我的场景中，给出具体做法。`,
  ],
};

function cleanDesc(desc: string | null | undefined): string {
  if (!desc) return "";
  const s = desc.replace(/\s+/g, " ").trim();
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

export function SuggestedPrompts({ resource }: { resource: DiscoveredResource }) {
  const prompts = useMemo(() => {
    const builder = TYPE_PROMPT_BUILDERS[resource.type] ?? TYPE_PROMPT_BUILDERS.other;
    return builder(resource.name, cleanDesc(resource.description));
  }, [resource]);

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
