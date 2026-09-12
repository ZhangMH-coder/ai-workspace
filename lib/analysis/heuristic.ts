/**
 * HeuristicAnalyzer —— Phase 2 MVP 唯一实际分析器（确定性规则，零外部依赖）
 *
 * 原则：
 * - 纯函数：同一输入 → 同一输出（幂等，配合 fingerprint 增量）
 * - 不编造：输入信息不足时输出「未提取到明确能力」（capabilities 为空），
 *   禁止人为拆分或制造能力标签
 * - 每条能力标签必须带 evidenceRef + evidenceSnippet（指向真实文件位置）
 * - 事实（description / frontmatter / headings）来自真实文件，仅做规则归纳
 */
import type { CapabilityCategory, ResourceType } from "@/lib/types";
import type { AnalysisInput, AnalysisOutcome, AnalysisProvider, CapabilityResult } from "./types";

const CATEGORY_KEYWORDS: { category: CapabilityCategory; patterns: RegExp[] }[] = [
  {
    category: "text_summary",
    patterns: [/摘要/i, /总结/i, /summar/i, /提炼/i, /概述/i, /要点/i, /阅读/i, /解读/i],
  },
  {
    category: "web_research",
    patterns: [/搜索/i, /检索/i, /研究/i, /research/i, /search/i, /舆情/i, /热点/i, /信息收集/i, /资料/i],
  },
  {
    category: "code_gen",
    patterns: [/代码/i, /编码/i, /code/i, /生成.*(代码|脚本|程序)/i, /编程/i, /开发/i, /前端/i, /后端/i, /bug/i, /debug/i, /重构/i],
  },
  {
    category: "data_analysis",
    patterns: [/数据/i, /分析/i, /统计/i, /data/i, /报表/i, /指标/i, /趋势/i, /漏斗/i, /留存/i, /实验/i, /excel/i, /表格/i],
  },
  {
    category: "automation",
    patterns: [/自动/i, /automation/i, /定时/i, /批处理/i, /工作流/i, /workflow/i, /流水线/i, /监控/i, /cron/i, /脚本/i],
  },
  {
    category: "content_creation",
    patterns: [/文案/i, /写作/i, /内容/i, /笔记/i, /小红书/i, /公众号/i, /文章/i, /标题/i, /新媒体/i, /脚本.*视频/i, /创作/i, /创意/i],
  },
  {
    category: "dev_tool",
    patterns: [/cli/i, /工具/i, /command/i, /命令行/i, /shell/i, /git/i, /构建/i, /部署/i, /docker/i, /lint/i, /格式化/i, /依赖/i, /npm/i],
  },
];

/** 通用章节（不产能力标签） */
const GENERIC_HEADINGS = new Set([
  "概述",
  "简介",
  "介绍",
  "安装",
  "安装与使用",
  "快速开始",
  "使用",
  "用法",
  "使用说明",
  "配置",
  "参考",
  "常见问题",
  "FAQ",
  "更新日志",
  "Changelog",
  "License",
  "概述（Overview）",
  "Introduction",
  "Installation",
  "Quick Start",
  "Usage",
  "Configuration",
  "Examples",
  "适用范围",
  "属性",
  "说明",
  "其他",
  "背景",
  "目标",
  "结构",
  "示例",
  "特点",
  "特性",
  "注意",
  "注意事项",
  "依赖",
  "环境要求",
]);

/** 判断文本是否是有意义的描述（过滤 YAML 折叠符、纯符号等） */
function isMeaningfulText(text: string): boolean {
  const clean = text.replace(/[\s>|\-_#*`"'()（）\[\]【】]/g, "");
  return clean.length >= 4;
}

function classifyCategory(text: string): CapabilityCategory {
  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((p) => p.test(text))) return category;
  }
  return "dev_tool";
}

function typeBasedCategory(type: ResourceType): CapabilityCategory {
  switch (type) {
    case "skill":
      return "other";
    case "agent":
      return "automation";
    case "command":
      return "dev_tool";
    case "rule":
      return "other";
    case "plugin":
      return "dev_tool";
    case "prompt":
      return "content_creation";
    case "mcp":
      return "dev_tool";
    default:
      return "other";
  }
}

function makeExecutionHint(type: ResourceType, name: string): string | null {
  switch (type) {
    case "skill":
      return `skill: ${name}`;
    case "agent":
      return `agent: ${name}`;
    case "plugin":
      return `plugin: ${name}`;
    case "command":
      return `command: ${name}`;
    case "rule":
      return `rule: ${name}`;
    case "mcp":
      return `mcp: ${name}`;
    default:
      return null;
  }
}

