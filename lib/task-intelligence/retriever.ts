/**
 * CapabilityRetriever —— 能力需求 → 候选资源（事实 + 确定性算法）
 *
 * 对每条能力需求检索真实 ResourceCapability（487 个标签的当前有效子集）：
 * - BaseScore 复用既有的启发式打分思路（tokenizeTask 英文词 + 中文 2/3-gram + 反向关键词命中），
 *   与 Resource Discovery 阶段 `matchResourcesForTask` 的语义一致；
 * - 类别加成：需求类别与标签类别一致时加权（确定性信号）。
 * 不针对测试词硬编码；打分对所有标签通用。
 */
import type { CapabilityRequirement, RetrievableCapability, RetrievedItem } from "./types";

/** 中文 2-gram 高频停用词（无信息量，避免宽匹配噪声；不影响英文 token） */
const HAN_STOPWORDS = new Set([
  "怎么", "什么", "一个", "可以", "进行", "使用", "用于", "帮助", "需要", "以及",
  "通过", "提供", "支持", "如果", "当前", "如何", "我们", "自己", "这个", "就是",
  "主要", "基于", "包括", "以及", "相关", "内容", "方式", "情况", "时候", "看到",
  "文件", "使用", "支持", "根据", "要求", "针对", "处理", "任务", "工作",
]);

/** 分词：英文词（≥2）+ 中文 2-gram / 3-gram（过滤停用词；与现有匹配语义一致） */
export function tokenizeTask(task: string): string[] {
  const s = task.toLowerCase().trim();
  const tokens = new Set<string>();
  for (const t of s.split(/[^a-z0-9]+/)) {
    if (t.length >= 2) tokens.add(t);
  }
  const han = s.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  for (let i = 0; i < han.length - 1; i += 1) {
    const g2 = han.slice(i, i + 2);
    if (!HAN_STOPWORDS.has(g2)) tokens.add(g2);
  }
  for (let i = 0; i < han.length - 2; i += 1) tokens.add(han.slice(i, i + 3));
  return [...tokens];
}

function baseScoreFor(
  cap: RetrievableCapability,
  tokens: string[],
  /** 反向匹配基准：真实用户任务原文（非自造需求文本，避免模板词虚高） */
  userTask: string
): { score: number; hits: number; kwHits: number } {
  const hay = [cap.capability, cap.keywords.join(" "), cap.evidenceSnippet]
    .join(" ")
    .toLowerCase();
  const hits = tokens.filter((t) => t.length >= 2 && hay.includes(t)).length;
  const kwHits = cap.keywords.filter(
    (k) => k.length >= 2 && userTask.toLowerCase().includes(k)
  ).length;
  if (hits === 0 && kwHits === 0) return { score: 0, hits: 0, kwHits: 0 };
  // 与现有匹配一致的融合：词法命中（0.65）+ 标签置信度（0.35）
  const score =
    Math.min(1, (Math.min(hits + kwHits, 5) / 5) * 0.65 + cap.confidence * 0.35);
  return { score, hits, kwHits };
}

/**
 * 检索：对每条需求打分全部当前能力标签，返回 topN。
 * - 正向分词（hits）：需求语义词（模板+类型信号）在标签中的命中
 * - 反向匹配（kwHits）：真实用户任务原文中的词对标签关键词的命中（避免自造模板词虚高）
 * categoryBoost：需求类别与标签类别一致 +0.08（确定性，封顶 1）。
 */
export function retrieveCapabilities(
  requirement: CapabilityRequirement,
  capabilities: RetrievableCapability[],
  topN = 6,
  userTask?: string
): RetrievedItem[] {
  // other 类型（未识别任务）：只依赖真实用户词的反向匹配（kwHits），
  // 关闭正向语义词匹配，避免泛化词/3-gram 噪声产生虚高推荐。
  if (requirement.category === "other") {
    const reverseBase = userTask?.trim() || requirement.requirementText;
    const items: RetrievedItem[] = [];
    for (const cap of capabilities) {
      const kwHits = cap.keywords.filter(
        (k) => k.length >= 2 && reverseBase.toLowerCase().includes(k)
      ).length;
      if (kwHits === 0) continue;
      const score = Math.min(1, (Math.min(kwHits, 5) / 5) * 0.65 + cap.confidence * 0.35);
      items.push({ capability: cap, baseScore: Math.round(score * 100) / 100 });
    }
    items.sort((a, b) => b.baseScore - a.baseScore);
    return items.slice(0, topN);
  }

  const tokens = tokenizeTask(
    `${requirement.requirementText} ${requirement.keywords.join(" ")}`
  );
  const reverseBase = userTask?.trim() || requirement.requirementText;
  const items: RetrievedItem[] = [];
  for (const cap of capabilities) {
    const { score } = baseScoreFor(cap, tokens, reverseBase);
    if (score === 0) continue;
    let final = score;
    // 类别加成（early return 已排除 other 需求）
    if (cap.category === requirement.category) {
      final = Math.min(1, final + 0.08);
    }
    items.push({ capability: cap, baseScore: Math.round(final * 100) / 100 });
  }
  items.sort((a, b) => b.baseScore - a.baseScore);
  return items.slice(0, topN);
}
