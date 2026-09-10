/**
 * Resource Discovery —— 资源详情（V1 MVP）
 *
 * 溯源链：Harness → 真实本地路径 → 原始文件 → 元数据摘要。
 * parseable=false 时明确展示原因与保留的路径信息。
 */
import Link from "next/link";
import { ArrowLeft, FileCode2, FolderOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  resourceTypeLabel,
  type DiscoveredResource,
} from "@/lib/types";

export function ResourceDetail({ resource }: { resource: DiscoveredResource }) {
  const metaEntries = Object.entries(resource.metadata ?? {});
  const usage =
    (typeof resource.metadata?.usage === "string" && resource.metadata.usage.trim()
      ? resource.metadata.usage
      : null) ?? resource.description;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/resources">
          <Button variant="ghost" size="sm" className="mb-3 h-7 px-2 text-[12px] text-ink-2">
            <ArrowLeft className="size-3.5" /> 返回资源列表
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">{resource.name}</h1>
          <Badge variant="outline" className="border-white/10 text-ink-2">
            {resourceTypeLabel(resource.type)}
          </Badge>
          {resource.parseable ? (
            <Badge className="border-success/30 bg-success/10 text-success">已解析</Badge>
          ) : (
            <Badge className="border-warning/30 bg-warning/10 text-warning">发现但暂无法解析</Badge>
          )}
        </div>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-2">
          {resource.description || "（无描述）"}
        </p>
      </div>

      {/* 如何使用 */}
      {resource.parseable && usage ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">如何使用</p>
          <p className="text-[13px] leading-relaxed text-ink">{usage}</p>
        </div>
      ) : null}

      {/* Hermes 配置专用展示：模型 / Provider / 可用模型列表 */}
      {resource.type === "rule" && typeof resource.metadata?.defaultModel === "string" ? (
        <HermesConfigDetail metadata={resource.metadata} />
      ) : null}

      {/* 人设专用展示：SOUL.md 全文（本地只读） */}
      {resource.type === "prompt" && typeof resource.metadata?.content === "string" ? (
        <SoulProfileDetail metadata={resource.metadata} />
      ) : null}

      {/* 溯源卡 */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">来源溯源</p>
        <div className="flex flex-col gap-1.5">
          <TraceRow
            label="Harness"
            value={`${resource.source}（${resource.framework}）`}
          />
          <TraceRow label="类型" value={resourceTypeLabel(resource.type)} />
          <TraceRow
            label="来源路径"
            value={resource.sourcePath}
            mono
          />
          <TraceRow
            label="最后修改"
            value={resource.lastModified ? new Date(resource.lastModified).toLocaleString() : "未知"}
          />
          <TraceRow label="状态" value={resource.status === "enabled" ? "enabled" : "unknown（无法判断）"} />
        </div>
      </div>

      {!resource.parseable ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/[0.06] p-3.5">
          <FileCode2 className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-[12px] leading-relaxed text-ink-2">
            <p className="font-medium text-warning">发现该资源，但暂无法解析为结构化信息</p>
            <p className="mt-0.5">
              原因：{resource.parseNote ?? "未知"}。已保留真实路径与基本信息，不做格式猜测。
            </p>
          </div>
        </div>
      ) : null}

      {metaEntries.length > 0 ? (
        <>
          <Separator className="bg-white/[0.06]" />
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
              元数据摘要（来自原始文件）
            </p>
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              {metaEntries.map(([k, v]) => (
                <div key={k} className="flex flex-wrap items-baseline gap-2 text-[12px]">
                  <span className="w-32 shrink-0 text-ink-3">{k}</span>
                  <span className="min-w-0 break-all font-mono text-[11px] text-ink-2">
                    {typeof v === "string" ? (v.length > 240 ? `${v.slice(0, 240)}…` : v) : JSON.stringify(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <FolderOpen className="size-3.5" />
        此路径指向本机真实文件/目录，仅作只读索引，未修改原始内容。
      </div>
    </div>
  );
}

function TraceRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 text-[12px]">
      <span className="w-20 shrink-0 text-ink-3">{label}</span>
      <span
        className={`min-w-0 break-all text-ink ${mono ? "font-mono text-[11px] text-ink-2" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

/** Hermes 配置专用展示：默认模型 / Provider / 可用模型列表 */
function HermesConfigDetail({ metadata }: { metadata: Record<string, unknown> }) {
  const defaultModel = typeof metadata.defaultModel === "string" ? metadata.defaultModel : null;
  const provider = typeof metadata.provider === "string" ? metadata.provider : null;
  const baseUrl = typeof metadata.baseUrl === "string" ? metadata.baseUrl : null;
  const models = Array.isArray(metadata.models)
    ? (metadata.models as string[]).filter((m) => typeof m === "string")
    : [];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
        Hermes 运行配置（来自 config.yaml）
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {defaultModel ? (
          <ConfigCell label="默认模型" value={defaultModel} mono />
        ) : null}
        {provider ? <ConfigCell label="Provider" value={provider} /> : null}
        {baseUrl ? <ConfigCell label="Base URL" value={baseUrl} mono small /> : null}
      </div>
      {models.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-ink-3">可用模型（{models.length}）</p>
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <span
                key={m}
                className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-mono text-[11px] text-ink-2"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConfigCell({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-3">{label}</p>
      <p
        className={`mt-0.5 break-all text-[12.5px] text-ink ${mono ? "font-mono text-[11.5px]" : ""} ${small ? "text-[11px]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

/** 人设专用展示：SOUL.md 全文（本地只读索引） */
function SoulProfileDetail({ metadata }: { metadata: Record<string, unknown> }) {
  const content = typeof metadata.content === "string" ? metadata.content : null;
  const profile = typeof metadata.profile === "string" ? metadata.profile : null;
  if (!content) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
          SOUL.md 人设全文{profile ? ` · ${profile}` : ""}
        </p>
        <span className="text-[10px] text-ink-3">本地只读 · 未修改原始文件</span>
      </div>
      <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.06] bg-black/30 p-3 font-sans text-[12px] leading-relaxed text-ink-2">
        {content}
      </pre>
    </div>
  );
}
