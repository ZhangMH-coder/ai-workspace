"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  BellOff,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { allNavItems, isNavItemActive } from "@/lib/navigation";
import { getProfile } from "@/lib/services/profile";
import type { ProfileDTO } from "@/lib/services/profile";
import { runResourceScan } from "@/lib/services/resource-discovery";

type TopBarProps = {
  onMenuClick: () => void;
  onCommandOpen: () => void;
};

export function TopBar({ onMenuClick, onCommandOpen }: TopBarProps) {
  const pathname = usePathname();
  const current = allNavItems.find((item) => isNavItemActive(item, pathname));

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      {/* 左侧：移动端菜单 + 工作区 + 当前页面 */}
      <div className="flex min-w-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-ink-3 hover:text-ink lg:hidden"
          onClick={onMenuClick}
          aria-label="打开导航"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
          {current?.title ?? "AI Workspace"}
        </h1>
      </div>

      {/* 右侧：重新扫描 + 命令面板 + 通知 + 账户 */}
      <div className="flex shrink-0 items-center gap-1">
        <RescanButton />
        <CommandTrigger onOpen={onCommandOpen} />
        <NotificationMenu />
        <AccountMenu />
      </div>
    </header>
  );
}

function RescanButton() {
  const [scanning, setScanning] = useState(false);

  const onScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await runResourceScan();
      toast.success("重新扫描完成，数据已更新");
      window.dispatchEvent(new Event("aiw:rescan"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "重新扫描失败");
    } finally {
      setScanning(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="shrink-0 text-ink-3 hover:text-ink"
      onClick={onScan}
      disabled={scanning}
      aria-label="重新扫描本机资源"
      title="重新扫描本机资源"
    >
      <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
    </Button>
  );
}

function CommandTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <>
      <button
        onClick={onOpen}
        className="hidden h-9 w-52 items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 text-[13px] text-ink-3 transition-colors hover:border-white/15 hover:text-ink-2 md:flex"
        aria-label="打开命令面板（⌘K）"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">搜索…</span>
        <Kbd className="rounded-[5px] border border-white/10 bg-white/5 px-1.5 text-[10px] text-ink-3">
          ⌘K
        </Kbd>
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-ink-3 hover:text-ink md:hidden"
        onClick={onOpen}
        aria-label="搜索"
      >
        <Search className="h-4 w-4" />
      </Button>
    </>
  );
}

function NotificationMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative shrink-0 text-ink-3 hover:text-ink"
          aria-label="通知"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
          <BellOff className="h-6 w-6 text-ink-3" />
          <p className="text-[13px] font-medium text-ink-2">暂无新通知</p>
          <p className="text-[12px] text-ink-3">新的运行与系统消息会显示在这里</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        // 拉取失败保持空态，不显示假身份
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.user.displayName?.trim() || profile?.machine.username || "我";
  const fallbackChar = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="shrink-0 rounded-full transition-opacity hover:opacity-80"
          aria-label="账户菜单"
        >
          <Avatar className="size-7">
            {profile?.user.avatarUrl ? (
              <AvatarImage src={profile.user.avatarUrl} alt="头像" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-violet-500/70 to-indigo-600/70 text-[11px] font-medium text-white">
                {fallbackChar}
              </AvatarFallback>
            )}
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-[13px] font-medium text-ink">{displayName}</div>
          <div className="text-[12px] text-ink-3">
            {profile?.machine.hostname ?? "本机"} · {profile?.machine.username ?? ""}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound className="h-4 w-4" />
            个人资料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings2 className="h-4 w-4" />
            偏好设置
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => toast("本地单用户模式，无需退出登录")}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
