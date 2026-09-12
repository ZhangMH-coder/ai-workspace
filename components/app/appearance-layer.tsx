/**
 * AppearanceLayer（S1.24）
 *
 * 职责：
 *  1) 把 useAppearance store 值应用到 <html> 的 data-* 与 CSS 变量（全局即时生效）；
 *  2) 渲染背景层（流体渐变 / 壁纸 + 雾化），内容区在其之上（z-10）。
 *
 * 挂载在根布局 body 内、内容之前。首帧主题已由 layout 内联脚本防闪，其余属性在此补齐。
 */
"use client";

import { useEffect, useMemo, useState } from "react";

import { loadWallpaper } from "@/lib/wallpaper-db";
import { useAppearance } from "@/lib/appearance-store";

export function AppearanceLayer() {
  const app = useAppearance();
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperUrls, setWallpaperUrls] = useState<Record<string, string>>({});

  // 应用 store → DOM 属性 / CSS 变量
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", app.theme);
    el.setAttribute("data-motion", app.reduceMotion ? "reduced" : "");
    el.setAttribute("data-glass", app.glass ? "on" : "off");
    el.setAttribute("data-bg", app.bgMode);
    const s = el.style;
    s.setProperty("--bg-hue", `${app.bgHue}deg`);
    s.setProperty("--bg-sat", `${app.bgSaturation}%`);
    s.setProperty("--bg-light", `${14 + app.bgSaturation * 0.06}%`);
    s.setProperty("--bg-brightness", `${Math.max(0.2, app.bgBrightness / 50).toFixed(2)}`);
    s.setProperty("--glass-blur", `${app.glassBlur}px`);
    s.setProperty("--glass-frost", `${(app.glassFrost / 100) * 0.5}`);
    s.setProperty("--wallpaper-opacity", `${app.wallpaperOpacity / 100}`);
  }, [app]);

  // 加载壁纸（当前选中 + 轮播列表）：IndexedDB 异步读取后写入 URL 状态
  useEffect(() => {
    let alive = true;
    const ids = app.wallpaperList;
    void Promise.all(ids.map(async (id) => ({ id, url: await loadWallpaper(id) }))).then(
      (items) => {
        if (!alive) return;
        const map: Record<string, string> = {};
        for (const it of items) if (it.url) map[it.id] = it.url;
        setWallpaperUrls(map);
        if (ids.length === 0) {
          setWallpaperUrl(null);
        } else if (app.wallpaperPath && map[app.wallpaperPath]) {
          setWallpaperUrl(map[app.wallpaperPath]);
        } else if (map[ids[0]]) {
          setWallpaperUrl(map[ids[0]]);
        }
      }
    );
    return () => {
      alive = false;
    };
  }, [app.wallpaperList, app.wallpaperPath]);

  // 多图轮播：定时器驱动切换
  useEffect(() => {
    if (app.reduceMotion || app.wallpaperInterval <= 0 || app.wallpaperList.length < 2) return;
    const timer = setInterval(() => {
      setWallpaperUrl((cur) => {
        const keys = Object.keys(wallpaperUrls);
        if (keys.length < 2) return cur;
        const idx = Math.max(0, keys.indexOf(cur ?? ""));
        return keys[(idx + 1) % keys.length] ? wallpaperUrls[keys[(idx + 1) % keys.length]] : cur;
      });
    }, app.wallpaperInterval * 1000);
    return () => clearInterval(timer);
  }, [app.wallpaperInterval, app.reduceMotion, app.wallpaperList, wallpaperUrls]);

  const fluidStyle = useMemo<React.CSSProperties>(() => {
    if (app.bgMode !== "fluid") return {};
    return {
      backgroundImage: [
        `radial-gradient(120% 90% at 12% 8%, hsl(var(--bg-hue) 70% 62% / 0.32), transparent 60%)`,
        `radial-gradient(90% 80% at 88% 18%, hsl(calc(var(--bg-hue) + 60deg) 65% 66% / 0.26), transparent 62%)`,
        `radial-gradient(110% 100% at 60% 96%, hsl(calc(var(--bg-hue) - 40deg) 62% 58% / 0.24), transparent 60%)`,
        `linear-gradient(160deg, hsl(var(--bg-hue) 42% 12%) 0%, hsl(var(--bg-hue) 46% 15%) 48%, hsl(var(--bg-hue) 50% 18%) 100%)`,
      ].join(", "),
      filter: `brightness(var(--bg-brightness))`,
    };
  }, [app.bgMode]);

  const activeWallpaper = wallpaperUrl;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      {/* 流体渐变背景 */}
      {app.bgMode === "fluid" ? <div className="app-bg-fluid h-full w-full" style={fluidStyle} /> : null}

      {/* 壁纸背景 */}
      {app.bgMode === "wallpaper" && activeWallpaper ? (
        <div className="app-bg-wallpaper h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- 壁纸为运行时 objectURL，不走 next/image 优化 */}
          <img
            src={activeWallpaper}
            alt=""
            className={
              "h-full w-full object-cover" +
              (app.wallpaperFit === "tile" ? " app-wp-tile" : "") +
              (app.wallpaperAnim === "kenburns" && !app.reduceMotion ? " app-wp-kb" : "")
            }
            style={{
              opacity: app.wallpaperOpacity / 100,
              filter: `brightness(var(--bg-brightness))`,
              objectPosition:
                app.wallpaperFit === "tile" ? "center" : WALLPAPER_POS_CSS[app.wallpaperPosition],
            }}
          />
        </div>
      ) : null}

      {/* 壁纸模式下无图：纯色底（body 兜底） */}

      {/* 雾化层（磨砂度） */}
      {app.bgMode !== "solid" && app.glassFrost > 0 ? (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(255,255,255,var(--glass-frost))` }}
        />
      ) : null}
    </div>
  );
}

const WALLPAPER_POS_CSS: Record<string, string> = {
  "top-left": "top left",
  "top-center": "top center",
  "top-right": "top right",
  "center-left": "center left",
  center: "center",
  "center-right": "center right",
  "bottom-left": "bottom left",
  "bottom-center": "bottom center",
  "bottom-right": "bottom right",
};
