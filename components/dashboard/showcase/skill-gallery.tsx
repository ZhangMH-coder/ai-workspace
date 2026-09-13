/**
 * 展示首页 — 精选本机技能画廊（真实数据）
 *
 * 支持：按技能类别切换 + 卡片悬停预览完整说明 + 复制使用方式（去对应 Harness 用）。
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DiscoveredResource } from "@/lib/types";

function usageOf(resource: DiscoveredResource): string {
  const u = resource.metadata?.usage;
  if (typeof u === "string" && u.trim()) return u;
  return resource.description || "（无描述）";
}

export function SkillGallery({ skills }: { skills: DiscoveredResource[] }) {
  const [category, setCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of skills) {
      const c = s.metadata?.category;
      if (typeof c === "string" && c.trim()) set.add(c);
    }
    return Array.from(set).sort();
  }, [skills]);

  const visible = useMemo(
    () => (category === "all" ? skills : skills.filter((s) => s.metadata?.category === category)),
    [skills, category],
  );

  async function handleCopy(s: DiscoveredResource) {
    const text = `【${s.name}】使用方式：${usageOf(s)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 剪贴板不可用时忽略，仅做选中反馈
    }
    setCopiedId(s.id);
    setTimeout(() => setCopiedId((cur) => (cur === s.id ? null : cur)), 2000);
  }

  if (skills.length === 0) return null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">精选本机技能</p>
        <Link href="/resources?harness=hermes" className="text-[12px] text-ink-3 hover:text-primary">
          查看全部 →
        </Link>
      </div>
      {categories.length > 1 ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <CategoryTab active={category === "all"} count={skills.length} onClick={() => setCategory("all")}>
            全部
          </CategoryTab>
          {categories.map((c) => (
            <CategoryTab
              key={c}
              active={category === c}
              count={skills.filter((s) => s.metadata?.category === c).length}
              onClick={() => setCategory(c)}
            >
              {c}
            </CategoryTab>
          ))}
        </div>
      ) : null}
      <motion.div key={category} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((s, i) => {
          const c = typeof s.metadata?.category === "string" ? s.metadata.category : null;
          return (
            <motion.div
              key={s.id}
              className="group relative"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.3, ease: "easeOut" }}
            >
              <Link
                href={`/resources/${s.id}`}
                className="group relative flex h-full flex-col rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 transition-colors hover:border-primary/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-medium text-ink">{s.name}</p>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {/* 移动端常驻复制（lg 隐藏，hover 预览内已提供） */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        void handleCopy(s);
                      }}
                      aria-label={`复制 ${s.name} 的使用方式`}
                      className="rounded-md p-1 text-ink-3 transition-colors hover:text-primary lg:hidden"
                    >
                      {copiedId === s.id ? (
                        <Check className="size-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                    <ArrowUpRight className="size-3.5 text-ink-3 transition-colors group-hover:text-primary" />
                  </span>
                </div>
                {c ? (
                  <Badge variant="outline" className="mt-1.5 w-fit border-white/10 text-[10px] font-normal text-ink-3">
                    <FolderOpen className="mr-1 size-2.5" />
                    {c}
                  </Badge>
                ) : null}
                <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-ink-2">
                  {usageOf(s)}
                </p>
                {/* 悬停预览：卡片内嵌覆盖（无方向溢出；复制按钮可点，其余点击穿透进详情） */}
                <div className="pointer-events-none absolute inset-0 z-10 hidden flex-col rounded-xl border border-primary/20 bg-surface-2/95 p-4 opacity-0 shadow-xl backdrop-blur transition-opacity duration-150 group-hover:pointer-events-auto group-hover:flex group-hover:opacity-100 lg:flex">
                  <p className="text-[11px] font-medium text-ink">{s.name}</p>
                  <p className="mt-1 max-h-[140px] flex-1 overflow-auto whitespace-pre-line text-[11px] leading-relaxed text-ink-2">
                    {usageOf(s)}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      void handleCopy(s);
                    }}
                    className="pointer-events-auto mt-2 flex h-6 w-fit items-center gap-1 rounded-md border border-white/10 px-2 text-[11px] text-ink-2 transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    {copiedId === s.id ? (
                      <>
                        <Check className="size-3 text-emerald-400" /> 已复制
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" /> 复制使用方式
                      </>
                    )}
                  </button>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function CategoryTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative h-6 rounded-md px-2.5 text-[11.5px] transition-colors ${
        active ? "text-primary" : "text-ink-3 hover:bg-white/[0.05] hover:text-ink-2"
      }`}
    >
      {active ? (
        <motion.span
          layoutId="skill-category-bg"
          className="absolute inset-0 rounded-md bg-primary/15"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      ) : null}
      <span className="relative z-10">
        {children}
        {count !== undefined ? <span className="opacity-60"> · {count}</span> : null}
      </span>
    </button>
  );
}
