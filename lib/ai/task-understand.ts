/**
 * LLM 任务理解（场景 A：任务分析增强）
 *
 * 仅覆盖「推断字段」：taskType / summary。
 * 能力需求与推荐仍由 Heuristic 管线生成（保持检索分数与证据链真实可追溯）。
 * LLM 失败 / 未配置时返回 null，由调用方回退 Heuristic，不影响主流程。
 */
import { chatCompletion } from "./client";
import type { LLMConfig } from "./config";

export const TASK_TYPE_IDS = [
  "content_creation",
  "text_summary",
  "web_research",
  "data_analysis",
  "code_gen",
  "automation",
  "dev_tool",
  "other",
] as const;

export interface LlmTaskUnderstanding {
  taskType: string;
  summary: string;
}

const SYSTEM_PROMPT = `你是 AI Workspace 的任务理解引擎。你的职责是判断用户任务属于哪一类，并给出简洁摘要。

任务类型只能是以下之一：
content_creation（内容创作）
text_summary（文本摘要）
web_research（网络研究）
data_analysis（数据分析）
code_gen（代码生成）
automation（自动化流程）
dev_tool（开发工具使用）
other（其他）

严格输出 JSON，不要输出任何其他内容：
{"taskType":"<类型ID>","summary":"<一句话中文摘要，不超过60字>"}`;

function parseUnderstanding(text: string): LlmTaskUnderstanding | null {
  let raw = text.trim();
  // 去除可能的 ```json 包裹
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as {
      taskType?: unknown;
      summary?: unknown;
    };
    const taskType =
      typeof j.taskType === "string" && (TASK_TYPE_IDS as readonly string[]).includes(j.taskType)
        ? j.taskType
        : "other";
    const summary = typeof j.summary === "string" ? j.summary.trim().slice(0, 200) : "";
    if (!summary) return null;
    return { taskType, summary };
  } catch {
    return null;
  }
}

/**
 * 尝试用 LLM 理解任务；任何失败（未配置 / 超时 / 解析失败）均返回 null，
 * 由调用方静默回退 Heuristic 管线。
 */
export async function llmUnderstandTask(
  task: string,
  config: LLMConfig
): Promise<LlmTaskUnderstanding | null> {
  try {
    const res = await chatCompletion(
      {
        temperature: 0.2,
        maxTokens: 300,
        timeoutMs: 20_000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `任务：${task}` },
        ],
      },
      config
    );
    return parseUnderstanding(res.text);
  } catch {
    return null;
  }
}
