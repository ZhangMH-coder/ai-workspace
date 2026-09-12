/**
 * 技能 AI 解读（场景 B：资源详情页）
 *
 * 服务端用 LLM 总结一个真实资源的用途与用法，返回 Markdown 文本。
 * 未配置 Key 时由调用方返回 LLM_NOT_CONFIGURED（前端如实提示，不伪造）。
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

const SYSTEM_PROMPT = `你是 AI Workspace 的技能解读助手。请用简洁的中文解读下面的本地 AI 资源，输出 Markdown。

要求：
1. 以「一句话总结」开头
2. 「它能做什么」：2-4 条要点
3. 「怎么用」：2-4 条要点，直接可执行
4. 全程基于给定信息，不要编造不存在的功能
5. 总长度 200-400 字`;

export async function interpretResourceText(
  resource: ResourceForInterpret,
  config: LLMConfig
): Promise<{
  markdown: string;
  model: string;
}> {
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

  return { markdown: res.text, model: res.model };
}
