/**
 * 外观设置（S1.24，仿 GlassTodo 外观/背景体系）。
 *
 * 约定：只存 UI 偏好到 localStorage（key: aiw-appearance）；
 * 壁纸图片二进制存 IndexedDB（lib/wallpaper-db.ts），localStorage 只保存 id 列表与当前选中。
 * 应用方式：AppearanceLayer 组件把 store 值写到 <html> data-* 与 CSS 变量，全局即时生效。
 */
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId = "default" | "warm" | "cool" | "light";
export type BgMode = "solid" | "fluid" | "wallpaper";
export type WallpaperFit = "cover" | "contain" | "tile";
export type WallpaperPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";
export type WallpaperAnim = "kenburns" | "none";

export const WALLPAPER_POSITION_LABEL: Record<WallpaperPosition, string> = {
  "top-left": "左上", "top-center": "上中", "top-right": "右上",
  "center-left": "左中", center: "居中", "center-right": "右中",
  "bottom-left": "左下", "bottom-center": "下中", "bottom-right": "右下",
};

export const POSITION_GRID: WallpaperPosition[] = [
  "top-left", "top-center", "top-right",
  "center-left", "center", "center-right",
  "bottom-left", "bottom-center", "bottom-right",
];

export interface AppearanceState {
  theme: ThemeId;
  bgMode: BgMode;
  /** 卡片毛玻璃（backdrop-blur），关闭则实色卡片 */
  glass: boolean;
  /** 减少动效：关闭背景漂移 / Ken Burns / 过渡动画 */
  reduceMotion: boolean;
  /** 壁纸 id 列表（IndexedDB key） */
  wallpaperList: string[];
  /** 当前选中壁纸 id */
  wallpaperPath: string | null;
  wallpaperFit: WallpaperFit;
  wallpaperPosition: WallpaperPosition;
  wallpaperAnim: WallpaperAnim;
  /** 轮播间隔秒，0 = 关闭 */
  wallpaperInterval: number;
  wallpaperOpacity: number; // 30-100
  bgHue: number; // 0-360
  bgSaturation: number; // 0-100
  bgBrightness: number; // 0-100（50 = 原样）
  glassBlur: number; // 4-60 px
  glassFrost: number; // 0-100（雾化）
}

export const DEFAULT_APPEARANCE: AppearanceState = {
  theme: "default",
  bgMode: "solid",
  glass: true,
  reduceMotion: false,
  wallpaperList: [],
  wallpaperPath: null,
  wallpaperFit: "cover",
  wallpaperPosition: "center",
  wallpaperAnim: "kenburns",
  wallpaperInterval: 0,
  wallpaperOpacity: 100,
  bgHue: 316,
  bgSaturation: 42,
  bgBrightness: 50,
  glassBlur: 16,
  glassFrost: 20,
};

interface AppearanceActions {
  patch: (p: Partial<AppearanceState>) => void;
  reset: () => void;
}

export const useAppearance = create<AppearanceState & AppearanceActions>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      patch: (p) => set(p),
      reset: () => set({ ...DEFAULT_APPEARANCE }),
    }),
    { name: "aiw-appearance" }
  )
);
