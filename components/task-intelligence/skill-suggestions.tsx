/**
 * Task Intelligence — 技能使用建议（预设问题形态）
 *
 * 从真实技能资源中挑选建议（真实数据，零 Demo），每条对应一个「预设问题」——
 * 点击复制该问题，粘贴到对应 Harness（如 Hermes）即可直接提问使用。
 * 预设问题优先取真实 usage（触发方式），否则基于真实 description 转成任务指令；
 * 点击卡片跳转详情页查看真实来源。AI Workspace 只展示与指引，不执行技能。
 *
 * 不重复：按 resourceId 去重（Set），同一技能只出现一次。
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, MessageCircleQuestion, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDiscoveredResources } from "@/lib/services/resource-discovery";
import type { DiscoveredResource } from "@/lib/types";

const MAX_ITEMS = 6;

function getUsage(r: DiscoveredResource): string {
  const u = r.metadata?.usage;
  return typeof u === "string" ? u.trim() : "";
}

/** 预设问题：基于真实 description 生成「帮我用「技能名」：目的」可提问指令；
 *  英文/说明型描述回退为技能名模板；短 usage（如触发指令）兜底 */
function presetQuestion(r: DiscoveredResource): string {
  const d = r.description?.trim();
  let purpose = "";
  if (d) {
    let first = d.split(/[。\n\r]/)[0].replace(/^[：:，,、\s]+/, "").trim();
    first = first
      .replace(/^(本技能|本 Skill|本skill|本工具|该工具|此技能|本文档|本文|本指南|本文是|本文件|这个|该|用于|负责|面向|帮助|可以|能够|支持|将|This guide|This skill|This is)/i, "")
      .replace(/^[的、，,：:\s]+/, "")
      .trim();
    const latin = (first.match(/[a-zA-Z]/g) || []).length;
    if (first.length > 0 && latin / Math.max(first.length, 1) < 0.4) {
      purpose = first.length > 42 ? first.slice(0, 42) + "…" : first;
    }
  }
  if (purpose) return `帮我用「${r.name}」技能：${purpose}`;
  const usage = getUsage(r);
  if (usage && usage.length <= 60) return usage;
  return `帮我使用「${r.name}」技能完成相关任务`;
}

function pickSuggestions(items: DiscoveredResource[]): DiscoveredResource[] {
  // 真实去重：同一 resourceId 只保留一次
  const seen = new Set<string>();
  const unique = items.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  // 优先「有使用方式」的（usage 更可操作），其次有描述的；保持真实顺序稳定
  const withUsage = unique.filter((r) => getUsage(r));
  const withDesc = unique.filter((r) => !getUsage(r) && r.description?.trim());
  return [...withUsage, ...withDesc].slice(0, MAX_ITEMS);
}

export function SkillSuggestions() {
  const router = useRouter();
  const [items, setItems] = useState<DiscoveredResource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: all } = await fetchDiscoveredResources({
          type: "skill",
          parseable: true,
          pageSize: 30,
        });
        if (cancelled) return;
        setItems(pickSuggestions(all));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopy(r: DiscoveredResource) {
    const text = presetQuestion(r);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId((cur) => (cur === r.id ? null : cur)), 2000);
    } catch {
      // 剪贴板不可用时退化为选中提示，不阻塞
      setCopiedId(r.id);
      setTimeout(() => setCopiedId((cur) => (cur === r.id ? null : cur)), 2000);
    }
  }

  return (
    <Card className="border-white/[0.08] bg-white/[0.02]">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-ink-1">
          技能使用建议
          <Sparkles className="size-3 text-primary" />
        </CardTitle>
        <p className="text-[11px] text-ink-3">
          来自本机真实技能 · 点击复制预设问题，到对应 Harness 提问（不重复，仅指引不执行）
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        {loading ? (
          <div className="flex h-16 items-center gap-2 text-[12px] text-ink-2">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            正在加载真实技能建议…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            加载失败：{error}
          </div>
        ) : items && items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((r) => (
              <div
                key={r.id}
                className="group flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:border-violet-400/25"
              >
                <button
                  type="button"
                  onClick={() => {
                    router.push(`/resources/${r.id}`);
                  }}
                  className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
                >
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-1">
                    <span className="truncate">{r.name}</span>
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      skill
                    </Badge>
                    {r.source && (
                      <Badge variant="outline" className="shrink-0 text-[9px] text-ink-3">
                        {r.source}
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-start gap-1 text-[12px] leading-relaxed text-ink-2">
                    <MessageCircleQuestion className="mt-0.5 size-3 shrink-0 text-primary/70" />
                    <span className="line-clamp-2">{presetQuestion(r)}</span>
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleCopy(r)}
                  className="h-7 shrink-0 gap-1 text-[11px] text-ink-2 hover:text-ink"
                >
                  {copiedId === r.id ? (
                    <>
                      <Check className="size-3 text-emerald-400" /> 已复制
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> 复制问题
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12px] text-ink-3">
            暂无可用技能建议
          </div>
        )}
      </CardContent>
    </Card>
  );
}
