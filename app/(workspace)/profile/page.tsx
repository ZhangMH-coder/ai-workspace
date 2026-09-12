import { Database, HardDrive, ScanLine, Settings2, Sparkles, UserRound } from "lucide-react";

import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/db/service";

export const dynamic = "force-dynamic";

const LLM_SOURCE_LABEL: Record<string, string> = {
  manual: "Settings 手动配置",
  env: "环境变量",
  hermes: "Hermes 自动发现",
  default: "内置默认（未配置）",
};

function formatBytes(n: number): string {
  if (n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function ProfilePage() {
  const { user, machine } = getProfile();

  const machineItems = [
    {
      icon: UserRound,
      label: "系统用户",
      value: machine.username,
    },
    {
      icon: HardDrive,
      label: "主机名",
      value: machine.hostname,
    },
    {
      icon: Sparkles,
      label: "平台 / 架构",
      value: `${machine.platform} · ${machine.osRelease}`,
    },
    {
      icon: Database,
      label: "本地数据库",
      value: `${machine.dbPath}（${formatBytes(machine.dbSizeBytes)}）`,
    },
    {
      icon: Settings2,
      label: "当前 LLM",
      value: machine.llmConfigured
        ? `${machine.llmModel} · ${LLM_SOURCE_LABEL[machine.llmSource] ?? machine.llmSource}`
        : "未配置（可在 Settings → AI Provider 设置）",
    },
    {
      icon: ScanLine,
      label: "资源发现",
      value: `${machine.resourcesTotal} 个资源 · ${machine.harnessScansTotal} 次扫描`,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="个人资料"
        description="你的展示信息与本机环境事实（全部来自真实数据）"
      />

      <ProfileForm initial={user} fallbackName={machine.username} />

      <Card className="border-white/10 bg-transparent">
        <CardHeader className="px-4 pt-4">
          <CardTitle className="text-[13px] font-semibold text-ink">
            本机环境事实（只读）
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-px px-4 pb-4 sm:grid-cols-2">
          {machineItems.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 items-start gap-2.5 rounded-lg px-2 py-2.5"
            >
              <item.icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-ink-3">
                  {item.label}
                </div>
                <div className="truncate text-[13px] text-ink" title={item.value}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
