/**
 * Settings — 外观 / 主题（S1.23）
 *
 * 模仿 GlassTodo 主题范式：「主题 = 换 token 值」，即时生效并保存在 localStorage（仅 UI 偏好）。
 * 四套预设：default 深紫（默认）/ warm 暖棕 / cool 冷蓝 / light 浅色。
 */
"use client";

import { Check, Palette } from "lucide-react";
import { useState } from "react";

const THEME_KEY = "aiw-theme";

const THEMES: { id: string; label: string; hint: string; swatch: string }[] = [
  { id: "default", label: "默认", hint: "深色 · 紫罗兰强调", swatch: "#8b5cf6" },
  { id: "warm", label: "暖色", hint: "深色 · 暖棕玻璃", swatch: "#e1b98f" },
  { id: "cool", label: "冷色", hint: "深色 · 冷蓝玻璃", swatch: "#8bc8ea" },
  { id: "light", label: "浅色", hint: "浅色 · 亮面", swatch: "#ffffff" },
];

function currentTheme(): string {
  if (typeof document === "undefined") return "default";
  return document.documentElement.getAttribute("data-theme") ?? "default";
}

export function AppearanceSection() {
  // 客户端首帧从 document 读取已由内联脚本设置的 data-theme（SSR 时为 default，水合后纠正）
  const [theme, setTheme] = useState<string>(() => {
    if (typeof document === "undefined") return "default";
    return currentTheme();
  });

  function applyTheme(id: string) {
    setTheme(id);
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      // localStorage 不可用（隐私模式等）时仅本次会话生效
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Palette className="size-3.5 text-primary" />
        <p className="text-[12px] font-medium text-ink">外观 · 主题</p>
        <span className="ml-auto text-[10.5px] text-ink-3">即时生效，保存在本机浏览器</span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="主题">
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTheme(t.id)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                active
                  ? "border-primary/40 bg-primary/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <span
                className="flex size-4 shrink-0 items-center justify-center rounded-full border border-white/20"
                style={{ backgroundColor: t.swatch }}
              >
                {active ? <Check className="size-2.5 text-black" /> : null}
              </span>
              <span className="flex flex-col">
                <span className={`text-[12px] font-medium ${active ? "text-primary" : "text-ink"}`}>
                  {t.label}
                </span>
                <span className="text-[10px] text-ink-3">{t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10.5px] leading-relaxed text-ink-3">
        主题只换配色 token，不改变布局与功能。浅色主题下部分深色设计遗留的白色微透明边框会被自动补偿。
      </p>
    </div>
  );
}
