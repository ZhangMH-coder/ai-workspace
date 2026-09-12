/**
 * Settings — 外观 / 背景（S1.24，复刻 GlassTodo SettingsDrawer 的外观体系）
 *
 * 分组：
 *  外观：主题（四套 seg）/ 玻璃效果 switch / 减少动效 switch
 *  背景：背景模式（纯色 / 流体 / 壁纸）/ 壁纸图片（IndexedDB）/ 显示方式 / 位置
 *        / 动画壁纸 / 多图轮播 / 壁纸透明度 / 色调 / 颜色深浅 / 背景亮度
 *        / 玻璃模糊度 / 磨砂度
 *
 * 所有值进 useAppearance（Zustand persist → localStorage 仅存 UI 偏好），即时生效。
 */
"use client";

import { useRef, useState } from "react";
import { Check, Palette, Upload, X } from "lucide-react";

import {
  POSITION_GRID,
  WALLPAPER_POSITION_LABEL,
  useAppearance,
  type BgMode,
  type ThemeId,
  type WallpaperFit,
  type WallpaperPosition,
} from "@/lib/appearance-store";
import { compressImage, deleteWallpaper, saveWallpaper } from "@/lib/wallpaper-db";

const THEMES: { id: ThemeId; label: string; hint: string; swatch: string }[] = [
  { id: "default", label: "默认", hint: "深色 · 紫罗兰", swatch: "#8b5cf6" },
  { id: "warm", label: "暖色", hint: "深色 · 暖棕", swatch: "#e1b98f" },
  { id: "cool", label: "冷色", hint: "深色 · 冷蓝", swatch: "#8bc8ea" },
  { id: "light", label: "浅色", hint: "浅色 · 亮面", swatch: "#ffffff" },
];

const BG_MODES: { id: BgMode; label: string }[] = [
  { id: "solid", label: "纯色" },
  { id: "fluid", label: "流体" },
  { id: "wallpaper", label: "壁纸" },
];

const FITS: { id: WallpaperFit; label: string; hint: string }[] = [
  { id: "tile", label: "平铺", hint: "原尺寸重复排列" },
  { id: "cover", label: "铺满", hint: "裁剪边缘填满" },
  { id: "contain", label: "完整", hint: "完整显示留边" },
];

