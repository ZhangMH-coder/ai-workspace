/**
 * Resource Intelligence —— 能力分析面板（详情页区块）
 *
 * 展示：分析状态 / 一句话总述 / 能力标签（证据可追溯）/ 执行提示（仅描述） / 分析历史。
 * 未分析时可触发对该资源的增量分析；分析失败保留真实原因。
 */
"use client";
import { useEffect } from "react";
import Link from "next/link";
import { BrainCircuit, Clock3, History, ScanSearch, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  capabilityCategoryLabel,
  type AnalysisStatus,
  type ResourceCapability,
} from "@/lib/types";

export function InsightPanel({ resourceId }: { resourceId: string }) {
  const insight = useWorkspaceStore((s) => s.analysis.insight);
  const loading = useWorkspaceStore((s) => s.analysis.loading);
  const running = useWorkspaceStore((s) => s.analysis.running);
  const error = useWorkspaceStore((s) => s.analysis.error);
  const fetchInsight = useWorkspaceStore((s) => s.fetchResourceInsight);
  const runAnalysis = useWorkspaceStore((s) => s.runAnalysis);

  useEffect(() => {
    void fetchInsight(resourceId);
  }, [resourceId, fetchInsight]);

  async function handleAnalyze() {
    try {
      await runAnalysis({ resourceIds: [resourceId] });
      await fetchInsight(resourceId);
      toast.success("分析完成：已更新该资源的能力索引");
    } catch {
      toast.error("分析失败，请查看错误信息");
    }
  }

  if (loading && !insight) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 bg-white/[0.04]" />
        <Skeleton className="h-24 w-full rounded-xl bg-white/[0.04]" />
        <Skeleton className="h-32 w-full rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  if (!insight) return null;
  const { currentAnalysis, capabilities, history } = insight;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <BrainCircuit className="size-4 text-violet-400" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
          能力分析（AI 归纳，可追溯）
        </p>
        {!currentAnalysis ? (
          <Button size="sm" className="ml-auto h-7 gap-1 text-[11px]" onClick={handleAnalyze} disabled={running}>
            <ScanSearch className="size-3" /> {running ? "分析中…" : "分析此资源"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[12px] text-danger">
          {error}
        </div>
      ) : null}

      {!currentAnalysis ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-ink-3" />
          <p className="text-[12px] leading-relaxed text-ink-2">
            该资源尚未进行能力分析。分析会只读读取原始文件内容（不修改），归纳它能解决什么问题。
          </p>
        </div>
      ) : (
        <>
          {/* 分析记录头 */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentAnalysis.status} />
              <Badge variant="outline" className="border-white/10 text-ink-2">
                {currentAnalysis.analyzerVersion}
              </Badge>
              <Badge variant="outline" className="border-white/10 text-ink-2">
                {currentAnalysis.strategy}
              </Badge>
              <span className="ml-auto text-[11px] text-ink-3">
                {currentAnalysis.analyzedAt
                  ? new Date(currentAnalysis.analyzedAt).toLocaleString()
                  : "未完成"}
              </span>
            </div>

            {currentAnalysis.status === "failed" ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger/[0.06] p-3">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
                <div className="text-[12px] leading-relaxed text-ink-2">
                  <p className="font-medium text-danger">
                    {currentAnalysis.errorCode ?? "分析失败"}
                  </p>
                  <p className="mt-0.5">{currentAnalysis.errorMessage}</p>
                  <Button size="sm" className="mt-2 h-7 gap-1 text-[11px]" onClick={handleAnalyze} disabled={running}>
                    <ScanSearch className="size-3" /> 重试分析
                  </Button>
                </div>
              </div>
            ) : null}

            {currentAnalysis.summary ? (
              <p className="text-[13px] leading-relaxed text-ink">{currentAnalysis.summary}</p>
            ) : null}
          </div>

          {/* 能力标签 */}
          {capabilities.length > 0 ? (
            <div className="flex flex-col gap-2">
              {capabilities.map((c) => (
                <CapabilityCard key={c.id} cap={c} />
              ))}
            </div>
          ) : currentAnalysis.status === "analyzed" ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[12px] text-ink-2">
              未提取到明确能力（分析成功，但原始文件信息不足以归纳出可操作的能力，不猜测）。
            </div>
          ) : null}

          {/* 历史 */}
          {history.length > 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-ink-3">
              <History className="size-3.5" />
              历史分析 {history.length} 条（保留旧版本记录，当前以最新为准）
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AnalysisStatus }) {
  const map: Record<AnalysisStatus, { label: string; cls: string }> = {
    analyzed: { label: "已分析", cls: "border-success/30 bg-success/10 text-success" },
    pending: { label: "待分析", cls: "border-white/15 bg-white/[0.06] text-ink-2" },
    failed: { label: "分析失败", cls: "border-danger/30 bg-danger/10 text-danger" },
    expired: { label: "已过期", cls: "border-warning/30 bg-warning/10 text-warning" },
  };
  const m = map[status] ?? map.pending;
  return <Badge className={m.cls}>{m.label}</Badge>;
}

function CapabilityCard({ cap }: { cap: ResourceCapability }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">
          {cap.capability}
        </p>
        <Badge variant="outline" className="border-white/10 text-ink-2">
          {capabilityCategoryLabel(cap.category)}
        </Badge>
        <span className="text-[11px] text-ink-3">
          置信度 {(cap.confidence * 100).toFixed(0)}%
        </span>
      </div>
      {cap.executionHint ? (
        <p className="mt-1.5 text-[11px] text-ink-3">
          执行提示（仅描述，不执行）：<code className="font-mono text-violet-300/80">{cap.executionHint}</code>
        </p>
      ) : null}
      <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-ink-3">
          证据 · {cap.evidenceRef}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
          “{cap.evidenceSnippet}”
        </p>
        <Link
          href={`/resources/${cap.resourceId}`}
          className="mt-1.5 inline-block text-[11px] text-violet-300/80 hover:underline"
        >
          查看资源来源 →
        </Link>
      </div>
    </div>
  );
}
