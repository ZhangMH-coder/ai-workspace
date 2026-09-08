/**
 * Service 层（P4-2b）
 *
 * 职责：业务规则（生命周期校验 / 幂等 / 派生统计 / 演示运行时）。
 * - 不写 SQL（走 Repository）；不抛 HTTP 语义（抛 ServiceError，由 Route Handler 映射 ApiError）
 * - 所有 ID 由服务端生成（UUID v4）；前端不生成业务 id
 *
 * 领域规则（对齐已验收规则）：
 * - Capability 生命周期（active/archived）与使用状态（used/unused，派生）分离
 * - 归档 = 软删除：不影响已有装配；归档后不可新装配；恢复后重新可装配
 * - 项目统计全部派生（ProjectAgent → Agent → Run），Run 无 projectId
 * - 时间窗口：服务端只接受显式 from/to，纯执行（前端唯一窗口实现）
 */
import { randomUUID } from "node:crypto";
import * as repo from "./repository";
import { clearAll, runSeed } from "./seed";
import { canTransition } from "@/lib/runtime/contracts";
import type { CapabilitySource, RunLifecycleStatus, RuntimeRequest } from "@/lib/runtime/contracts";
import { createRuntime, createProviderRegistry } from "@/lib/runtime/runtime";
import { mockProvider } from "@/lib/runtime/mock-provider";

/** 统一内部错误（code 对齐 ApiErrorCode；CONFLICT 语义由具体业务触发） */
export class ServiceError extends Error {
  constructor(
    public code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

/** 归一化任意可解析时间为 UTC ISO 字符串（保证存储与查询边界统一比较） */
export function normalizeISO(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ServiceError("VALIDATION_ERROR", `无效时间值: ${value}`);
  }
  return d.toISOString();
}

/* ---------------- Agent ---------------- */

export interface CreateAgentInput {
  name: string;
  description?: string;
  model: string;
  systemPrompt?: string;
}

export function createAgent(input: CreateAgentInput) {
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    name: input.name,
    description: input.description ?? "",
    model: input.model,
    status: "idle",
    systemPrompt: input.systemPrompt ?? "",
    createdAt: now,
    lastRunAt: null,
  };
  return repo.insertAgent(row);
}

/* ================= AI Runtime（P5-2） ================= */

/**
 * Real 模式 CapabilitySource：SQLite 为事实数据源（Repository 查询）。
 * Runtime 经此接口只读消费 Definition(资产) + AgentCapability(装配)。
 */
const realCapabilitySource: CapabilitySource = {
  getAgent(agentId) {
    const a = repo.getAgent(agentId);
    if (!a) return null;
    return { id: a.id, name: a.name, systemPrompt: a.systemPrompt, model: a.model };
  },
  listAssemblies(agentId) {
    return repo.listRuntimeAssemblies(agentId);
  },
};

/** P5-2 唯一 Provider 注册表（mock）；未来 Adapter 在此注册 */
const realRuntime = createRuntime({
  source: realCapabilitySource,
  providers: createProviderRegistry({ mock: mockProvider }),
});

/**
 * 触发 Agent 运行（P5-2 起经 Runtime 编排执行，不再直接随机造数）
 *
 * 执行链：Service.runAgent → Runtime.execute → MockProvider.execute
 *         → RuntimeResult → Service 状态迁移 + 持久化 Run
 *
 * 状态机：queued → running → succeeded|failed|cancelled；
 * 非法转换（succeeded→running 等）在 Service 层拦截（CONFLICT）。
 */
export async function runAgent(agentId: string, input?: string) {
  const agent = repo.getAgent(agentId);
  if (!agent) throw new ServiceError("NOT_FOUND", "Agent 不存在");

  const nowIso = new Date().toISOString();
  const now = Date.now();

  // 并发约束：同一 Agent 存在 queued/running 时拒绝（409）
  const active = repo.listRuns(
    { agentIds: [agentId], status: "queued" },
    { page: 1, pageSize: 1 }
  );
  const active2 = repo.listRuns(
    { agentIds: [agentId], status: "running" },
    { page: 1, pageSize: 1 }
  );
  if (active.total + active2.total > 0) {
    throw new ServiceError("CONFLICT", "该 Agent 已有运行中的任务，请稍后再试");
  }

  // 1) 创建 Run（queued）
  const runId = randomUUID();
  repo.insertRun({
    id: runId,
    agentId,
    status: "queued",
    summary: "任务已排队，等待调度",
    durationMs: null,
    tokensUsed: 0,
    messages: 0,
    startedAt: nowIso,
    finishedAt: null,
  });

  // 2) queued → running（同步执行：先置 running 再执行）
  const running = repo.updateRun(runId, { status: "running" });
  if (!running) throw new ServiceError("NOT_FOUND", "Run 不存在");

  // 3) Runtime 编排执行（Provider 选择在 Runtime 内部，Service 不接触 Provider）
  const req: RuntimeRequest = {
    runId,
    agentId,
    input: input ?? "",
    modelConfig: { provider: "mock", model: agent.model, temperature: 0.7, maxTokens: 4096, timeoutMs: 120_000, retry: { maxAttempts: 2, backoffMs: 1_000 } },
    source: "ui",
  };
  const result = await realRuntime.execute(req);

  // 4) 状态迁移校验（running → 终态；非法转换拦截）
  const target = result.status as RunLifecycleStatus;
  if (!canTransition("running", target)) {
    throw new ServiceError("CONFLICT", `非法状态转换: running → ${target}`);
  }

  // 5) 终态落库（含 usage / model / provider / error）
  const finished = new Date(now + result.durationMs).toISOString();
  repo.updateRun(runId, {
    status: target,
    summary: result.summary,
    durationMs: result.durationMs,
    tokensUsed: result.usage.totalTokens,
    finishedAt: finished,
    model: agent.model,
    provider: "mock",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    errorCode: result.error?.code,
    errorMessage: result.error?.message,
  });

  // 6) 更新 Agent lastRunAt
  repo.updateAgent(agentId, { lastRunAt: nowIso });

  return repo.getRun(runId);
}

