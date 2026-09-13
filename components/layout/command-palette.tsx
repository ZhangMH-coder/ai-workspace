"use client";

/**
 * Command Palette —— 全局搜索（S1.51）
 *
 * 打开时懒加载能力索引（前端过滤）；输入时服务端搜索真实资源（名称/路径）。
 * 分组：资源（真实发现结果）→ 能力（本地过滤，可追溯）→ 导航。
 * 点击资源/能力跳转对应资源详情；零演示数据。
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Search } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { allNavItems } from "@/lib/navigation";
import { fetchDiscoveredResources } from "@/lib/services/resource-discovery";
import { fetchCapabilityIndex } from "@/lib/services/resource-analysis";
import type { CapabilityCategory, DiscoveredResource } from "@/lib/types";

const RESULT_LIMIT = 6;

interface FlatCapability {
  resourceId: string;
  resourceName: string;
  harnessId: string;
  capability: string;
  confidence: number;
  evidenceRef: string;
  category: CapabilityCategory;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [resources, setResources] = useState<DiscoveredResource[]>([]);
  const [capabilities, setCapabilities] = useState<FlatCapability[]>([]);
  const [query, setQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 打开时懒加载能力索引（一次）
  useEffect(() => {
    if (!open) return;
    if (capabilities.length === 0) {
      fetchCapabilityIndex()
        .then((caps) => {
          const flat: FlatCapability[] = [];
          for (const g of caps) {
            flat.push(...g.items.map((it) => ({ ...it, category: g.category })));
          }
          setCapabilities(flat);
        })
        .catch(() => {});
    }
  }, [open, capabilities.length]);

  // 输入防抖 → 服务端搜索真实资源（set 均在异步回调内，避免级联渲染）
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!q) {
        setResources([]);
        return;
      }
      fetchDiscoveredResources({ search: q, pageSize: RESULT_LIMIT })
        .then((r) => setResources(r.items))
        .catch(() => setResources([]));
    }, q ? 280 : 0);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, open]);

  // 本地能力过滤（当前有效 970 条）
  const ql = query.trim().toLowerCase();
  const capMatches = ql
    ? capabilities
        .filter((c) => (c.capability + " " + c.category + " " + c.resourceName).toLowerCase().includes(ql))
        .slice(0, RESULT_LIMIT)
    : [];

  const showDynamic = query.trim().length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="命令面板"
      description="搜索资源、能力并跳转"
    >
      <Command className="border-border/60 bg-popover/90 backdrop-blur-xl">
        <CommandInput
          placeholder="搜索资源、能力、页面…"
          value={query}
          onValueChange={(v) => setQuery(v)}
        />
        <CommandList>
          <CommandEmpty>未找到相关结果（只搜索真实索引数据）</CommandEmpty>

          {showDynamic && resources.length > 0 ? (
            <CommandGroup heading="资源">
              {resources.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.name} ${r.sourcePath} ${r.type}`}
                  onSelect={() => {
                    router.push(`/resources/${r.id}`);
                    onOpenChange(false);
                  }}
                >
                  <FileText className="text-ink-3" />
                  <span>{r.name}</span>
                  <span className="ml-auto max-w-[45%] truncate text-xs text-ink-3">
                    {r.source}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {showDynamic && capMatches.length > 0 ? (
            <CommandGroup heading="能力标签">
              {capMatches.map((c) => (
                <CommandItem
                  key={`${c.resourceId}-${c.capability}`}
                  value={`${c.capability} ${c.category} ${c.resourceName}`}
                  onSelect={() => {
                    router.push(`/resources/${c.resourceId}`);
                    onOpenChange(false);
                  }}
                >
                  <Search className="text-ink-3" />
                  <span>{c.capability}</span>
                  <span className="ml-auto text-xs text-ink-3">
                    {c.category} · {c.resourceName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {showDynamic && (resources.length > 0 || capMatches.length > 0) ? (
            <CommandSeparator />
          ) : null}

          <CommandGroup heading="导航">
            {allNavItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.description ?? ""} ${item.href}`}
                onSelect={() => {
                  router.push(item.href);
                  onOpenChange(false);
                }}
              >
                <item.icon className="text-ink-3" />
                <span>{item.title}</span>
                {item.description ? (
                  <span className="ml-auto text-xs text-ink-3">{item.description}</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="工作区">
            <CommandItem value="本机工作区" onSelect={() => onOpenChange(false)}>
              <Building2 className="text-ink-3" />
              <span>本机工作区</span>
              <span className="ml-auto text-xs text-ink-3">当前 · 唯一</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-ink-3">
          <span>↑↓ 浏览 · Enter 打开 · Esc 关闭</span>
          <span className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <span className="ml-1">打开面板</span>
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
