"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sparkles,
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
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  footerNav,
  isNavItemActive,
  navGroups,
  type NavItem,
} from "@/lib/navigation";
import { getProfile } from "@/lib/services/profile";
import type { ProfileDTO } from "@/lib/services/profile";

type SidebarProps = {
  collapsed: boolean;
  onCollapseToggle: () => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

export function Sidebar({
  collapsed,
  onCollapseToggle,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  return (
    <>
      {/* 桌面端：固定侧边栏，支持折叠 */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-background/70 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <SidebarContent collapsed={collapsed} onCollapseToggle={onCollapseToggle} />
      </aside>

      {/* 移动端：抽屉导航 */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[280px] gap-0 border-r bg-background/80 p-0 backdrop-blur-2xl sm:max-w-[280px]"
        >
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarContent({
  collapsed,
  onCollapseToggle,
}: {
  collapsed: boolean;
  onCollapseToggle?: () => void;
}) {
  const pathname = usePathname();
  const isCollapsed = collapsed && Boolean(onCollapseToggle);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logo 区 */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          isCollapsed ? "justify-center" : "px-4",
        )}
      >
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="AI Workspace 首页"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_16px_rgba(139,92,246,0.35)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
              AI Workspace
            </span>
          )}
        </Link>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-6">
          {navGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              {!isCollapsed && (
                <div className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={isCollapsed}
                  active={isNavItemActive(item, pathname)}
                />
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* 底部：Settings + 用户 + 折叠开关 */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex flex-col gap-1">
          <NavLink
            item={footerNav}
            collapsed={isCollapsed}
            active={isNavItemActive(footerNav, pathname)}
          />
        </div>
        <Separator className="my-3 bg-white/[0.06]" />
        <div className="flex items-center justify-between gap-1">
          <UserMenu collapsed={isCollapsed} />
          {onCollapseToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-ink-3 hover:bg-white/5 hover:text-ink"
                  onClick={onCollapseToggle}
                  aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "展开侧边栏" : "收起侧边栏"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center rounded-lg text-[13.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        collapsed ? "justify-center" : "gap-3 px-2.5",
        active
          ? "bg-brand-soft text-white"
          : "text-ink-2 hover:bg-white/[0.05] hover:text-ink",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors duration-150",
          active ? "text-brand" : "text-ink-3 group-hover:text-ink-2",
        )}
      />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="ml-3">
        {item.title}
      </TooltipContent>
    </Tooltip>
  );
}

const AVATAR_GRADIENTS: Record<string, string> = {
  violet: "from-violet-500/70 to-indigo-600/70",
  indigo: "from-indigo-500/70 to-blue-600/70",
  emerald: "from-emerald-500/70 to-teal-600/70",
  sky: "from-sky-500/70 to-cyan-600/70",
  amber: "from-amber-500/70 to-orange-600/70",
  rose: "from-rose-500/70 to-pink-600/70",
};

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        // 拉取失败保持空态：头像回退「我」，不显示任何假身份
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.user.displayName?.trim() || profile?.machine.username || "我";
  const fallbackChar = displayName.charAt(0).toUpperCase();
  const gradient =
    AVATAR_GRADIENTS[profile?.user.avatarColor ?? ""] ?? AVATAR_GRADIENTS.violet;
  const subtitle = profile?.user.title?.trim() || "本机用户";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-10 items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-white/5",
            collapsed ? "w-10 justify-center px-0" : "min-w-0 flex-1 px-2",
          )}
          aria-label="账户菜单"
        >
          <Avatar className="size-7 shrink-0">
            {profile?.user.avatarUrl ? (
              <AvatarImage src={profile.user.avatarUrl} alt="头像" />
            ) : (
              <AvatarFallback
                className={cn(
                  "bg-gradient-to-br text-[11px] font-medium text-white",
                  gradient,
                )}
              >
                {fallbackChar}
              </AvatarFallback>
            )}
          </Avatar>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium leading-tight text-ink">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] leading-tight text-ink-3">
                  {subtitle}
                </span>
              </span>
              <Settings2 className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align={collapsed ? "start" : "end"}
        className="w-56"
      >
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