/* ---------------- CapabilityDefinition ---------------- */

export type CapabilityType = "skill" | "memory" | "rule" | "tool";
export type CapabilityLifecycle = "active" | "archived";

export interface CreateCapabilityInput {
  type: CapabilityType;
  name: string;
  description?: string;
}

export function createCapability(input: CreateCapabilityInput) {
  const now = new Date().toISOString();
  return repo.insertCapabilityDefinition({
    id: randomUUID(),
    type: input.type,
    name: input.name,
    description: input.description ?? "",
    lifecycle: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export function updateCapability(id: string, patch: { name?: string; description?: string; type?: CapabilityType }) {
  const existing = repo.getCapabilityDefinition(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "Capability 不存在");
  const updated = repo.updateCapabilityDefinition(id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

export function setCapabilityLifecycle(id: string, lifecycle: CapabilityLifecycle) {
  const existing = repo.getCapabilityDefinition(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "Capability 不存在");
  return repo.updateCapabilityDefinition(id, {
    lifecycle,
    updatedAt: new Date().toISOString(),
  });
}

/* ---------------- AgentCapability ---------------- */

export function attachCapability(agentId: string, capabilityId: string) {
  if (!repo.getAgent(agentId)) throw new ServiceError("NOT_FOUND", "Agent 不存在");
  const definition = repo.getCapabilityDefinition(capabilityId);
  if (!definition) throw new ServiceError("NOT_FOUND", "Capability 不存在");
  // 归档后不可新装配（领域规则；已装配的不受影响）
  if (definition.lifecycle === "archived") {
    throw new ServiceError("CONFLICT", "该 Capability 已归档，不能装配到新 Agent");
  }
  if (repo.getAgentCapabilityByPair(agentId, capabilityId)) {
    throw new ServiceError("CONFLICT", "该 Capability 已装配到此 Agent");
  }
  return repo.insertAgentCapability({
    id: randomUUID(),
    agentId,
    capabilityId,
    enabled: true,
    createdAt: new Date().toISOString(),
  });
}

export function setCapabilityEnabled(id: string, enabled: boolean) {
  const existing = repo.getAgentCapability(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "装配关系不存在");
  return repo.updateAgentCapability(id, { enabled });
}

export function detachCapability(id: string) {
  const existing = repo.getAgentCapability(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "装配关系不存在");
  repo.deleteAgentCapability(id);
  return existing;
}

/* ---------------- Project ---------------- */

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export function createProject(input: CreateProjectInput) {
  const now = new Date().toISOString();
  return repo.insertProject({
    id: randomUUID(),
    name: input.name,
    description: input.description ?? "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

export function attachAgentToProject(projectId: string, agentId: string) {
  if (!repo.getProject(projectId)) throw new ServiceError("NOT_FOUND", "Project 不存在");
  if (!repo.getAgent(agentId)) throw new ServiceError("NOT_FOUND", "Agent 不存在");
  if (repo.getProjectAgentByPair(projectId, agentId)) {
    throw new ServiceError("CONFLICT", "该 Agent 已关联到此项目");
  }
  return repo.insertProjectAgent({
    id: randomUUID(),
    projectId,
    agentId,
    addedAt: new Date().toISOString(),
  });
}

export function detachAgentFromProject(id: string) {
  const existing = repo.getProjectAgent(id);
  if (!existing) throw new ServiceError("NOT_FOUND", "关联关系不存在");
  repo.deleteProjectAgent(id);
  return existing;
}

/* ---------------- Demo Reset ---------------- */

export function resetDemo() {
  clearAll();
  return runSeed();
}
