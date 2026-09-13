/**
 * Task Intelligence —— 任务理解与能力编排视图（v2 重构）
 *
 * 输入任务 → 三态结果：
 *  - 态 A「matched」：有匹配技能 → 预置问题（嵌入任务）选择复制 + 去使用
 *  - 态 C「low-confidence」：边缘可用 → 少量推荐 + 建议补技能提示
 *  - 态 B「no-match」：无匹配 → 技能创建建议 + 创建提示词 + 直接生成 SKILL.md 草案
 * 旧版分析细节（拆解/证据/任务计划）折叠进「查看分析详情」。
 * 所有推荐来自真实 ResourceCapability，零 Demo 数据；不执行、不越权。
 */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  Clipboard,
  FileCode2,
  Lightbulb,
  Loader2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  taskTypeLabel,
  type Recommendation,
  type RecommendationPlan,
  type CapabilityRequirement,
} from "@/lib/task-intelligence";
import { capabilityCategoryLabel } from "@/lib/types";
import { classifyMatch } from "@/lib/task-intelligence/matcher";
import {
  generatePresetQuestions,
} from "@/lib/task-intelligence/preset-questions";
import {
  generateSkillProposals,
  type SkillProposal,
} from "@/lib/task-intelligence/skill-proposal";
import { PlanSection } from "./plan-section";
import { SkillSuggestions } from "./skill-suggestions";
import { HistoryPanel } from "./history-panel";

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

async function copyText(text: string, label = "已复制到剪贴板") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("复制失败，请手动选择复制");
  }
}

