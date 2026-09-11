/**
 * Settings —— 已隐藏资源（展示排除）管理。
 *
 * 列出用户隐藏的资源路径，支持一键恢复；数据来自 user_hidden_resource 表（真实）。
 */
"use client";

import { useEffect, useState } from "react";
import { EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listHiddenResources } from "@/lib/services/resource-discovery";
import { useWorkspaceStore } from "@/stores/workspace";

interface HiddenRow {
  id: string;
  sourcePath: string;
  hiddenAt: string;
}

export function HiddenResources() {
  const unhideResourceRecord = useWorkspaceStore((s) => s.unhideResourceRecord);
  const [items, setItems] = useState<HiddenRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listHiddenResources().then(setItems).catch(() => setItems([]));
  }, []);

  async function handleRestore(row: HiddenRow) {
    setBusyId(row.id);
    try {
      await unhideResourceRecord(row.id);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== row.id));
      toast.success("已恢复展示");
    } catch {
      toast.error("恢复失败");
    } finally {
      setBusyId(null);
    }
  }

  if (items === null) {
    return <p className="py-4 text-center text-[12px] text-ink-3">加载中…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.07] py-8 text-ink-3">
        <EyeOff className="size-5" />
        <p className="text-[12px]">当前没有隐藏的资源（隐藏功能不会删除原始文件）</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-ink-3">
        共 {items.length} 个资源已从展示中排除（不影响扫描与统计）
      </p>
      {items.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[11.5px] text-ink-2">{row.sourcePath}</p>
            <p className="text-[10.5px] text-ink-3">隐藏于 {new Date(row.hiddenAt).toLocaleString()}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busyId === row.id}
            onClick={() => handleRestore(row)}
            className="h-7 gap-1.5 border-white/10 px-2.5 text-[11.5px] text-ink-2 hover:text-ink"
          >
            <RotateCcw className="size-3" /> 恢复
          </Button>
        </div>
      ))}
    </div>
  );
}
