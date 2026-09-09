/**
 * Task Plan 区块（Phase 4）——把推荐组织为「可验证的任务计划」
 *
 * - 只读展示：有序步骤（主选 + 回退链）+ 依赖 + 校验结果；
 * - 未生成计划时显示「生成任务计划」入口（POST /plan，幂等）；
 * - 所有能力引用真实 ResourceCapability（score / evidenceRef / sourcePath 可追溯）；
 * - 推断字段（output / expected / reason）与事实字段分开展示。
 */
"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, GitBranch, Layers, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/workspace";
import { capabilityCategoryLabel } from "@/lib/types";
import type { TaskPlan } from "@/lib/task-planning";

const STATUS_META: Record<string, { label: string; className: string }> = {
  valid: { label: "valid", className: "bg-emerald-400/10 text-emerald-300" },
  partial: { label: "partial", className: "bg-amber-400/10 text-amber-300" },
  invalid: { label: "invalid", className: "bg-danger/10 text-danger" },
  failed: { label: "failed", className: "bg-danger/10 text-danger" },
};

function PlanIssues({ plan }: { plan: TaskPlan }) {
  const issues = plan.validation.issues;
  if (issues.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {issues.map((it, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
            it.level === "error"
              ? "border-danger/25 bg-danger/[0.05] text-danger"
              : "border-amber-400/25 bg-amber-400/[0.05] text-amber-200"
          }`}
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            <span className="font-mono">{it.code}</span>
            {it.stepIndex !== undefined ? ` · 步骤 ${it.stepIndex + 1}` : ""} · {it.message}
          </span>
        </div>
      ))}
    </div>
  );
}

function StepRow({ step }: { step: TaskPlan["steps"][number] }) {
  const primary = step.primary;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-violet-400/15 font-mono text-[10px] text-violet-200">
          {step.stepIndex + 1}
        </span>
        <span className="text-[12px] font-medium text-ink-1">{step.requirementText}</span>
        <Badge variant="outline" className="text-[10px]">
          {capabilityCategoryLabel(step.category)}
        </Badge>
        {step.satisfaction === "unmet" ? (
          <Badge className="bg-danger/10 text-danger">未满足</Badge>
        ) : (
          <Badge className="bg-emerald-400/10 text-emerald-300">已满足</Badge>
        )}
        <span className="ml-auto font-mono text-[10px] text-ink-3">
          score {primary ? (primary.score * 100).toFixed(0) : "—"}
        </span>
      </div>

      {primary ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href={`/resources/${primary.resourceId}`}
            className="text-[12px] text-violet-300 transition-colors hover:text-violet-200"
          >
            {primary.resourceName}
          </Link>
          <Badge variant="secondary" className="text-[10px]">
            {primary.type}/{primary.harnessId}
          </Badge>
          <span className="text-[11px] text-ink-2">{primary.capability}</span>
          <span className="ml-auto font-mono text-[10px] text-ink-3">
            置信 {Math.round(primary.confidence * 100)}%
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-ink-3">
          无满足最低置信（0.5）的能力候选，如实标记为未满足
        </p>
      )}

      {/* 推断：输出 / 输入声明 */}
      <div className="mt-2.5 flex flex-col gap-1 border-t border-white/[0.05] pt-2 text-[11px] leading-relaxed text-ink-2">
        <span>
          <span className="text-violet-300/80">推断 · 输出</span>：{step.outputDescription}
        </span>
        {step.expectedInput ? (
          <span>
            <span className="text-violet-300/80">推断 · 输入</span>：{step.expectedInput}
          </span>
        ) : null}
        {primary ? (
          <span className="font-mono text-[10px] text-ink-3">
            来源 {primary.sourcePath} · 证据 {primary.evidenceRef}
          </span>
        ) : null}
      </div>

      {/* 回退链 */}
      {step.alternatives.length > 0 ? (
        <details className="mt-2 rounded-md border border-white/[0.05] px-2.5 py-1.5">
          <summary className="cursor-pointer text-[11px] text-ink-2">
            回退链（{step.alternatives.length} 个次优候选）
          </summary>
          <div className="mt-1.5 flex flex-col gap-1">
            {step.alternatives.map((alt) => (
              <div key={alt.resourceCapabilityId} className="flex flex-wrap items-center gap-2 text-[10px] text-ink-2">
                <Link href={`/resources/${alt.resourceId}`} className="text-violet-300/90 hover:text-violet-200">
                  {alt.resourceName}
                </Link>
                <span className="font-mono text-ink-3">score {(alt.score * 100).toFixed(0)}</span>
                <span className="truncate font-mono text-ink-3">{alt.sourcePath}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function PlanSection({ analysisId }: { analysisId: string }) {
  const plan = useWorkspaceStore((s) => s.taskIntelligence.plan);
  const planLoading = useWorkspaceStore((s) => s.taskIntelligence.planLoading);
  const planError = useWorkspaceStore((s) => s.taskIntelligence.planError);
  const planReused = useWorkspaceStore((s) => s.taskIntelligence.planReused);
  const createTaskPlan = useWorkspaceStore((s) => s.createTaskPlan);
  const fetchPlanByAnalysis = useWorkspaceStore((s) => s.fetchPlanByAnalysis);

  useEffect(() => {
    void fetchPlanByAnalysis(analysisId);
  }, [analysisId, fetchPlanByAnalysis]);

  async function handleCreate() {
    try {
      const created = await createTaskPlan(analysisId);
      toast.success(created.status === "valid" ? "任务计划生成完成" : `任务计划生成完成（${created.status}）`);
    } catch (err) {
      toast.error((err as Error).message || "任务计划生成失败");
    }
  }

  return (
    <Card className="border-white/[0.08] bg-white/[0.02]">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-ink-1">
          <GitBranch className="size-3.5 text-violet-300" />
          任务计划
          <span className="text-[11px] font-normal text-ink-3">
            （有序步骤 · 依赖 · 校验 · 只组织能力不执行）
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 pt-1">
        {planError ? (
          <div className="rounded-lg border border-danger/25 bg-danger/[0.06] px-3 py-2 text-[11px] text-danger">
            任务计划加载失败：{planError}
          </div>
        ) : null}

        {planLoading && !plan ? (
          <Skeleton className="h-28 w-full rounded-xl bg-white/[0.04]" />
        ) : null}

        {!plan && !planLoading && !planError ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/[0.1] px-4 py-8 text-center">
            <Layers className="size-5 text-ink-3" />
            <p className="max-w-md text-[12px] leading-relaxed text-ink-3">
              尚未生成任务计划。生成后，推荐资源将按执行顺序组织为步骤，并推导依赖、主选与回退链、校验结果。
            </p>
            <Button onClick={handleCreate} className="h-8 gap-1.5 text-[12px]">
              {planLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
              生成任务计划
            </Button>
          </div>
        ) : null}

        {plan ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={STATUS_META[plan.status]?.className ?? "bg-white/[0.06] text-ink-2"}>
                {STATUS_META[plan.status]?.label ?? plan.status}
              </Badge>
              {planReused ? (
                <Badge variant="outline" className="text-[10px] text-ink-2">
                  幂等复用
                </Badge>
              ) : null}
              <span className="ml-auto font-mono text-[10px] text-ink-3">
                {plan.plannerStrategy} · {plan.plannerVersion} · 步骤 {plan.steps.length} / 依赖 {plan.dependencies.length}
              </span>
            </div>

            <PlanIssues plan={plan} />

            {/* 依赖 */}
            {plan.dependencies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {plan.dependencies.map((d) => (
                  <span
                    key={d.id}
                    className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 text-[10px] text-ink-2"
                    title={d.reason}
                  >
                    步骤 {d.fromStepIndex + 1} → 步骤 {d.toStepIndex + 1}
                    <span className="text-ink-3"> · {d.type}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-ink-3">
                无可靠依据的依赖（步骤保持并列，不强行推断）
              </p>
            )}

            {/* 步骤 */}
            <div className="flex flex-col gap-2">
              {plan.steps.map((s) => (
                <StepRow key={s.id} step={s} />
              ))}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
