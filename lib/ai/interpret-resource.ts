/**
 * 技能 AI 解读（场景 B：资源详情页 → 「如何使用」）
 *
 * 服务端用 LLM 解读一个真实资源的用途与用法，返回结构化结果：
 * summary（一句话总结）/ whatItDoes（能做什么）/ howToUse（怎么用，直接可执行）。
 * LLM 输出非 JSON 或解析失败时，回退为原始 Markdown（rawMarkdown），前端平铺展示，不伪造。
 * 未配置 Key 时由调用方返回 LLM_NOT_CONFIGURED（前端如实提示）。
 */
import { chatCompletion } from "./client";
import type { LLMConfig } from "./config";

export interface ResourceForInterpret {
  name: string;
  type: string;
  description: string;
  sourcePath: string;
  usage: string;
}

export interface InterpretedResource {
  summary: string;
  whatItDoes: string[];
  howToUse: string[];
  /** LLM 原始输出；仅当结构化解析失败时非空，前端回退展示 */
  rawMarkdown: string;
  model: string;
}

const SYSTEM_PROMPT = `你是 AI Workspace 的技能使用说明助手。请用简洁的中文解读下面的本地 AI 资源，只输出一个 JSON 对象，不要输出任何其他文字。

JSON 结构（字段名固定）：
{"summary":"一句话总结","whatItDoes":["它能做什么 要点1","要点2"],"howToUse":["怎么用 步骤1","步骤2"]}

要求：
1. summary：30 字以内，一句话说清这个资源是干什么的
2. whatItDoes：2-4 条要点
3. howToUse：2-4 条，每条是一个可直接执行的动作或触发方式（例如调用命令、触发词、使用路径）
4. 全程基于给定信息，不要编造不存在的功能`;

function parseInterpretJson(text: string): { summary: string; whatItDoes: string[]; howToUse: string[] } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]) as {
      summary?: unknown;
      whatItDoes?: unknown;
      howToUse?: unknown;
    };
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const list = (v: unknown) =>
      Array.isArray(v)
        ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
        : [];
    const summary = str(obj.summary);
    const whatItDoes = list(obj.whatItDoes);
    const howToUse = list(obj.howToUse);
    if (!summary && whatItDoes.length === 0 && howToUse.length === 0) return null;
    return { summary, whatItDoes, howToUse };
  } catch {
    return null;
  }
}

export async function interpretResourceText(
  resource: ResourceForInterpret,
  config: LLMConfig
): Promise<InterpretedResource> {
  const user = [
    `名称：${resource.name}`,
    `类型：${resource.type}`,
    resource.description ? `描述：${resource.description}` : "",
    resource.usage ? `用法：${resource.usage}` : "",
    `来源路径：${resource.sourcePath}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await chatCompletion(
    {
      temperature: 0.4,
      maxTokens: 900,
      timeoutMs: 30_000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    },
    config
  );

  const parsed = parseInterpretJson(res.text);
  if (!parsed) {
    // 解析失败：回退原始 Markdown，前端平铺展示，不伪造结构化字段
    return { summary: "", whatItDoes: [], howToUse: [], rawMarkdown: res.text, model: res.model };
  }
  return { ...parsed, rawMarkdown: "", model: res.model };
}
