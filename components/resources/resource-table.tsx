/**
 * Resource Discovery —— 资源列表（V1 MVP）
 *
 * 统一索引表：类型 / Harness / 可解析过滤 + 搜索 + 分页；
 * parseable=false 的资源明确展示「发现但暂无法解析」与原因，保留真实路径。
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { EyeOff, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  RESOURCE_TYPE_OPTIONS,
  resourceTypeLabel,
  type DiscoveredResource,
  type ResourceType,
} from "@/lib/types";

const TYPE_FILTERS: (ResourceType | "all")[] = [
  "all",
  ...RESOURCE_TYPE_OPTIONS.map((t) => t.id),
];

export function ResourceTable({ initialHarness }: { initialHarness?: string }) {
  const resources = useWorkspaceStore((s) => s.discovery.resources);
  const total = useWorkspaceStore((s) => s.discovery.resourcesTotal);
  const loading = useWorkspaceStore((s) => s.discovery.loading);
  const harnesses = useWorkspaceStore((s) => s.discovery.overview?.harnesses ?? []);
  const fetchResources = useWorkspaceStore((s) => s.fetchDiscoveredResources);
  const hideResource = useWorkspaceStore((s) => s.hideResource);

  const [type, setType] = useState<ResourceType | "all">("all");
  const [harness, setHarness] = useState<string>(initialHarness ?? "all");
  const [parseable, setParseable] = useState<"all" | "true" | "false">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    void fetchResources({
      type: type === "all" ? undefined : type,
      harness: harness === "all" ? undefined : harness,
      parseable: parseable === "all" ? undefined : parseable === "true",
      search: search || undefined,
      page,
      pageSize: 50,
    });
  }, [fetchResources, type, harness, parseable, search, page]);

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-3">
      {/* 过滤栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索资源名称或来源路径…"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setPage(1);
              }}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                type === t
                  ? "bg-primary/15 text-primary"
                  : "text-ink-2 hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              {t === "all" ? "全部" : resourceTypeLabel(t)}
            </button>
          ))}
        </div>
        <select
          value={harness}
          onChange={(e) => {
            setHarness(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[12px] text-ink-2 outline-none"
          aria-label="按 Harness 过滤"
        >
          <option value="all">全部 Harness</option>
          {harnesses.map((h) => (
            <option key={h.harnessId} value={h.harnessId}>
              {h.harnessName}
            </option>
          ))}
        </select>
        <select
          value={parseable}
          onChange={(e) => {
            setParseable(e.target.value as "all" | "true" | "false");
            setPage(1);
          }}
          className="h-8 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[12px] text-ink-2 outline-none"
          aria-label="按可解析状态过滤"
        >
          <option value="all">全部状态</option>
          <option value="true">已解析</option>
          <option value="false">发现但暂无法解析</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">
          <span className="w-1/4">资源</span>
          <span className="w-24">类型</span>
          <span className="w-36">Harness</span>
          <span className="hidden flex-1 md:block">来源路径</span>
          <span className="w-24 text-right">状态</span>
        </div>
        {loading && resources.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-ink-3">加载中…</div>
        ) : resources.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-ink-3">
            当前筛选条件下没有资源（仅展示真实索引结果）
          </div>
        ) : (
          resources.map((r) => (
            <ResourceRow
              key={r.id}
              resource={r}
              onHide={async (res) => {
                try {
                  await hideResource(res.id);
                  toast.success(`已隐藏 ${res.name}（可在 Settings 恢复）`);
                  await fetchResources({
                    type: type === "all" ? undefined : type,
                    harness: harness === "all" ? undefined : harness,
                    parseable: parseable === "all" ? undefined : parseable === "true",
                    search: search || undefined,
                    page,
                    pageSize: PAGE_SIZE,
                  });
                } catch {
                  toast.error("隐藏失败");
                }
              }}
            />
          ))
        )}
      </div>

      {/* 分页 */}
      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-[12px] text-ink-2">
          <span>
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-[12px]"
            >
              上一页
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-[12px]"
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function usageOf(resource: DiscoveredResource): string {
  const usage = resource.metadata?.usage;
  if (typeof usage === "string" && usage.trim()) return usage;
  return resource.description || resource.framework;
}

function ResourceRow({
  resource,
  onHide,
}: {
  resource: DiscoveredResource;
  onHide: (resource: DiscoveredResource) => void;
}) {
  return (
    <div className="group flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 transition-colors last:border-0 hover:bg-white/[0.03]">
      <Link href={`/resources/${resource.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-1/4 min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{resource.name}</p>
          <p className="truncate text-[11px] text-ink-3" title={usageOf(resource)}>
            {usageOf(resource)}
          </p>
        </div>
        <div className="w-24 min-w-0">
          <Badge
            variant="outline"
            className="max-w-full truncate border-white/10 text-[11px] font-normal text-ink-2"
          >
            {resourceTypeLabel(resource.type)}
          </Badge>
        </div>
        <div className="w-36 truncate text-[12px] text-ink-2" title={resource.source}>{resource.source}</div>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate font-mono text-[11px] text-ink-3">{resource.sourcePath}</p>
        </div>
        <div className="flex w-24 items-center justify-end gap-1.5">
          {resource.parseable ? (
            <Badge className="border-success/30 bg-success/10 text-success">已解析</Badge>
          ) : (
            <Badge className="border-warning/30 bg-warning/10 text-warning" title={resource.parseNote ?? ""}>
              暂无法解析
            </Badge>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onHide(resource)}
        title="从展示中隐藏此资源（不删除原始文件）"
        aria-label={`隐藏 ${resource.name}`}
        className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.03] p-1.5 text-ink-3 opacity-0 transition-all hover:border-white/20 hover:text-ink group-hover:opacity-100"
      >
        <EyeOff className="size-3.5" />
      </button>
    </div>
  );
}
