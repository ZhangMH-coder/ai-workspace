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

export function runAgent(agentId: string) {
  const agent = repo.getAgent(agentId);
  if (!agent) throw new ServiceError("NOT_FOUND", "Agent 不存在");
  const now = Date.now();
  const durationMs = 8_000 + Math.floor(Math.random() * 220_000);
  const status = Math.random() <= 0.86 ? "success" : "failed";
  const run = repo.insertRun({
    id: randomUUID(),
    agentId,
    status,
    summary:
      status === "success"
        ? "完成一次运行任务，结果已汇总"
        : "运行中断：上游服务超时，已记录日志",
    durationMs,
    tokensUsed: 900 + Math.floor(Math.random() * 38_000),
    messages: 3 + Math.floor(Math.random() * 14),
    startedAt: new Date(now).toISOString(),
    finishedAt: new Date(now + durationMs).toISOString(),
  });
  repo.updateAgent(agentId, { lastRunAt: new Date(now).toISOString() });
  return run;
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
