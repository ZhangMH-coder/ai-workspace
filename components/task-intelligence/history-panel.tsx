/**
 * HistoryPanel —— 任务分析历史管理（S1.51）
 *
 * 列表展示历史分析（任务摘要 / 状态 / 当前标记 / 时间）；
 * 点击回看（加载为当前展示态），删除单条（连带需求/推荐/计划）。
 */
"use client";
import { Trash2, History } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/stores/workspace";
import type { TaskAnalysisListItemDTO } from "@/lib/api/task-intelligence";

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  completed: { label: "已完成", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  failed: { label: "失败", cls: "border-danger/30 bg-danger/10 text-danger" },
  partial: { label: "部分", cls: "border-warning/30 bg-warning/10 text-warning" },
};

export function HistoryPanel({
  history,
  currentId,
  onLoad,
  onDelete,
}: {
  history: TaskAnalysisListItemDTO[];
  currentId: string | null | undefined;
  onLoad: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (history.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <History className="size-3.5 text-primary" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
          最近分析
        </p>
        <span className="text-[10.5px] text-ink-3">
          {history.length} 条 · 点击回看
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {history.map((h) => {
          const st = STATUS_LABEL[h.status] ?? STATUS_LABEL.completed;
          const isCur = currentId === h.id;
          return (
            <div
              key={h.id}
              className={`group flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                isCur
                  ? "border-primary/25 bg-primary/[0.05]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <button
                type="button"
                onClick={() => void onLoad(h.id)}
                className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                title={`回看：${h.task}`}
              >
                <span className="truncate text-[12.5px] font-medium text-ink">{h.task}</span>
                <span className="flex items-center gap-1.5 text-[10.5px] text-ink-3">
                  <Badge className={`border px-1.5 py-0 text-[10px] font-normal ${st.cls}`}>
                    {st.label}
                  </Badge>
                  {isCur ? (
                    <Badge className="border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-normal text-primary">
                      当前
                    </Badge>
                  ) : null}
                  <span>{formatTime(h.analyzedAt ?? h.createdAt)}</span>
                  {h.summary ? (
                    <span className="truncate text-ink-3">· {h.summary}</span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void onDelete(h.id)}
                title="删除这条历史（连带其需求/推荐/计划；不删除任何原始文件）"
                aria-label={`删除历史 ${h.task}`}
                className="shrink-0 rounded-md p-1.5 text-ink-3 opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
