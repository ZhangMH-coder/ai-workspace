import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

/** 模块建设中占位：Phase 1 仅提供产品外壳，模块内容将在后续阶段实现 */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-surface-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
        <Icon className="h-5 w-5 text-ink-3" />
      </div>
      <h2 className="mt-4 text-[15px] font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-sm text-center text-[13px] leading-relaxed text-ink-3">
        {description}
      </p>
    </Card>
  );
}
