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
import { expandText, expandToken } from "./term-map";

/** 中文 2-gram 高频停用词（无信息量，避免宽匹配噪声；不影响英文 token） */
const HAN_STOPWORDS = new Set([
  "怎么", "什么", "一个", "可以", "进行", "使用", "用于", "帮助", "需要", "以及",
  "通过", "提供", "支持", "如果", "当前", "如何", "我们", "自己", "这个", "就是",
  "主要", "基于", "包括", "以及", "相关", "内容", "方式", "情况", "时候", "看到",
  "文件", "使用", "支持", "根据", "要求", "针对", "处理", "任务", "工作",
]);

/**
 * 分词：英文词（≥2）+ 中文 2-gram / 3-gram（过滤停用词；与现有匹配语义一致）。
 * opts.expand=true 时对每个 token 做中英术语同义词扩展（见 term-map），
 * 用于跨语言匹配（中文任务词 ↔ 英文能力/资源名），默认不扩展、行为向后兼容。
 */
export function tokenizeTask(task: string, opts?: { expand?: boolean }): string[] {
  const s = task.toLowerCase().trim();
  const tokens = new Set<string>();
  const push = (t: string) => {
    if (t.length < 2) return;
    if (opts?.expand) {
      for (const x of expandToken(t)) {
        if (x.length >= 2) tokens.add(x);
      }
    } else {
      tokens.add(t);
    }
  };
  for (const t of s.split(/[^a-z0-9]+/)) {
    if (t.length >= 2) push(t);
  }
  const han = s.replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
  for (let i = 0; i < han.length - 1; i += 1) {
    const g2 = han.slice(i, i + 2);
    if (!HAN_STOPWORDS.has(g2)) push(g2);
  }
  for (let i = 0; i < han.length - 2; i += 1) push(han.slice(i, i + 3));
  return [...tokens];
}

/** 构造匹配 hay：能力文本 + 关键词 + 证据片段 + 资源名 + 双语同义词扩展 */
function buildHay(cap: RetrievableCapability): string {
  const raw = [cap.capability, cap.keywords.join(" "), cap.evidenceSnippet, cap.resourceName]
    .join(" ")
    .toLowerCase();
  const extra = expandText(raw);
  return extra ? `${raw} ${extra}` : raw;
}

function baseScoreFor(
  cap: RetrievableCapability,
  tokens: string[],
  /** 反向匹配基准：真实用户任务原文（非自造需求文本，避免模板词虚高） */
  userTask: string,
  userTokens: string[]
): { score: number; hits: number; kwHits: number; userHits: number } {
  const hay = buildHay(cap);
  const hits = tokens.filter((t) => t.length >= 2 && hay.includes(t)).length;
  const kwHits = cap.keywords.filter(
    (k) => k.length >= 2 && userTask.toLowerCase().includes(k)
  ).length;
  // 真实用户任务原文词在能力文本中的命中：最强相关性信号
  const userHits = userTokens.filter((t) => t.length >= 2 && hay.includes(t)).length;
  // 无任何真实用户信号（原文词命中 / 关键词反向命中）→ 视为不相关，直接淘汰，
  // 防止模板通用词（撰写/生成/平台/内容…）把无关能力顶到前排。
  if (userHits === 0 && kwHits === 0) return { score: 0, hits, kwHits, userHits };
  // 相关性主导：用户原文词 0.7 + 模板语义词辅助 0.2 + 标签置信度微调 0.1
  const lexical = Math.min(1, (userHits + kwHits) / 3);
  const forward = Math.min(1, hits / 12);
  const score = lexical * 0.7 + forward * 0.2 + cap.confidence * 0.1;
  return { score, hits, kwHits, userHits };
}

/**
 * 检索：对每条需求打分全部当前能力标签，返回 topN。
 * - 正向分词（hits）：需求语义词（模板+类型信号）在标签中的命中
 * - 反向匹配（kwHits）：真实用户任务原文中的词对标签关键词的命中（避免自造模板词虚高）
 * categoryBoost：需求类别与标签类别一致 +0.08（确定性，封顶 1）。
 * topN 取 12：双语扩展后第一梯队常出现同分并列，候选池过小会把等价能力按插入序截断，
 * 由 Reranker 的 evidenceBoost / 去重做最终排序。
 */
export function retrieveCapabilities(
  requirement: CapabilityRequirement,
  capabilities: RetrievableCapability[],
  topN = 12,
  userTask?: string
): RetrievedItem[] {
  // other 类型（未识别任务）：只依赖真实用户词（userHits / kwHits），
  // 关闭正向语义词匹配，避免泛化词/3-gram 噪声产生虚高推荐。
  if (requirement.category === "other") {
    const reverseBase = userTask?.trim() || requirement.requirementText;
    const userTokens = tokenizeTask(reverseBase, { expand: true });
    const items: RetrievedItem[] = [];
    for (const cap of capabilities) {
      const hay = buildHay(cap);
      const userHits = userTokens.filter((t) => t.length >= 2 && hay.includes(t)).length;
      const kwHits = cap.keywords.filter(
        (k) => k.length >= 2 && reverseBase.toLowerCase().includes(k)
      ).length;
      if (userHits === 0 && kwHits === 0) continue;
      const score =
        Math.min(1, (userHits + kwHits) / 3) * 0.8 + cap.confidence * 0.2;
      items.push({
        capability: cap,
        baseScore: Math.round(score * 100) / 100,
        userHits,
      });
    }
    items.sort((a, b) => b.baseScore - a.baseScore || b.userHits - a.userHits);
    return items.slice(0, topN);
  }

  const tokens = tokenizeTask(
    `${requirement.requirementText} ${requirement.keywords.join(" ")}`,
    { expand: true }
  );
  const reverseBase = userTask?.trim() || requirement.requirementText;
  const userTokens = tokenizeTask(reverseBase, { expand: true });
  const items: RetrievedItem[] = [];
  for (const cap of capabilities) {
    const { score, userHits } = baseScoreFor(cap, tokens, reverseBase, userTokens);
    if (score === 0) continue;
    let final = score;
    // 类别加成（early return 已排除 other 需求）
    if (cap.category === requirement.category) {
      final = Math.min(1, final + 0.08);
    }
    items.push({
      capability: cap,
      baseScore: Math.round(final * 100) / 100,
      userHits,
    });
  }
  items.sort((a, b) => b.baseScore - a.baseScore || b.userHits - a.userHits);
  return items.slice(0, topN);
}