/** 单个技能卡片：信息 + 预置问题选择 + 复制 + 去使用 + 折叠证据 */
function SkillCard({ rec, task }: { rec: Recommendation; task: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const questions = generatePresetQuestions(task, rec);
  const active = questions.find((q) => q.id === selected) ?? questions[0];

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

      {/* 预置问题：选择 + 复制 */}
      <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">
          <Clipboard className="size-3" />
          预置问题 · 选择后复制，到对应 Harness 使用
        </div>
        <div className="mt-2 flex flex-col gap-1.5">
          {questions.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelected(q.id)}
              className={`rounded-md border px-2.5 py-1.5 text-left text-[11px] leading-relaxed transition-colors ${
                active.id === q.id
                  ? "border-violet-400/40 bg-violet-400/10 text-ink"
                  : "border-white/[0.06] bg-white/[0.02] text-ink-2 hover:border-white/15"
              }`}
            >
              <span className="mr-1.5 text-[10px] text-violet-300/90">{q.label}</span>
              {q.text}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1.5 text-[11px]"
            onClick={() => copyText(active.text, "问题已复制，去对应 Harness 粘贴使用")}
          >
            <Check className="size-3" />
            复制「{active.label}」
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[11px]"
            onClick={() => copyText(rec.sourcePath, "来源路径已复制")}
          >
            <Clipboard className="size-3" />
            复制来源路径
          </Button>
        </div>
      </div>

      {/* 折叠证据 */}
      <button
        type="button"
        onClick={() => setShowEvidence((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[10px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ChevronDown className={`size-3 transition-transform ${showEvidence ? "rotate-180" : ""}`} />
        证据与来源（{rec.evidenceRef}）
      </button>
      {showEvidence ? (
        <div className="mt-1.5 flex flex-col gap-1 rounded-md bg-white/[0.02] px-2.5 py-2 text-[10px] leading-relaxed text-ink-3">
          <span className="font-mono">来源：{rec.sourcePath}</span>
          <span>
            <span className="text-violet-300/90">推断</span> · {rec.reason}
          </span>
          <span>置信度 {Math.round(rec.confidence * 100)}% · 关联需求：{rec.requirementText}</span>
        </div>
      ) : null}
    </div>
  );
}

/** 态 B：技能创建建议（S1.58：相似度 < 80% 视为未找到 → 给出 3 个角度建议，复制后去任意 Harness 创建） */
function SkillProposalBlock({
  task,
  type,
  requirements,
}: {
  task: string;
  type: RecommendationPlan["taskType"];
  requirements: CapabilityRequirement[];
}) {
  const proposals = generateSkillProposals(task, type, requirements);

  return (
    <div className="flex flex-col gap-3">
      {proposals.map((proposal, idx) => (
        <ProposalCard key={proposal.suggestedName} proposal={proposal} index={idx} />
      ))}
    </div>
  );
}

/** 单个技能创建建议卡 */
function ProposalCard({ proposal, index }: { proposal: SkillProposal; index: number }) {
  const [showDraft, setShowDraft] = useState(false);

  return (
    <Card className="border-violet-400/20 bg-violet-400/[0.04]">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-ink-1">
          <Lightbulb className="size-3.5 text-violet-300" />
          <span className="text-[10px] text-violet-300/80">建议 {index + 1}</span>
          设计「{proposal.suggestedName}」 · {proposal.angle}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4 pt-1">
        <p className="text-[12px] leading-relaxed text-ink-1">{proposal.description}</p>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wide text-ink-3">触发场景</div>
            <ul className="mt-1.5 flex flex-col gap-1 text-[11px] text-ink-1">
              {proposal.triggerScenes.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wide text-ink-3">
              核心工作流 · 自由度：{proposal.freedom === "high" ? "高（文本指引）" : proposal.freedom === "medium" ? "中（带参数步骤）" : "低（固定脚本）"}
            </div>
            <ol className="mt-1.5 flex flex-col gap-1 text-[11px] text-ink-1">
              {proposal.coreWorkflow.map((w, i) => (
                <li key={w}>
                  {i + 1}. {w}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-ink-3">创建提示词（复制后到 Hermes / 豆包等平台创建）</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 gap-1 text-[10px]"
              onClick={() => copyText(proposal.creationPrompt, "创建提示词已复制")}
            >
              <Clipboard className="size-3" />
              复制
            </Button>
          </div>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white/[0.02] p-2 text-[10.5px] leading-relaxed text-ink-2">
            {proposal.creationPrompt}
          </pre>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-1.5 text-[11px]"
            onClick={() => setShowDraft((v) => !v)}
          >
            <FileCode2 className="size-3.5" />
            {showDraft ? "收起 SKILL.md 草案" : "直接生成完整方案（SKILL.md 草案）"}
          </Button>
          <span className="text-[10px] text-ink-3">
            仅生成建议文案，由你决定是否创建；不会自动写入任何目录。
          </span>
        </div>

        {showDraft ? (
          <div className="rounded-lg border border-white/[0.08] bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-ink-3">
                SKILL.md 草案 · 可复制后自行调整
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 gap-1 text-[10px]"
                onClick={() => copyText(proposal.skillMdDraft, "SKILL.md 草案已复制")}
              >
                <Clipboard className="size-3" />
                复制草案
              </Button>
            </div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white/[0.02] p-2 text-[10.5px] leading-relaxed text-ink-2">
              {proposal.skillMdDraft}
            </pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PlanResult({ plan }: { plan: RecommendationPlan }) {
  const reused = useWorkspaceStore((s) => s.taskIntelligence.reused);
  const [showDetail, setShowDetail] = useState(false);
  const match = classifyMatch(plan.recommendations);

  return (
    <div className="flex flex-col gap-4">
      {/* 总述 */}
      <Card className="border-white/[0.08] bg-white/[0.02]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-violet-400/15 text-violet-200">
              {taskTypeLabel(plan.taskType)}
            </Badge>
            <Badge
              variant={
                match.state === "matched"
                  ? "secondary"
                  : match.state === "no-match"
                    ? "outline"
                    : "outline"
              }
              className="text-[10px]"
            >
              {match.state === "matched"
                ? `已找到 ${plan.recommendations.length} 个可用技能（相似度 ≥ 80%）`
                : `未找到匹配技能（相似度 < 80%，已生成下方创建建议）`}
            </Badge>
            {reused ? (
              <Badge variant="outline" className="text-[10px] text-ink-2">
                幂等复用
              </Badge>
            ) : null}
            <span className="ml-auto font-mono text-[10px] text-ink-3">
              {plan.strategy === "llm-assisted" ? "LLM 增强" : "启发式"} · {plan.analyzerVersion}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-1">{plan.summary}</p>
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[10px] text-ink-3 transition-colors hover:text-ink-2"
          >
            <ChevronDown className={`size-3 transition-transform ${showDetail ? "rotate-180" : ""}`} />
            查看分析详情（任务拆解 / 能力需求 / 任务计划）
          </button>
          {showDetail ? (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">
                  <Workflow className="size-3" />
                  任务拆解与能力需求（推断 · {plan.requirements.length} 项）
                </div>
                {plan.requirements.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-mono text-[10px] text-ink-3">#{i + 1}</span>
                    <span className="text-ink-1">{r.requirementText}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {capabilityCategoryLabel(r.category)}
                    </Badge>
                    <span className="ml-auto font-mono text-[10px] text-ink-3">
                      关键词 {r.keywords.slice(0, 4).join(" / ")}
                    </span>
                  </div>
                ))}
              </div>
              <PlanSection analysisId={plan.analysisId} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 态 A：候选资源推荐（仅相似度 ≥ 80% 展示；低于 80% 视为未找到） */}
      {match.state === "matched" ? (
        <Card className="border-white/[0.08] bg-white/[0.02]">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-[13px] font-medium text-ink-1">
              <Sparkles className="size-3.5 text-violet-300" />
              候选资源推荐
              <span className="text-[11px] font-normal text-ink-3">
                （来自真实 ResourceCapability · {match.usable.length} 项）
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5 p-4 pt-1">
            {match.usable.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12px] text-ink-3">
                未找到匹配的真实资源（低相关任务如实返回空态，不做强行推荐）
              </div>
            ) : (
              match.usable.map((rec) => (
                <SkillCard key={rec.resourceCapabilityId} rec={rec} task={plan.task} />
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* 态 B：技能创建建议（<80% 一律给出，含低置信区间） */}
      {match.state !== "matched" ? (
        <SkillProposalBlock
          task={plan.task}
          type={plan.taskType}
          requirements={plan.requirements}
        />
      ) : null}
    </div>
  );
}

export function TaskIntelligenceView() {
  const current = useWorkspaceStore((s) => s.taskIntelligence.current);
  const analyzing = useWorkspaceStore((s) => s.taskIntelligence.analyzing);
  const error = useWorkspaceStore((s) => s.taskIntelligence.error);
  const history = useWorkspaceStore((s) => s.taskIntelligence.history);
  const analyzeTask = useWorkspaceStore((s) => s.analyzeTask);
  const fetchTaskAnalysisHistory = useWorkspaceStore((s) => s.fetchTaskAnalysisHistory);
  const loadTaskAnalysis = useWorkspaceStore((s) => s.loadTaskAnalysis);
  const deleteTaskAnalysis = useWorkspaceStore((s) => s.deleteTaskAnalysis);
  const [task, setTask] = useState("");
  const [aiEnhanced, setAiEnhanced] = useState(true);

  useEffect(() => {
    void fetchTaskAnalysisHistory();
  }, [fetchTaskAnalysisHistory]);

  async function handleLoadHistory(id: string) {
    try {
      await loadTaskAnalysis(id);
      toast.success("已回看该次分析");
    } catch (err) {
      toast.error((err as Error).message || "加载历史失败");
    }
  }

  async function handleDeleteHistory(id: string) {
    try {
      await deleteTaskAnalysis(id);
      toast.success("已删除该条历史（不影响原始资源文件）");
    } catch (err) {
      toast.error((err as Error).message || "删除失败");
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const t = task.trim();
    if (!t || analyzing) return;
    try {
      await analyzeTask(t, aiEnhanced ? "llm-assisted" : "heuristic");
      toast.success(aiEnhanced ? "任务分析完成（AI 增强）" : "任务分析完成（启发式）");
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
              <button
                type="button"
                role="switch"
                aria-checked={aiEnhanced}
                onClick={() => setAiEnhanced((v) => !v)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 text-[11px] text-ink-2 transition-colors hover:border-white/20 hover:text-ink"
                title="开启时用当前 AI Provider 增强任务类型/摘要推断；未配置 Key 时自动回退启发式"
              >
                <span
                  className={`relative block h-4 w-7 shrink-0 rounded-full transition-colors ${
                    aiEnhanced ? "bg-violet-500/60" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow ${
                      aiEnhanced ? "left-[14px]" : "left-[2px]"
                    }`}
                  />
                </span>
                AI 增强
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-ink-3">示例：</span>
              {SAMPLE_TASKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTask(t)}
                  className="h-7 rounded-md border border-white/[0.08] px-2 text-[10.5px] text-ink-2 transition-colors hover:border-violet-400/30 hover:text-violet-200"
                >
                  {t}
                </button>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 结果 */}
      {current ? <PlanResult plan={current} /> : null}

      {/* 历史管理（S1.51） */}
      <HistoryPanel
        history={history}
        currentId={current?.analysisId}
        onLoad={handleLoadHistory}
        onDelete={handleDeleteHistory}
      />

      {/* 技能使用建议（保留） */}
      <SkillSuggestions />
    </div>
  );
}
