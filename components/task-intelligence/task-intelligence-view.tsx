/**
 * Task Intelligence —— 任务理解与能力编排视图（Phase 3）
 *
 * 内容：任务输入 → 类型识别 / 子任务拆解 / 能力需求（推断，isInferred 标记）
 *      → 真实资源推荐（证据链：sourcePath + evidenceRef 可追溯）
 * 所有推荐来自真实 ResourceCapability（487 标签），零 Demo 数据；
 * 低相关任务如实展示空态；Mock 模式不伪造分析结果。
 */
"use client";
import { useState } from "react";
import Link from "next/link";
import { BrainCircuit, Loader2, Sparkles, Workflow } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceStore } from "@/stores/workspace";
import { taskTypeLabel, type Recommendation, type RecommendationPlan } from "@/lib/task-intelligence";
import { capabilityCategoryLabel } from "@/lib/types";
import { PlanSection } from "./plan-section";
import { SkillSuggestions } from "./skill-suggestions";

const SAMPLE_TASKS = ["写一篇小红书文案", "帮我做一份数据周报并整理成表格", "总结一下这份会议纪要"];

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex w-24 items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-violet-400/80"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[11px] text-ink-2">{pct}</span>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-ink-3">#{rec.rank}</span>
        <Link
          href={`/resources/${rec.resourceId}`}
          className="text-[13px] font-medium text-ink-1 transition-colors hover:text-violet-300"
        >
          {rec.resourceName}
        </Link>
        <Badge variant="secondary" className="text-[10px]">
          {rec.type}/{rec.harnessId}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {capabilityCategoryLabel(rec.category)}
        </Badge>
        <div className="ml-auto">
          <ScoreBar score={rec.score} />
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-1">{rec.capability}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
        <span className="text-violet-300/90">推断</span> · {rec.reason}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-3">
        <span className="font-mono">来源：{rec.sourcePath}</span>
        <span className="font-mono">证据：{rec.evidenceRef}</span>
        <span>置信度 {Math.round(rec.confidence * 100)}%</span>
        <span className="text-ink-3">关联需求：{rec.requirementText}</span>
      </div>
    </div>
  );
}

function PlanResult({ plan }: { plan: RecommendationPlan }) {
  const reused = useWorkspaceStore((s) => s.taskIntelligence.reused);
  return (
    <div className="flex flex-col gap-4">
      {/* 总述 */}
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-violet-400/15 text-violet-200">
              {taskTypeLabel(plan.taskType)}
            </Badge>
            {reused ? (
              <Badge variant="outline" className="text-[10px] text-ink-2">
                幂等复用（同输入已有分析）
              </Badge>
            ) : null}
            <span className="ml-auto font-mono text-[10px] text-ink-3">
              {plan.strategy === "llm-assisted" ? "LLM 增强" : "启发式"} ·{" "}
              {plan.analyzerVersion}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-1">{plan.summary}</p>
        </CardContent>
      </Card>

      {/* 拆解：能力需求（推断） */}
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-ink-1">
            <Workflow className="size-3.5 text-violet-300" />
            任务拆解与能力需求
            <span className="text-[11px] font-normal text-ink-3">（推断 · {plan.requirements.length} 项）</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-1">
          {plan.requirements.map((r, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <span className="font-mono text-[10px] text-ink-3">#{i + 1}</span>
              <span className="text-[12px] text-ink-1">{r.requirementText}</span>
              <Badge variant="outline" className="text-[10px]">
                {capabilityCategoryLabel(r.category)}
              </Badge>
              <Badge variant="secondary" className="text-[10px] text-amber-300/80">
                isInferred
              </Badge>
              <span className="ml-auto font-mono text-[10px] text-ink-3">
                关键词 {r.keywords.slice(0, 4).join(" / ")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 推荐 */}
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-ink-1">
            <Sparkles className="size-3.5 text-violet-300" />
            候选资源推荐
            <span className="text-[11px] font-normal text-ink-3">
              （来自真实 ResourceCapability · {plan.recommendations.length} 项）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 p-4 pt-1">
          {plan.recommendations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12px] text-ink-3">
              未找到匹配的真实资源（低相关任务如实返回空态，不做强行推荐）
            </div>
          ) : (
            plan.recommendations.map((rec) => (
              <RecommendationCard key={rec.resourceCapabilityId} rec={rec} />
            ))
          )}
        </CardContent>
      </Card>

      {/* 任务计划（Phase 4）：有序步骤 + 依赖 + 校验 */}
      <PlanSection analysisId={plan.analysisId} />
    </div>
  );
}

export function TaskIntelligenceView() {
  const current = useWorkspaceStore((s) => s.taskIntelligence.current);
  const analyzing = useWorkspaceStore((s) => s.taskIntelligence.analyzing);
  const error = useWorkspaceStore((s) => s.taskIntelligence.error);
  const analyzeTask = useWorkspaceStore((s) => s.analyzeTask);
  const [task, setTask] = useState("");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const t = task.trim();
    if (!t || analyzing) return;
    try {
      await analyzeTask(t);
      toast.success("任务分析完成");
    } catch (err) {
      toast.error((err as Error).message || "任务分析失败");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <div className="rounded-xl border border-danger/25 bg-danger/[0.06] px-4 py-3 text-[12px] text-danger">
          任务分析请求失败：{error}
        </div>
      ) : null}

      {/* 输入区 */}
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardContent className="p-4">
          <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="task-input" className="text-[12px] text-ink-2">
                描述一个你想完成的任务
              </label>
              <textarea
                id="task-input"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={3}
                placeholder="例如：写一篇小红书文案"
                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[13px] text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus:border-violet-400/40"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={analyzing || task.trim().length === 0} className="h-8 gap-1.5 text-[12px]">
                {analyzing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <BrainCircuit className="size-3.5" />
                )}
                {analyzing ? "分析中…" : "分析任务"}
              </Button>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-ink-3">示例：</span>
                {SAMPLE_TASKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTask(t)}
                    className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-ink-2 transition-colors hover:border-violet-400/30 hover:text-violet-200"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 结果 */}
      {current ? <PlanResult plan={current} /> : null}

      {/* 技能使用建议（S1.21：替换原「最近分析」） */}
      <SkillSuggestions />
    </div>
  );
}
