/**
 * Mock 服务层（Phase 2 → P5-2）
 *
 * 设计意图：界面层只依赖这里的 async 函数，不直接接触数据源。
 * 未来接入真实后端时，仅需将本文件替换为 HTTP 客户端实现，
 * 函数签名与返回类型保持不变，store 与组件零改动。
 *
 * P5-2：runAgent 改经 Mock Runtime 编排执行（与 Real 同构），
 * 不再在服务层直接随机造数；Mock 装配为静态 seed（Mock 不持有装配状态）。
 */
import { seedAgents, seedAgentCapabilities, seedCapabilityDefinitions } from "@/lib/mock-data/seed";
import type { Agent, AgentRun, NewAgentInput } from "@/lib/types";
import { DEFAULT_MODEL_CONFIG } from "@/lib/runtime/contracts";
import type { CapabilitySource } from "@/lib/runtime/contracts";
import { createProviderRegistry, createRuntime } from "@/lib/runtime/runtime";
import { mockProvider } from "@/lib/runtime/mock-provider";
import { mockState, pushRun } from "./state";

/** 模拟网络延迟（ms） */
const LATENCY_MS = 260;
const RUN_LATENCY_MS = 1_400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Mock 模式 CapabilitySource（静态 seed 装配；Definition + AgentCapability 两层只读） */
const mockCapabilitySource: CapabilitySource = {
  getAgent(agentId) {
    const a = seedAgents.find((x) => x.id === agentId);
    if (!a) return null;
    return { id: a.id, name: a.name, systemPrompt: a.systemPrompt, model: a.model };
  },
  listAssemblies(agentId) {
    return seedAgentCapabilities
      .filter((ac) => ac.agentId === agentId)
      .map((ac) => {
        const d = seedCapabilityDefinitions.find((x) => x.id === ac.capabilityId);
        return {
          capabilityId: ac.capabilityId,
          enabled: ac.enabled,
          type: d?.type ?? "",
          name: d?.name ?? "",
          description: d?.description ?? "",
          lifecycle: d?.lifecycle ?? "active",
        };
      });
  },
};

const mockRuntime = createRuntime({
  source: mockCapabilitySource,
  providers: createProviderRegistry({ mock: mockProvider }),
});

/** 获取全部智能体 */
export async function fetchAgents(): Promise<Agent[]> {
  await delay(LATENCY_MS);
  return seedAgents.map((a) => ({ ...a }));
}

/** 某 Agent 的运行历史明细（详情页场景；统计不依赖此数据） */
export async function fetchAgentRuns(agentId: string): Promise<AgentRun[]> {
  await delay(LATENCY_MS);
  return mockState.runs
    .filter((r) => r.agentId === agentId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
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

/**
 * 触发一次模拟运行（P5-2：经 Mock Runtime 编排执行 → MockProvider → RuntimeResult）
 * 执行链与 Real 同构：Service/MockService → Runtime.execute → MockProvider.execute
 * → RuntimeResult → 组装 Run → pushRun（Mock 内存数据层）
 */
export async function runAgent(agentId: string, agentName: string, input?: string): Promise<AgentRun> {
  await delay(RUN_LATENCY_MS);
  const startedAt = Date.now();
  const runId = uid("run");
  const agent = seedAgents.find((a) => a.id === agentId);

  const result = await mockRuntime.execute({
    runId,
    agentId,
    input: input ?? "",
    modelConfig: { ...DEFAULT_MODEL_CONFIG, model: agent?.model ?? "doubao-pro" },
    source: "ui",
  });

  const run: AgentRun = {
    id: runId,
    agentId,
    status: result.status,
    durationMs: result.durationMs,
    tokensUsed: result.usage.totalTokens,
    messages: 3 + Math.floor(Math.random() * 10),
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(startedAt + result.durationMs).toISOString(),
    summary:
      result.status === "succeeded"
        ? `「${agentName}」完成一次运行，输出 ${result.usage.totalTokens} tokens`
        : `「${agentName}」运行中断：${result.error?.message ?? "模拟上游超时"}`,
    // S1.31：Mock 输出落库（与 Real 同构）
    output: result.output ?? null,
  };
  // 同步到 Mock 内存数据层，统计聚合（mock/runs.ts）才能反映本次运行
  pushRun(run);
  return run;
}
