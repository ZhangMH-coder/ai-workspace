/**
 * Mock 服务层（Phase 2）
 *
 * 设计意图：界面层只依赖这里的 async 函数，不直接接触数据源。
 * 未来接入真实后端时，仅需将本文件替换为 HTTP 客户端实现，
 * 函数签名与返回类型保持不变，store 与组件零改动。
 */
import { seedAgents, seedRuns } from "@/lib/mock-data/seed";
import type { Agent, AgentRun, NewAgentInput } from "@/lib/types";

/** 模拟网络延迟（ms） */
const LATENCY_MS = 260;
const RUN_LATENCY_MS = 1_400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 获取全部智能体 */
export async function fetchAgents(): Promise<Agent[]> {
  await delay(LATENCY_MS);
  return seedAgents.map((a) => ({ ...a }));
}

/** 获取全部运行记录（已按开始时间倒序） */
export async function fetchRuns(): Promise<AgentRun[]> {
  await delay(LATENCY_MS);
  return seedRuns.map((r) => ({ ...r }));
}

/** 新建智能体 */
export async function createAgent(input: NewAgentInput): Promise<Agent> {
  await delay(LATENCY_MS);
  const agent: Agent = {
    id: uid("agent"),
    name: input.name.trim(),
    description: input.description.trim() || "暂无描述",
    model: input.model,
    status: "idle",
    systemPrompt: input.systemPrompt.trim() || "你是我的 AI 工作助手。",
    createdAt: new Date().toISOString(),
    lastRunAt: null,
  };
  return agent;
}

/** 触发一次模拟运行：返回新产生的运行记录 */
export async function runAgent(agentId: string, agentName: string): Promise<AgentRun> {
  await delay(RUN_LATENCY_MS);
  const startedAt = Date.now();
  // 演示：90% 成功
  const success = Math.random() > 0.1;
  const durationMs = 12_000 + Math.floor(Math.random() * 210_000);
  const tokensUsed = 1_200 + Math.floor(Math.random() * 32_000);
  const messages = 3 + Math.floor(Math.random() * 10);
  const run: AgentRun = {
    id: uid("run"),
    agentId,
    status: success ? "success" : "failed",
    durationMs,
    tokensUsed,
    messages,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(startedAt + durationMs).toISOString(),
    summary: success
      ? `「${agentName}」完成一次运行，输出 ${messages} 条消息`
      : `「${agentName}」运行中断：模拟上游超时`,
  };
  return run;
}