const INTERVALS: { id: number; label: string }[] = [
  { id: 0, label: "关闭" },
  { id: 30, label: "30秒" },
  { id: 60, label: "1分钟" },
  { id: 300, label: "5分钟" },
];

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string; disabled?: boolean; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          disabled={o.disabled}
          title={o.title}
          className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
            value === o.id
              ? "bg-primary/20 text-primary"
              : "text-ink-2 hover:bg-white/[0.06] hover:text-ink"
          }`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[20px] w-[36px] shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-white/[0.12]"
      }`}
    >
      <span
        className={`absolute top-[2px] size-4 rounded-full bg-white transition-all ${
          checked ? "left-[18px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

function Slider({
  label,
  min,
  max,
  unit,
  value,
  hint,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  unit: string;
  value: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] text-ink-2">{label}</span>
        <span className="text-[11.5px] font-medium tabular-nums text-ink">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] accent-[var(--brand)]"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <p className="text-[10px] leading-relaxed text-ink-3">{hint}</p> : null}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-3">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function AppearanceSection() {
  const app = useAppearance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function pickWallpapers(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const added: string[] = [];
      for (const f of Array.from(files).slice(0, 4)) {
        const blob = await compressImage(f);
        const id = `wp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await saveWallpaper(id, blob);
        added.push(id);
      }
      const list = [...app.wallpaperList, ...added];
      app.patch({
        wallpaperList: list,
        wallpaperPath: app.wallpaperPath ?? list[0],
        bgMode: "wallpaper",
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "图片处理失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeWallpaper(id: string) {
    await deleteWallpaper(id);
    const rest = app.wallpaperList.filter((p) => p !== id);
    app.patch({
      wallpaperList: rest,
      wallpaperPath: app.wallpaperPath === id ? (rest[0] ?? null) : app.wallpaperPath,
      bgMode: rest.length === 0 && app.bgMode === "wallpaper" ? "fluid" : app.bgMode,
    });
  }

  const shown = app.wallpaperList;

  return (
    <div className="flex flex-col gap-5">
      {/* ── 外观 ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
          <Palette className="size-3.5 text-primary" />
          <p className="text-[12px] font-semibold text-ink">外观</p>
          <span className="ml-auto text-[10.5px] text-ink-3">即时生效 · 保存在本机浏览器</span>
        </div>

        <Row label="主题" hint="四套预设配色，切换全部页面">
          <Seg
            ariaLabel="主题"
            value={app.theme}
            onChange={(v) => app.patch({ theme: v })}
            options={THEMES.map((t) => ({ id: t.id, label: t.label, title: t.hint }))}
          />
        </Row>

        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => app.patch({ theme: t.id })}
              aria-pressed={app.theme === t.id}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                app.theme === t.id
                  ? "border-primary/40 bg-primary/10 text-ink"
                  : "border-white/[0.08] bg-white/[0.02] text-ink-2 hover:border-white/20"
              }`}
            >
              <span
                className="size-3 rounded-full border border-white/20"
                style={{ backgroundColor: t.swatch }}
              />
              {t.label}
              {app.theme === t.id ? <Check className="size-3 text-primary" /> : null}
            </button>
          ))}
        </div>

        <Row label="玻璃效果" hint="开：卡片半透明毛玻璃；关：实色卡片">
          <Switch
            label="玻璃效果"
            checked={app.glass}
            onChange={(v) => app.patch({ glass: v })}
          />
        </Row>

        <Row label="减少动效" hint="关闭背景漂移、Ken Burns 与过渡动画">
          <Switch
            label="减少动效"
            checked={app.reduceMotion}
            onChange={(v) => app.patch({ reduceMotion: v })}
          />
        </Row>
      </div>

      {/* ── 背景 ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
          <Palette className="size-3.5 text-primary" />
          <p className="text-[12px] font-semibold text-ink">背景</p>
        </div>

        <Row label="背景模式" hint="流体为动态渐变，壁纸使用本地图片（存本机浏览器）">
          <Seg
            ariaLabel="背景模式"
            value={app.bgMode}
            onChange={(v) => app.patch({ bgMode: v })}
            options={BG_MODES.map((m) => ({ id: m.id, label: m.label }))}
          />
        </Row>

        {app.bgMode === "wallpaper" ? (
          <>
            <Row label="壁纸图片" hint="可多选（≤4 张），压缩后存浏览器本地">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-[11px] text-ink transition-colors hover:border-white/25"
              >
                <Upload className="size-3" />
                {uploading ? "处理中…" : "添加图片…"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void pickWallpapers(e.target.files)}
              />
            </Row>

            {shown.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {shown.map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] px-2.5 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-[11px] text-ink-2">{id}</span>
                    <button
                      type="button"
                      onClick={() => app.patch({ wallpaperPath: id, bgMode: "wallpaper" })}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        app.wallpaperPath === id
                          ? "bg-primary/20 text-primary"
                          : "text-ink-3 hover:text-ink"
                      }`}
                    >
                      {app.wallpaperPath === id ? "使用中" : "使用"}
                    </button>
                    <button
                      type="button"
                      aria-label={`移除 ${id}`}
                      onClick={() => void removeWallpaper(id)}
                      className="text-ink-3 transition-colors hover:text-danger"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10.5px] text-ink-3">还没有壁纸，点「添加图片…」选择本地图片</p>
            )}

            <Row label="显示方式" hint="平铺按原尺寸重复，铺满裁剪填满，完整缩放显示">
              <Seg
                ariaLabel="壁纸显示方式"
                value={app.wallpaperFit}
                onChange={(v) => app.patch({ wallpaperFit: v })}
                options={FITS.map((f) => ({ id: f.id, label: f.label, title: f.hint }))}
              />
            </Row>

            <Row label="位置" hint="平铺时忽略，铺满 / 完整时决定图片对齐">
              <div
                className={`grid grid-cols-3 gap-1 ${app.wallpaperFit === "tile" ? "opacity-35" : ""}`}
                role="group"
                aria-label="壁纸位置"
              >
                {POSITION_GRID.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    disabled={app.wallpaperFit === "tile"}
                    aria-label={WALLPAPER_POSITION_LABEL[pos]}
                    title={WALLPAPER_POSITION_LABEL[pos]}
                    className={`size-5 rounded border transition-colors disabled:cursor-not-allowed ${
                      app.wallpaperPosition === pos
                        ? "border-primary bg-primary/30"
                        : "border-white/[0.12] hover:border-white/30"
                    }`}
                    onClick={() => app.patch({ wallpaperPosition: pos as WallpaperPosition })}
                  />
                ))}
              </div>
            </Row>

            <Row label="动画壁纸" hint="Ken Burns 缓慢推拉，减少动效开启时自动关闭">
              <Switch
                label="动画壁纸"
                checked={app.wallpaperAnim === "kenburns"}
                onChange={(v) => app.patch({ wallpaperAnim: v ? "kenburns" : "none" })}
              />
            </Row>

            <Row
              label="多图轮播"
              hint={shown.length >= 2 ? `按间隔自动切换，当前 ${shown.length} 张` : "需至少 2 张壁纸才生效"}
            >
              <Seg
                ariaLabel="轮播间隔"
                value={app.wallpaperInterval}
                onChange={(v) => app.patch({ wallpaperInterval: v })}
                options={INTERVALS.map((it) => ({
                  id: it.id,
                  label: it.label,
                  disabled: shown.length < 2 && it.id !== 0,
                }))}
              />
            </Row>

            <Slider
              label="壁纸透明度"
              min={30}
              max={100}
              unit="%"
              value={app.wallpaperOpacity}
              hint="调低让壁纸若隐若现，露出底色"
              onChange={(v) => app.patch({ wallpaperOpacity: v })}
            />
          </>
        ) : null}

        {app.bgMode === "fluid" ? (
          <>
            <Slider
              label="色调"
              min={0}
              max={360}
              unit="°"
              value={app.bgHue}
              onChange={(v) => app.patch({ bgHue: v })}
            />
            <Slider
              label="颜色深浅"
              min={0}
              max={100}
              unit="%"
              value={app.bgSaturation}
              onChange={(v) => app.patch({ bgSaturation: v })}
            />
          </>
        ) : null}

        <Slider
          label="背景亮度"
          min={0}
          max={100}
          unit="%"
          value={app.bgBrightness}
          hint="50 原样 · 100 提亮至纯白"
          onChange={(v) => app.patch({ bgBrightness: v })}
        />

        {app.glass ? (
          <>
            <Slider
              label="玻璃模糊度"
              min={4}
              max={60}
              unit="px"
              value={app.glassBlur}
              hint="卡片毛玻璃的模糊半径"
              onChange={(v) => app.patch({ glassBlur: v })}
            />
            <Slider
              label="磨砂度"
              min={0}
              max={100}
              unit="%"
              value={app.glassFrost}
              hint="背景的雾面磨砂，壁纸 / 流体模式下生效"
              onChange={(v) => app.patch({ glassFrost: v })}
            />
          </>
        ) : null}

        {uploadError ? <p className="text-[10.5px] text-danger">{uploadError}</p> : null}
      </div>
    </div>
  );
}
