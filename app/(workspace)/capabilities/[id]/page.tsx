"use client";

/**
 * Capability 资产详情（Phase 3 第三阶段，方案 A）
 *
 * 展示单个 CapabilityDefinition 资产：基本信息、状态、被哪些 Agent 使用（Used by）。
 * - 数据来自单一 Store（definitions + agentCapabilities + agents），与 Hub / Agent 详情同源
 * - Used by 列出每个装配该资产的 Agent 及其装配状态（启用/停用）与装配时间
 * - Definition 只读
 */
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Blocks, Bot } from "lucide-react";
import { useEffect, useMemo } from "react";

import { AgentStatusBadge } from "@/components/agents/status-badge";
import { CapabilityTypeBadge } from "@/components/capabilities/capability-type-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CAPABILITY_TYPE_ICONS } from "@/lib/capability-meta";
import { formatDateTime } from "@/lib/format";
import { CAPABILITY_TYPE_OPTIONS } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace";

export default function CapabilityDetailPage() {
  const params = useParams<{ id: string }>();
  const capabilityId = params.id;

  const hydrated = useWorkspaceStore((s) => s.hydrated);
  const hydrate = useWorkspaceStore((s) => s.hydrate);
  const definitions = useWorkspaceStore((s) => s.capabilityDefinitions);
  const agentCapabilities = useWorkspaceStore((s) => s.agentCapabilities);
  const agents = useWorkspaceStore((s) => s.agents);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const usedBy = useMemo(() => {
    const assemblies = agentCapabilities.filter(
      (ac) => ac.capabilityId === capabilityId
    );
    return assemblies
      .map((assembly) => ({
        assembly,
        agent: agents.find((a) => a.id === assembly.agentId),
      }))
      .filter((x): x is { assembly: (typeof assemblies)[number]; agent: NonNullable<(typeof agents)[number]> } => Boolean(x.agent))
      .sort((a, b) =>
        a.assembly.enabled === b.assembly.enabled
          ? a.agent.name.localeCompare(b.agent.name, "zh")
          : a.assembly.enabled
            ? -1
            : 1
      );
  }, [agentCapabilities, agents, capabilityId]);

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    );
  }

  const definition = definitions.find((d) => d.id === capabilityId);

  if (!definition) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
        <Blocks className="h-6 w-6 text-ink-3" />
        <p className="text-[14px] font-medium text-ink-2">未找到该能力资产</p>
        <p className="text-[13px] text-ink-3">它可能已归档，或链接有误</p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/capabilities">
            <ArrowLeft />
            返回资产库
          </Link>
        </Button>
      </div>
    );
  }

  const typeMeta = CAPABILITY_TYPE_OPTIONS.find((t) => t.id === definition.type);
  const TypeIcon = CAPABILITY_TYPE_ICONS[definition.type];
  const enabledCount = usedBy.filter((u) => u.assembly.enabled).length;
  const inUse = usedBy.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={definition.name}
        description={definition.description}
        actions={
          <Button variant="ghost" asChild>
            <Link href="/capabilities">
              <ArrowLeft />
              返回资产库
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {/* 主区：基本信息 + Used by */}
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Card className="rounded-xl bg-surface-1 p-5">
            <h3 className="text-[14px] font-semibold text-ink">基本信息</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-ink-3">类型</dt>
                <dd className="mt-1.5">
                  <CapabilityTypeBadge type={definition.type} />
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">状态</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${inUse ? "bg-success" : "bg-ink-3/50"}`}
                    aria-hidden="true"
                  />
                  {inUse ? "使用中" : "未使用"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[12px] text-ink-3">描述</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                  {definition.description}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">能力标识</dt>
                <dd className="mt-1.5 font-mono text-[12px] text-ink-3">
                  {definition.id}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-3">装配数</dt>
                <dd className="mt-1.5 text-[13px] font-medium text-ink">
                  {usedBy.length} 个 Agent
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="rounded-xl bg-surface-1">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-[14px] font-semibold text-ink">被使用的 Agent（Used by）</h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                装配该能力资产的 Agent 及其装配状态
              </p>
            </div>

            {usedBy.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Bot className="h-5 w-5 text-ink-3" />
                <p className="text-[13px] text-ink-2">暂无 Agent 使用该能力</p>
                <p className="text-[12px] text-ink-3">
                  可在任一 Agent 详情的「装配能力」中添加
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {usedBy.map(({ agent, assembly }, i) => (
                  <li key={assembly.id}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50 ${
                        i > 0 ? "border-t border-border/60" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">
                          {agent.name}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-ink-3">
                          装配于 {formatDateTime(assembly.createdAt)} · {assembly.enabled ? "已启用" : "已停用"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <AgentStatusBadge status={agent.status} />
                        <Badge
                          variant="outline"
                          className={
                            assembly.enabled
                              ? "border-brand/30 bg-brand/10 text-[10.5px] font-normal text-brand"
                              : "border-ink-3/30 text-[10.5px] font-normal text-ink-3"
                          }
                        >
                          {assembly.enabled ? "已启用" : "已停用"}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* 右列：装配概览 */}
        <Card className="h-fit rounded-xl bg-surface-1 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
              <TypeIcon className="h-4 w-4 text-ink-2" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">装配概览</h3>
              <p className="text-[12px] text-ink-3">{typeMeta?.label}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-ink-3">总使用</dt>
              <dd className="text-[13px] font-semibold tabular-nums text-ink">
                {usedBy.length} 个 Agent
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-ink-3">已启用</dt>
              <dd className="text-[13px] font-medium tabular-nums text-success">
                {enabledCount}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[12px] text-ink-3">已停用</dt>
              <dd className="text-[13px] font-medium tabular-nums text-ink-3">
                {usedBy.length - enabledCount}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
