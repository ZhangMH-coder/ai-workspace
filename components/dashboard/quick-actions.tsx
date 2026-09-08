"use client";

import Link from "next/link";
import { ArrowUpRight, Bot, FolderKanban, Sparkles } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      icon: Bot,
      title: "新建 Agent",
      description: "创建并配置新的智能体",
      href: "/agents/new",
    },
    {
      icon: FolderKanban,
      title: "新建项目",
      description: "组织任务与协作",
      href: "/projects",
    },
    {
      icon: Sparkles,
      title: "浏览技能",
      description: "从技能库发现能力",
      href: "/skills",
    },
  ];

  return (
    <div>
      <h3 className="mb-3 text-[14px] font-semibold text-ink">快捷操作</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-white/15 hover:bg-surface-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] transition-colors duration-150 group-hover:bg-brand-soft">
              <action.icon className="h-4 w-4 text-ink-2 transition-colors duration-150 group-hover:text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{action.title}</p>
              <p className="mt-0.5 truncate text-[12px] text-ink-3">{action.description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
