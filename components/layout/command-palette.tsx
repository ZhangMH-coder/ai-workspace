"use client";

import { useRouter } from "next/navigation";
import { Building2, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { allNavItems } from "@/lib/navigation";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="命令面板"
      description="搜索并跳转到页面"
    >
      <Command className="border-border/60">
        <CommandInput placeholder="搜索页面、功能…" />
        <CommandList>
          <CommandEmpty>未找到相关结果</CommandEmpty>
          <CommandGroup heading="导航">
            {allNavItems.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.description ?? ""} ${item.href}`}
                onSelect={() => {
                  router.push(item.href);
                  onOpenChange(false);
                }}
              >
                <item.icon className="text-ink-3" />
                <span>{item.title}</span>
                {item.description ? (
                  <span className="ml-auto text-xs text-ink-3">{item.description}</span>
                ) : null}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="工作区">
            <CommandItem value="Acme AI 工作区" onSelect={() => toast("已切换至 Acme AI（演示）")}>
              <Building2 className="text-ink-3" />
              <span>Acme AI</span>
              <span className="ml-auto text-xs text-ink-3">当前</span>
            </CommandItem>
            <CommandItem value="个人空间 工作区" onSelect={() => toast("已切换至个人空间（演示）")}>
              <UserRound className="text-ink-3" />
              <span>个人空间</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-ink-3">
          <span>↑↓ 浏览 · Enter 打开 · Esc 关闭</span>
          <span className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <span className="ml-1">打开面板</span>
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
