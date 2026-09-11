import fs from "node:fs";
import path from "node:path";

import { Settings } from "lucide-react";

import { EnvInfo } from "@/components/settings/env-info";
import { HarnessDirectories } from "@/components/settings/harness-directories";
import { HiddenResources } from "@/components/settings/hidden-resources";
import { ResourceStats } from "@/components/settings/resource-stats";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USE_MOCK } from "@/lib/services/mode";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const dbPath =
    process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "ai-workspace.db");
  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(dbPath).size;
  } catch {
    dbSizeBytes = 0;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="本机环境与资源扫描信息（全部来自真实数据，无演示内容）"
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-ink">本机环境</h2>
        <EnvInfo mode={USE_MOCK ? "mock" : "real"} dbPath={dbPath} dbSizeBytes={dbSizeBytes} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-ink">已发现的 Harness 目录</h2>
        <HarnessDirectories />
      </section>

      <Card className="border-white/10 bg-transparent">
        <CardHeader className="px-4 pt-4">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Settings className="size-3.5 text-primary" /> 资源统计与扫描策略
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ResourceStats />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-ink">已隐藏资源</h2>
        <HiddenResources />
      </section>
    </div>
  );
}
