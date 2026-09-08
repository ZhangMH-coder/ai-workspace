import {
  BookOpenText,
  BrainCircuit,
  Puzzle,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import type { CapabilityType } from "@/lib/types";

/** 能力类型 → 图标映射（唯一来源：Agent 详情装配列表 / 装配面板 / Capability Hub 共用） */
export const CAPABILITY_TYPE_ICONS: Record<CapabilityType, LucideIcon> = {
  skill: Puzzle,
  memory: BrainCircuit,
  rule: ScrollText,
  tool: BookOpenText,
};
