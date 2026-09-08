/**
 * Project Service（Phase 3 第五阶段：Projects 最小业务闭环）
 *
 * 数据边界设计：
 * - `Project` 是「业务组织上下文」，只维护关系，不持有 Agent/Capability/Run 数据副本；
 * - `ProjectAgent` 是「项目 ↔ Agent 关联」（多对多中介），只引用 agentId；
 * - 界面层只依赖本文件提供的 async 函数与 lib/types 契约，
 *   未来接入真实 API 时仅替换本文件实现，store/组件零改动。
 *
 * 写操作契约（贴近未来 REST 语义）：
 * - createProject(input)               → POST /projects
 * - attachAgentToProject(input)        → POST /project-agents
 * - detachAgentFromProject(id)         → DELETE /project-agents/:id
 * - fetchProjects()                    → GET /projects
 * - fetchProjectAgents(projectId)      → GET /projects/:id/agents
 */
import {
  seedProjectAgents,
  seedProjects,
} from "@/lib/mock-data/seed";
import type {
  NewProjectInput,
  Project,
  ProjectAgent,
} from "@/lib/types";

const LATENCY_MS = 220;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/** 获取全部项目 */
export async function fetchProjects(): Promise<Project[]> {
  await delay(LATENCY_MS);
  return seedProjects.map((p) => ({ ...p }));
}

/** 获取指定项目的 Agent 关联关系 */
export async function fetchProjectAgents(
  projectId: string
): Promise<ProjectAgent[]> {
  await delay(LATENCY_MS);
  return seedProjectAgents
    .filter((pa) => pa.projectId === projectId)
    .map((pa) => ({ ...pa }));
}

/* ---------- 写操作（Mock：只做往返与实体构造，不持有状态；落地唯一入口是 Store actions） ---------- */

/** 创建项目（默认 status=active） */
export async function createProject(
  input: NewProjectInput
): Promise<Project> {
  await delay(LATENCY_MS);
  const nowIso = new Date().toISOString();
  return {
    id: uid("prj"),
    name: input.name,
    description: input.description,
    status: "active",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/** 关联一个 Agent 到项目（返回新关系；重复关联由调用方幂等处理） */
export async function attachAgentToProject(input: {
  projectId: string;
  agentId: string;
}): Promise<ProjectAgent> {
  await delay(LATENCY_MS);
  return {
    id: uid("pa"),
    projectId: input.projectId,
    agentId: input.agentId,
    addedAt: new Date().toISOString(),
  };
}

/** 解除 Agent 关联 */
export async function detachAgentFromProject(id: string): Promise<void> {
  await delay(LATENCY_MS);
  void id;
}
