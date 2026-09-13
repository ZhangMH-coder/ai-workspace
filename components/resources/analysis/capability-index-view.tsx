/**
 * Resource Intelligence —— 能力索引视图（/resources/capabilities）
 *
 * 内容：分析状态概览 + 增量分析触发 + 任务匹配 + 按类别分组的能力索引。
 * 所有数据来自真实文件分析（HeuristicAnalyzer），零 Demo / Mock 数据。
 */
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  capabilityCategoryLabel,
  type CapabilityCategory,
  type CapabilityIndexEntry,
} from "@/lib/types";

/** S1.49：能力索引分页大小 */
const INDEX_PAGE_SIZE = 100;

export function CapabilityIndexView() {
  const status = useWorkspaceStore((s) => s.analysis.status);
  const index = useWorkspaceStore((s) => s.analysis.capabilityIndex);
  const matchResult = useWorkspaceStore((s) => s.analysis.matchResult);
  const lastRun = useWorkspaceStore((s) => s.analysis.lastRun);
  const loading = useWorkspaceStore((s) => s.analysis.loading);
  const running = useWorkspaceStore((s) => s.analysis.running);
  const error = useWorkspaceStore((s) => s.analysis.error);
  const fetchStatus = useWorkspaceStore((s) => s.fetchAnalysisStatus);
  const fetchIndex = useWorkspaceStore((s) => s.fetchCapabilityIndex);
  const runAnalysis = useWorkspaceStore((s) => s.runAnalysis);
  const matchTask = useWorkspaceStore((s) => s.matchResourcesForTask);
  const [task, setTask] = useState("");
  // S1.49：能力索引搜索 / 类别过滤 / 分页
  const [indexQuery, setIndexQuery] = useState("");
  const [indexCategory, setIndexCategory] = useState<CapabilityCategory | "all">("all");
  const [indexPage, setIndexPage] = useState(1);

  /** 类别过滤选项（来自真实索引，不去重猜测） */
  const categoryOptions = useMemo(() => {
    const seen = new Set<CapabilityCategory>();
    for (const e of index) seen.add(e.category);
    return Array.from(seen);
  }, [index]);

  /** 过滤后的拍平能力项（搜索匹配 capability / 资源名 / 证据引用 / 类别名） */
  const filteredItems = useMemo(() => {
    const q = indexQuery.trim().toLowerCase();
    const out: { category: CapabilityCategory; item: CapabilityIndexEntry["items"][number] }[] = [];
    for (const entry of index) {
      if (indexCategory !== "all" && entry.category !== indexCategory) continue;
      const catLabel = capabilityCategoryLabel(entry.category).toLowerCase();
      for (const it of entry.items) {
        if (
          q &&
          !catLabel.includes(q) &&
          !it.capability.toLowerCase().includes(q) &&
          !it.resourceName.toLowerCase().includes(q) &&
          !it.evidenceRef.toLowerCase().includes(q)
        ) {
          continue;
        }
        out.push({ category: entry.category, item: it });
      }
    }
    return out;
  }, [index, indexQuery, indexCategory]);

  const indexFiltered = indexQuery.trim().length > 0 || indexCategory !== "all";
  const indexPageCount = Math.max(1, Math.ceil(filteredItems.length / INDEX_PAGE_SIZE));
  const safePage = Math.min(indexPage, indexPageCount);
  const pageItems = filteredItems.slice(
    (safePage - 1) * INDEX_PAGE_SIZE,
    safePage * INDEX_PAGE_SIZE,
  );

  useEffect(() => {
    void fetchStatus();
    void fetchIndex();
  }, [fetchStatus, fetchIndex]);

  async function handleRun() {
    try {
      await runAnalysis();
      toast.success(
        `增量分析完成：处理 ${lastRun?.processed ?? "-"} / 跳过 ${lastRun?.skipped ?? "-"}`
      );
    } catch {
      toast.error("分析失败，请查看错误信息");
    }
  }

  async function handleMatch(e: React.FormEvent) {
    e.preventDefault();
    const t = task.trim();
    if (!t) return;
    await matchTask(t);
  }

  if (loading && !status) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[92px] w-full rounded-xl bg-white/[0.04]" />
        <Skeleton className="h-40 w-full rounded-xl bg-white/[0.04]" />
        <Skeleton className="h-52 w-full rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[12px] text-danger">
          能力索引请求失败：{error}
        </div>
      ) : null}

      {/* 状态条 + 操作 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="总资源" value={status?.totalResources ?? 0} />
          <Stat label="已分析" value={status?.analyzed ?? 0} tone="ok" />
          <Stat label="失败" value={status?.failed ?? 0} tone={status?.failed ? "bad" : undefined} />
          <Stat label="能力标签" value={status?.capabilityCount ?? 0} />
          <Stat
            label="分析器版本"
            value={status?.analyzerVersion ?? "—"}
            small
            hint={
              status?.lastRunAt
                ? `上次分析 ${formatAgo(status.lastRunAt)}（扫描即自动索引）`
                : "尚未运行（扫描时自动索引）"
            }
          />
        </div>
        <Button onClick={handleRun} disabled={running} className="h-8 gap-1.5 text-[12px]">
          <Sparkles className="size-3.5" />
          {running ? "分析中…" : "增量分析"}
        </Button>
      </div>
      {lastRun ? (
        <p className="text-[11px] text-ink-3">
          最近一次：处理 {lastRun.processed} · 跳过 {lastRun.skipped} · 成功 {lastRun.analyzed} · 失败 {lastRun.failed}
        </p>
      ) : null}

      {/* 任务匹配 */}
      <Card className="border-white/10 bg-transparent">
        <CardHeader className="px-4 pt-4">
          <CardTitle className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <Search className="size-3.5 text-violet-400" /> 任务 → 资源匹配
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handleMatch} className="flex gap-2">
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="描述你要做的事，例如：帮我做一份数据周报 / 写一篇小红书文案"
              className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-violet-400/40"
            />
            <Button type="submit" size="sm" className="h-9 px-3 text-[12px]">
              匹配
            </Button>
          </form>
          {matchResult ? (
            <div className="mt-3 flex flex-col gap-1.5">
              {matchResult.matches.length === 0 ? (
                <p className="text-[12px] text-ink-3">没有找到匹配的真实资源（如实，不猜测）。</p>
              ) : (
                matchResult.matches.map((m) => (
                  <Link
                    key={`${m.resourceId}-${m.capability}`}
                    href={`/resources/${m.resourceId}`}
                    className="group flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <span className="text-[13px] font-medium text-ink group-hover:text-violet-300/90">
                      {m.resourceName}
                    </span>
                    <Badge variant="outline" className="border-white/10 text-[10px] text-ink-2">
                      {capabilityCategoryLabel(m.category)}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-ink-3">
                      {m.capability}
                    </span>
                    <span className="text-[11px] text-ink-3">
                      匹配度 {(m.score * 100).toFixed(0)}%
                    </span>
                    <ArrowRight className="size-3 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 能力索引（S1.49：搜索 / 类别过滤 / 分页） */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={indexQuery}
              onChange={(e) => {
                setIndexQuery(e.target.value);
                setIndexPage(1);
              }}
              placeholder="搜索能力 / 资源名 / 证据引用…"
              aria-label="搜索能力索引"
              className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-3 text-[12.5px] text-ink outline-none placeholder:text-ink-3 focus:border-violet-400/40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <ListFilter className="size-3.5 text-ink-3" />
            <select
              value={indexCategory}
              onChange={(e) => {
                setIndexCategory(e.target.value as CapabilityCategory | "all");
                setIndexPage(1);
              }}
              aria-label="按类别过滤"
              className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[12px] text-ink-2 outline-none focus:border-violet-400/40"
            >
              <option value="all">全部分类</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {capabilityCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-ink-3">
            {indexFiltered ? `${filteredItems.length} 条匹配` : `${filteredItems.length} 条能力`}
          </span>
        </div>

        {index.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <BrainCircuit className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <p className="text-[12px] leading-relaxed text-ink-2">
              尚无能力索引。运行「增量分析」后，这里会展示从真实资源归纳出的能力（可追溯）。
            </p>
          </div>
        ) : indexFiltered ? (
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
            {pageItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-ink-3">
                没有匹配「{indexQuery}」的能力（如实空态，不猜测）。
              </p>
            ) : (
              pageItems.map(({ category, item }, i) => (
                <Link
                  key={`${item.resourceId}-${item.capability}-${(safePage - 1) * INDEX_PAGE_SIZE + i}`}
                  href={`/resources/${item.resourceId}`}
                  className="group flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
                >
                  <Badge variant="outline" className="border-white/10 text-[10px] text-ink-2">
                    {capabilityCategoryLabel(category)}
                  </Badge>
                  <span className="text-[12px] font-medium text-ink group-hover:text-violet-300/90">
                    {item.resourceName}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink-3">{item.capability}</span>
                  <code className="hidden font-mono text-[10px] text-ink-3 sm:inline">{item.evidenceRef}</code>
                  <span className="text-[10px] text-ink-3">
                    {(item.confidence * 100).toFixed(0)}%
                  </span>
                </Link>
              ))
            )}
            {indexPageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-white/[0.05] px-1 pt-2">
                <span className="text-[11px] text-ink-3">
                  第 {safePage} / {indexPageCount} 页 · 共 {filteredItems.length} 条
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIndexPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="上一页"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-ink-2 transition-colors hover:border-white/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndexPage((p) => Math.min(indexPageCount, p + 1))}
                    disabled={safePage >= indexPageCount}
                    aria-label="下一页"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-ink-2 transition-colors hover:border-white/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {index.map((entry) => (
              <CategorySection key={entry.category} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  small,
  hint,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "bad";
  small?: boolean;
  hint?: string;
}) {
  const color =
    tone === "ok" ? "text-success" : tone === "bad" ? "text-danger" : "text-ink";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className={`${small ? "text-[15px]" : "text-[22px]"} font-semibold leading-none tracking-tight ${color}`}>
        {value}
      </p>
      {hint ? <p className="text-[10px] leading-snug text-ink-3">{hint}</p> : null}
    </div>
  );
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "刚刚";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} 分钟前`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} 小时前`;
  return new Date(iso).toLocaleString();
}

function CategorySection({ entry }: { entry: CapabilityIndexEntry }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-ink">
          {capabilityCategoryLabel(entry.category)}
        </span>
        <Badge variant="outline" className="border-white/10 text-[10px] text-ink-2">
          {entry.count}
        </Badge>
        <span className="ml-auto text-[11px] text-ink-3">{open ? "收起" : "展开"}</span>
      </button>
      {open ? (
        <div className="flex flex-col px-4 pb-3">
          {entry.items.map((it) => (
            <Link
              key={`${it.resourceId}-${it.capability}`}
              href={`/resources/${it.resourceId}`}
              className="group flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
            >
              <span className="text-[12px] font-medium text-ink group-hover:text-violet-300/90">
                {it.resourceName}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-ink-3">{it.capability}</span>
              <code className="font-mono text-[10px] text-ink-3">{it.evidenceRef}</code>
              <span className="text-[10px] text-ink-3">
                {(it.confidence * 100).toFixed(0)}%
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
