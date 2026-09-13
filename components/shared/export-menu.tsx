/**
 * ExportMenu —— 导出下拉（CSV / JSON）
 *
 * 通过 fetch 拉取服务端导出端点（blob），触发浏览器下载；
 * 不导航、不离开当前页；失败 toast 提示。
 */
"use client";
import { useState } from "react";
import { Check, ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ExportMenu({
  baseUrl,
  filename,
}: {
  baseUrl: string;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"csv" | "json" | null>(null);
  const [done, setDone] = useState<"csv" | "json" | null>(null);

  async function download(format: "csv" | "json") {
    setBusy(format);
    try {
      const res = await fetch(`${baseUrl}?format=${format}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(format);
      setTimeout(() => setDone((v) => (v === format ? null : v)), 2000);
      toast.success(`已导出 ${filename}.${format}（真实索引数据）`);
    } catch {
      toast.error("导出失败，请稍后重试");
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="h-8 gap-1.5 border-white/10 text-[12px] text-ink-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Download className="size-3.5" />
        导出
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-50 mt-1.5 flex w-32 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#16151f] py-1 shadow-xl shadow-black/40">
            {(["csv", "json"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => void download(f)}
                disabled={busy !== null}
                className="flex items-center justify-between px-3 py-2 text-left text-[12px] text-ink-2 transition-colors hover:bg-white/[0.05] hover:text-ink disabled:opacity-50"
              >
                <span className="uppercase">{f} 文件</span>
                {done === f ? (
                  <Check className="size-3 text-emerald-400" />
                ) : busy === f ? (
                  <span className="size-3 animate-spin rounded-full border border-ink-2 border-t-transparent" />
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
