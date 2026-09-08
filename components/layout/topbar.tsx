"use client";

import { usePathname } from "next/navigation";
import {
  Bell,
  BellOff,
  Building2,
  ChevronsUpDown,
  LogOut,
  Menu,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

type TopBarProps = {
  onMenuClick: () => void;
  onCommandOpen: () => void;
};

export function TopBar({ onMenuClick, onCommandOpen }: TopBarProps) {
  const pathname = usePathname();
  const current = allNavItems.find((item) => isNavItemActive(item, pathname));

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
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
        <WorkspaceSwitcher />
        <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden="true" />
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
          {current?.title ?? "AI Workspace"}
        </h1>
      </div>

      {/* 右侧：命令面板 + 通知 + 账户 */}
      <div className="flex shrink-0 items-center gap-1">
        <CommandTrigger onOpen={onCommandOpen} />
        <NotificationMenu />
        <AccountMenu />
      </div>
    </header>
  );
}

function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-white/5 hover:text-ink"
          aria-label="切换工作区"
        >
          <Building2 className="h-3.5 w-3.5 text-ink-3" />
          <span className="hidden md:inline">Acme AI</span>
          <ChevronsUpDown className="h-3 w-3 text-ink-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>工作区</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => toast("已切换至 Acme AI（演示）")}>
          <Building2 className="h-4 w-4" />
          <span>Acme AI</span>
          <span className="ml-auto text-[11px] text-ink-3">当前</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast("已切换至个人空间（演示）")}>
          <UserRound className="h-4 w-4" />
          <span>个人空间</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="shrink-0 rounded-full transition-opacity hover:opacity-80"
          aria-label="账户菜单"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-gradient-to-br from-violet-500/70 to-indigo-600/70 text-[11px] font-medium text-white">
              林
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-[13px] font-medium text-ink">林晓</div>
          <div className="text-[12px] text-ink-3">linxiao@acme.ai</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast("演示环境：个人资料页将在后续阶段开放")}>
          <UserRound className="h-4 w-4" />
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast("演示环境：偏好设置页将在后续阶段开放")}>
          <Settings2 className="h-4 w-4" />
          偏好设置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => toast("演示环境，暂不支持退出登录")}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
