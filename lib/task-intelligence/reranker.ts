/**
 * Reranker —— 跨需求合并 / 去重 / 排序（事实信号）
 *
 * - 同一 resource_capability 被多条需求命中 → 保留最高分，理由合并；
 * - 同一资源多个标签 → 保留最高分标签（避免同一资源刷屏）；
 * - 证据质量微调：SKILL.md#description 等主证据 > #heading 次级证据（确定性）。
 */
import type { CapabilityRequirement, RetrievedItem, Recommendation } from "./types";

/** 证据质量分级：主证据（description/frontmatter）权重更高 */
function evidenceBoost(evidenceRef: string): number {
  const ref = evidenceRef.toLowerCase();
  if (ref.includes("description") || ref.includes("frontmatter")) return 0.04;
  if (ref.includes("heading")) return 0;
  return 0.02;
}

/** 生成推荐理由（推断文本，但完全基于真实匹配信号，不含硬编码结论） */
function buildReason(
  req: CapabilityRequirement,
  item: RetrievedItem,
  extraHits: string[]
): string {
  const parts: string[] = [
    `子任务「${req.derivedFrom}」需要${req.category}类能力`,
    `该资源能力「${truncate(item.capability.capability)}」（置信度 ${Math.round(
      item.capability.confidence * 100
    )}%）匹配`,
  ];
  if (extraHits.length > 0) parts.push(`同时匹配「${extraHits.join("、")}」`);
  parts.push(`证据：${item.capability.evidenceRef}（${item.capability.sourcePath}）`);
  return parts.join("；") + "。";
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 最低推荐分：低于该值的候选视为低置信，如实过滤（避免强行推荐） */
export const MIN_RECOMMENDATION_SCORE = 0.5;

/**
 * 合并排序：输入为「按需求分组」的候选，输出最终推荐列表。
 * limit：最终推荐条数（默认 8）。
 */
export function rerankAndAssemble(
  requirements: CapabilityRequirement[],
  grouped: { requirement: CapabilityRequirement; items: RetrievedItem[] }[],
  limit = 8
): Recommendation[] {
  const byCapability = new Map<
    string,
    {
      best: RetrievedItem;
      bestScore: number;
      requirement: CapabilityRequirement;
      extraHits: string[];
    }
  >();

  for (const { requirement, items } of grouped) {
    for (const item of items) {
      const existing = byCapability.get(item.capability.resourceCapabilityId);
      if (!existing) {
        byCapability.set(item.capability.resourceCapabilityId, {
          best: item,
          bestScore: item.baseScore,
          requirement,
          extraHits: [],
        });
        continue;
      }
      if (item.baseScore > existing.bestScore) {
        existing.best = item;
        existing.bestScore = item.baseScore;
        existing.requirement = requirement;
      } else if (item.baseScore === existing.bestScore) {
        existing.extraHits.push(truncate(item.capability.capability, 24));
      }    }
  }

  // 同资源多标签去重：保留该资源最高分标签
  interface BestEntry {
    best: RetrievedItem;
    bestScore: number;
    requirement: CapabilityRequirement;
    extraHits: string[];
  }
  const byResource = new Map<string, BestEntry>();
  for (const entry of byCapability.values()) {
    const cur = byResource.get(entry.best.capability.resourceId);
    if (!cur || entry.bestScore > cur.bestScore) {
      byResource.set(entry.best.capability.resourceId, entry);
    }
  }

  const list = [...byResource.values()]
    .map((entry) => {
      const cap = entry.best.capability;
      const score = Math.min(
        1,
        Math.round((entry.bestScore + evidenceBoost(cap.evidenceRef)) * 100) / 100
      );
      return {
        resourceCapabilityId: cap.resourceCapabilityId,
        resourceId: cap.resourceId,
        resourceName: cap.resourceName,
        harnessId: cap.harnessId,
        type: cap.type,
        capability: cap.capability,
        category: cap.category,
        confidence: cap.confidence,
        evidenceRef: cap.evidenceRef,
        evidenceSnippet: cap.evidenceSnippet,
        sourcePath: cap.sourcePath,
        score,
        userHits: entry.best.userHits,
        reason: buildReason(entry.requirement, entry.best, entry.extraHits),
        requirementText: entry.requirement.requirementText,
        rank: 0,
      };
    })
    .filter((r) => r.score >= MIN_RECOMMENDATION_SCORE);

  // 主序：分数降序；同分（常见于双语扩展后的并列第一梯队）→ 真实用户词命中数降序，
  // 让更贴切用户原文的语义主证据优先展示（确定性，非硬编码）。
  list.sort(
    (a, b) =>
      b.score - a.score ||
      b.userHits - a.userHits ||
      a.harnessId.localeCompare(b.harnessId) ||
      a.resourceName.localeCompare(b.resourceName)
  );
  return list
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