function extractKeywords(text: string, extra: string[] = []): string[] {
  const words = text
    .replace(/[，。；、！？（）()「」『』：:,.!?;'"\-_/\\\n]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && w.length <= 16);
  const set = new Set<string>();
  for (const w of [...words, ...extra]) {
    if (w.length >= 2 && w.length <= 16) set.add(w);
    if (set.size >= 8) break;
  }
  return [...set];
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * 从正文预览提取「首个有意义段落」作为主能力描述兜底
 * （description 缺失或过短时使用，产出与豆包同级别的完整描述）。
 * bodyPreview 已压缩空白（换行→空格），按句子标点分段；
 * 去掉标题残留（#）、列表符号等噪声前缀。
 * 优先中文段落（Hermes 等正文常为英文，中文描述比英文更利于索引匹配）。
 */
function extractFirstMeaningfulParagraph(body: string, minLen = 20): string {
  const parts = body
    .split(/[。！？!?；;]\s*/)
    .map((s) => s.replace(/^[#>\-*0-9.\s]+/, "").trim())
    .filter((s) => s.length >= minLen);
  if (parts.length === 0) return "";
  const zh = parts.find((s) => /[\u4e00-\u9fa5]/.test(s));
  const first = zh ?? parts[0];
  return truncate(first.replace(/\s+/g, " ").trim(), 120);
}

/** 语义长度（去符号后） */
function semanticLength(text: string): number {
  return text.replace(/[\s>|\-_#*`"'()（）\[\]【】:：,，.。]/g, "").length;
}

/**
 * 主描述不完善的判定：空 / 无意义 / 过短（<15 语义字符）。
 * 完整的中文短描述（如 Hermes「音频转文字:把语音消息…」）不算弱，予以保留。
 */
function isWeakDescription(desc: string): boolean {
  return !desc || !isMeaningfulText(desc) || semanticLength(desc) < 15;
}

/** 从 description 提取主能力；描述不完善时用正文首段兜底（证据 #description / #body-preview） */
function capabilityFromDescription(input: AnalysisInput): CapabilityResult | null {
  const desc = (input.resource.description || "").trim();
  let text = desc;
  let evidenceRef = "SKILL.md#description";
  let snippetSource = desc;
  if (isWeakDescription(desc)) {
    const bodyPara = extractFirstMeaningfulParagraph(input.document.bodyPreview);
    if (bodyPara) {
      text = bodyPara;
      evidenceRef = "SKILL.md#body-preview";
      snippetSource = bodyPara;
    }
  }
  if (!text || !isMeaningfulText(text)) return null;
  const snippet = truncate(snippetSource.replace(/\s+/g, " ").trim(), 240);
  return {
    capability: truncate(text.replace(/\s+/g, " ").trim(), 120),
    category: classifyCategory(text),
    keywords: extractKeywords(text),
    confidence: 0.72,
    evidenceRef,
    evidenceSnippet: snippet,
    executionHint: makeExecutionHint(input.resource.type, input.resource.name),
  };
}

/** 否定 / 边界 / 限制类标题（不是能力，跳过） */
const NEGATIVE_HEADING = /(不适用|边界|注意|禁止|不要|勿|风险|限制|回退|fallback|constraint|warning|limitations?)/i;

/**
 * 标题噪声过滤：
 * - 序号开头（"1. Confirm format" / "0. 定位"）→ 步骤/小节标题，不是能力
 * - 文件扩展名（.silk / .md / .json 等）→ 文件名噪声
 * - 含路径分隔符 / Windows 路径 → 文件名噪声
 */
const NOISE_HEADING = /^\d+[.、．)）]|[.]\s*(silk|md|markdown|json|toml|yaml|yml|txt|py|js|ts)\b|[\\/][A-Za-z0-9_ .-]+[\\/]|[A-Za-z]:\\/i;

/** 从正文标题提取补充能力（章节有动作/主题语义时，证据 #heading） */
function capabilitiesFromHeadings(input: AnalysisInput): CapabilityResult[] {
  const out: CapabilityResult[] = [];
  for (const h of input.document.headings) {
    const clean = h.replace(/^#{1,3}\s*/, "").trim();
    if (!clean || GENERIC_HEADINGS.has(clean)) continue;
    if (clean.length < 2 || clean.length > 40) continue;
    if (NEGATIVE_HEADING.test(clean)) continue;
    if (NOISE_HEADING.test(clean)) continue;
    const category = classifyCategory(clean);
    out.push({
      capability: truncate(clean, 60),
      category: category === "dev_tool" ? typeBasedCategory(input.resource.type) : category,
      keywords: extractKeywords(clean),
      confidence: 0.5,
      evidenceRef: "#heading",
      evidenceSnippet: truncate(clean, 120),
      executionHint: null,
    });
    if (out.length >= 3) break;
  }
  return out;
}

/** 从引用文件 / 资源类型提炼执行提示型能力（仅当资源无描述也无标题时兜底，避免空能力） */
function capabilityFromType(input: AnalysisInput): CapabilityResult[] {
  if (input.resource.description.trim() || input.document.headings.length > 0) return [];
  const refText = input.document.references.slice(0, 6).join(" ");
  if (!refText.trim()) return [];
  return [
    {
      capability: `${input.resource.name}（${input.resource.framework || "本地资源"}，无明确描述，按类型归纳）`,
      category: typeBasedCategory(input.resource.type),
      keywords: extractKeywords(input.resource.name),
      confidence: 0.3,
      evidenceRef: "#references",
      evidenceSnippet: truncate(refText, 200),
      executionHint: makeExecutionHint(input.resource.type, input.resource.name),
    },
  ];
}

export const heuristicAnalyzer: AnalysisProvider = {
  id: "heuristic-v3",
  strategy: "heuristic",
  analyze(input: AnalysisInput): AnalysisOutcome {
    const capabilities: CapabilityResult[] = [];
    const primary = capabilityFromDescription(input);
    if (primary) capabilities.push(primary);
    capabilities.push(...capabilitiesFromHeadings(input));
    capabilities.push(...capabilityFromType(input));

    // 去重（capability 文本相同）
    const seen = new Set<string>();
    const unique = capabilities.filter((c) => {
      const k = c.capability;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const summary =
      unique.length > 0 ? `可${unique[0].capability}${unique.length > 1 ? ` 等 ${unique.length} 项能力` : ""}` : "未提取到明确能力";
    return { status: "analyzed", summary, capabilities: unique };
  },
};
