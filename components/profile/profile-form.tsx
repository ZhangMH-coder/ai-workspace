"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  clearProfileAvatar,
  saveProfile,
  uploadProfileAvatar,
} from "@/lib/services/profile";
import type { ProfileUserDTO } from "@/lib/services/profile";
import { cn } from "@/lib/utils";

const COLOR_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500/70 to-indigo-600/70",
  indigo: "from-indigo-500/70 to-blue-600/70",
  emerald: "from-emerald-500/70 to-teal-600/70",
  sky: "from-sky-500/70 to-cyan-600/70",
  amber: "from-amber-500/70 to-orange-600/70",
  rose: "from-rose-500/70 to-pink-600/70",
};

const COLOR_SWATCH: Record<string, string> = {
  violet: "bg-violet-500",
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const NAME_MAX = 40;
const TITLE_MAX = 80;
const BIO_MAX = 300;

type ProfileFormProps = {
  initial: ProfileUserDTO;
  /** 昵称为空时头像/名称回退显示的本机用户名 */
  fallbackName: string;
};

export function ProfileForm({ initial, fallbackName }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor ?? "violet");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  /** 待确认的本地头像（选择文件后先预览，确认后才上传） */
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedName = displayName.trim() || fallbackName;
  const fallbackChar = resolvedName.trim().charAt(0).toUpperCase() || "我";
  const gradient = COLOR_GRADIENTS[avatarColor] ?? COLOR_GRADIENTS.violet;
  const dirty =
    (displayName.trim() || null) !== (initial.displayName ?? null) ||
    (title.trim() || null) !== (initial.title ?? null) ||
    (bio.trim() || null) !== (initial.bio ?? null) ||
    avatarColor !== (initial.avatarColor ?? "violet");

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await saveProfile({
        displayName: displayName.trim() || null,
        title: title.trim() || null,
        bio: bio.trim() || null,
        avatarColor,
      });
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("个人资料已保存，顶栏已同步");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  /** 选择本地图片 → 前端校验 → 本地预览（不立即上传，等用户确认） */
  function handleFileChange(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("仅支持 PNG / JPEG / WebP 图片");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("头像不能超过 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingAvatar(String(reader.result));
      setAvatarBusy(false);
    };
    reader.onerror = () => toast.error("读取文件失败，请重试");
    setAvatarBusy(true);
    reader.readAsDataURL(file);
  }

  /** 确认使用预览头像 → 上传 → 回显 */
  async function handleConfirmAvatar() {
    if (!pendingAvatar || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const res = await uploadProfileAvatar(pendingAvatar);
      setAvatarUrl(res.avatarUrl);
      setPendingAvatar(null);
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("头像已更新，顶栏已同步");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "头像上传失败，请稍后重试");
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleCancelPending() {
    setPendingAvatar(null);
    setAvatarBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemoveAvatar() {
    if (avatarBusy) return;
    setAvatarBusy(true);
    try {
      await clearProfileAvatar();
      setAvatarUrl("");
      window.dispatchEvent(new CustomEvent("profile-updated"));
      toast.success("头像已移除，顶栏已同步");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "移除头像失败，请稍后重试");
    } finally {
      setAvatarBusy(false);
    }
  }

  /** 当前头像展示（优先待确认预览 → 已上传 → 配色渐变字母） */
  function renderAvatar(sizeClass = "size-14", textClass = "text-[18px]") {
    if (pendingAvatar) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pendingAvatar}
          alt="头像预览"
          className={cn("rounded-full object-cover", sizeClass)}
        />
      );
    }
    if (avatarUrl) {
      return <AvatarImage src={avatarUrl} alt="个人头像" />;
    }
    return (
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br font-semibold text-white",
          textClass,
          gradient,
        )}
      >
        {fallbackChar}
      </AvatarFallback>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      {/* 编辑表单 */}
      <Card className="border-white/10 bg-transparent">
        <CardHeader className="px-4 pt-4">
          <CardTitle className="text-[13px] font-semibold text-ink">个人信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 px-4 pb-4">
          {/* 头像 + 上传 + 配色 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className={pendingAvatar ? "size-14" : "size-14"}>{renderAvatar()}</Avatar>
              {!pendingAvatar && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                  aria-label="上传头像"
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity hover:opacity-100 disabled:opacity-0"
                >
                  {avatarBusy ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-5" />
                  )}
                </button>
              )}
            </div>

            <div className="grid gap-2">
              {pendingAvatar ? (
                <>
                  <span className="text-[12px] text-ink-2">新头像预览（确认后上传）</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => void handleConfirmAvatar()}
                      disabled={avatarBusy}
                      className="h-7 gap-1.5 text-[12px]"
                    >
                      {avatarBusy ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      使用此头像
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelPending}
                      disabled={avatarBusy}
                      className="h-7 gap-1.5 text-[12px] text-ink-2 hover:text-ink"
                    >
                      <X className="size-3" /> 取消
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[12px] text-ink-3">
                    {avatarBusy ? "上传中…" : "点击头像上传本地图片（PNG/JPEG/WebP，≤2MB）"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarBusy}
                      className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[12px] text-ink-2 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-40"
                    >
                      <ImagePlus className="size-3" />
                      上传头像
                    </button>
                    {avatarUrl ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveAvatar()}
                        disabled={avatarBusy}
                        className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[12px] text-ink-2 transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-40"
                      >
                        <Trash2 className="size-3" />
                        移除
                      </button>
                    ) : null}
                  </div>
                  <span className="text-[12px] text-ink-3">或选择头像配色（无上传头像时显示）</span>
                  <div className="flex items-center gap-1.5">
                    {Object.keys(COLOR_SWATCH).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAvatarColor(key)}
                        aria-label={`头像配色 ${key}`}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110",
                          COLOR_SWATCH[key],
                          avatarColor === key &&
                            "ring-2 ring-white/70 ring-offset-2 ring-offset-background",
                        )}
                      >
                        {avatarColor === key && <Check className="size-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-name" className="text-[13px] text-ink-2">
                昵称
              </Label>
              <span className="font-mono text-[11px] text-ink-3">
                {displayName.length}/{NAME_MAX}
              </span>
            </div>
            <Input
              id="profile-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={fallbackName}
              maxLength={NAME_MAX}
              className="bg-white/[0.03]"
            />
            <p className="text-[12px] text-ink-3">留空时使用本机用户名（{fallbackName}）</p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-title" className="text-[13px] text-ink-2">
                职位 / 角色
              </Label>
              <span className="font-mono text-[11px] text-ink-3">
                {title.length}/{TITLE_MAX}
              </span>
            </div>
            <Input
              id="profile-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：独立开发者 · AI 工具爱好者"
              maxLength={TITLE_MAX}
              className="bg-white/[0.03]"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-bio" className="text-[13px] text-ink-2">
                个人简介
              </Label>
              <span className="font-mono text-[11px] text-ink-3">
                {bio.length}/{BIO_MAX}
              </span>
            </div>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="简单介绍一下自己 / 这个工作台的使用场景"
              maxLength={BIO_MAX}
              className="min-h-[88px] resize-y bg-white/[0.03]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {saving ? "保存中…" : dirty ? "保存资料" : "已保存"}
            </Button>
            {!dirty && <span className="text-[12px] text-ink-3">暂无未保存的修改</span>}
          </div>
        </CardContent>
      </Card>

      {/* 实时预览（模拟顶栏展示效果） */}
      <Card className="h-fit border-white/10 bg-transparent">
        <CardHeader className="px-4 pt-4">
          <CardTitle className="text-[13px] font-semibold text-ink">展示效果预览</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-[11px] text-ink-3">以下为顶栏 / 侧栏将显示的实时效果（保存后生效）</p>
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <Avatar className="size-8">{renderAvatar("size-8", "text-[13px]")}</Avatar>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-ink">{resolvedName}</div>
              <div className="truncate text-[11px] text-ink-3">
                {title.trim() || "未设置职位"}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p className="text-[12px] font-medium text-ink">{resolvedName}</p>
            {title.trim() && <p className="text-[11px] text-ink-3">{title.trim()}</p>}
            <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink-2">
              {bio.trim() || "（暂无简介）"}
            </p>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
      />
    </div>
  );
}
