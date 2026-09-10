"use client";

/**
 * Dashboard — AI Workspace 展示首页（真实本机 AI 资源）
 *
 * 展示：真实资源统计 → 资源类型分类 → Hermes 配置与人设 → 精选技能画廊。
 * 全部数据来自本机只读扫描结果（SQLite），零演示数据。
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

import { HeroStats } from "@/components/dashboard/showcase/hero-stats";
import { HermesSpotlight } from "@/components/dashboard/showcase/hermes-spotlight";
import { SkillGallery } from "@/components/dashboard/showcase/skill-gallery";
import { TypeCards } from "@/components/dashboard/showcase/type-cards";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDiscoveredResources, fetchDiscoveryOverview, runResourceScan } from "@/lib/services/resource-discovery";
import type { DiscoveredResource, ResourceType } from "@/lib/types";

const TYPE_CARD_DEFS: { type: ResourceType; label: string; description: string }[] = [
  { type: "skill", label: "技能 Skills", description: "可直接调用的能力指令包，来自各 Harness 的 SKILL.md" },
  { type: "prompt", label: "人设 / Prompt", description: "Hermes Profile 的灵魂设定（SOUL.md）与提示词资源" },
  { type: "rule", label: "规则 Rules", description: "配置与约束：模型、Provider、项目规则文件" },
  { type: "plugin", label: "插件 Plugins", description: "可扩展能力包，如 Hermes superpowers" },
];

export default function DashboardPage() {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchDiscoveryOverview>> | null>(null);
  const [profiles, setProfiles] = useState<DiscoveredResource[]>([]);
  const [configs, setConfigs] = useState<DiscoveredResource[]>([]);
  const [skills, setSkills] = useState<DiscoveredResource[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ov, pr, cf, sk] = await Promise.all([
        fetchDiscoveryOverview(),
        fetchDiscoveredResources({ type: "prompt", pageSize: 10 }),
        fetchDiscoveredResources({ type: "rule", harness: "hermes", pageSize: 10 }),
        fetchDiscoveredResources({ harness: "hermes", type: "skill", parseable: true, pageSize: 8 }),
      ]);
      if (cancelled) return;
      setOverview(ov);
      setProfiles(pr.items);
      setConfigs(cf.items);
      setSkills(sk.items);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onScan = async () => {
    setScanning(true);
    try {
      await runResourceScan();
      const [ov, pr, cf, sk] = await Promise.all([
        fetchDiscoveryOverview(),
        fetchDiscoveredResources({ type: "prompt", pageSize: 10 }),
        fetchDiscoveredResources({ type: "rule", harness: "hermes", pageSize: 10 }),
        fetchDiscoveredResources({ harness: "hermes", type: "skill", parseable: true, pageSize: 8 }),
      ]);
      setOverview(ov);
      setProfiles(pr.items);
      setConfigs(cf.items);
      setSkills(sk.items);
    } finally {
      setScanning(false);
    }
  };

  const byType = useMemo(() => {
    const m: Partial<Record<ResourceType, number>> = {};
    if (overview?.scanRun?.byType) {
      for (const [k, v] of Object.entries(overview.scanRun.byType)) {
        m[k as ResourceType] = v as number;
      }
    }
    return m;
  }, [overview]);

  const cards = TYPE_CARD_DEFS.map((d) => ({
    type: d.type,
    label: d.label,
    count: byType[d.type] ?? 0,
    description: d.description,
  }));

  const config = configs.find((c) => c.type === "rule") ?? configs[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI Workspace"
        description="你的本机 AI 资源工作台 —— 真实发现 · 能力索引 · 一处呈现"
        actions={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={onScan} disabled={scanning}>
            <RefreshCw className={`size-3.5 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "扫描中…" : "重新扫描"}
          </Button>
        }
      />

      {overview === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl bg-white/[0.04]" />
          <Skeleton className="h-28 w-full rounded-xl bg-white/[0.04]" />
          <Skeleton className="h-40 w-full rounded-xl bg-white/[0.04]" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-5"
        >
          <HeroStats
            data={{
              totalResources: overview.totalResources,
              parseableCount: overview.parseableCount,
              harnessCount: Object.keys(overview.scanRun?.byHarness ?? {}).length,
              hermesCount: overview.scanRun?.byHarness?.hermes ?? 0,
              lastScannedAt: overview.lastScannedAt,
            }}
          />

          <TypeCards cards={cards} />

          <HermesSpotlight config={config} profiles={profiles} />

          <SkillGallery skills={skills} />
        </motion.div>
      )}
    </div>
  );
}
