/**
 * Projects Service — HTTP 实现（P4-2c）
 *
 * 同名函数契约；项目统计保持「ProjectAgent → Agent → Run」派生（Run 无 projectId）。
 * S1.55：项目 = 使用场景，新增真实资源关联（ProjectResource 关系表）。
 */
import { http } from "@/lib/api/client";
import type {
  PageDTO,
  ProjectAgentDTO,
  ProjectDTO,
  ProjectResourceDTO,
} from "@/lib/api/dto";
import { toProject, toProjectAgent, toProjectResource } from "@/lib/api/mappers";
import type {
  NewProjectInput,
  Project,
  ProjectAgent,
  ProjectResource,
} from "@/lib/types";

export async function fetchProjects(): Promise<Project[]> {
  const page = await http.get<PageDTO<ProjectDTO>>("/projects?pageSize=100");
  return page.items.map(toProject);
}

export async function fetchProjectAgents(projectId: string): Promise<ProjectAgent[]> {
  const page = await http.get<PageDTO<ProjectAgentDTO>>(
    `/project-agents?projectId=${encodeURIComponent(projectId)}&pageSize=100`
  );
  return page.items.map(toProjectAgent);
}

export async function fetchAllProjectAgents(): Promise<ProjectAgent[]> {
  const page = await http.get<PageDTO<ProjectAgentDTO>>("/project-agents?pageSize=100");
  return page.items.map(toProjectAgent);
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const dto = await http.post<ProjectDTO>("/projects", input);
  return toProject(dto);
}

export async function attachAgentToProject(input: {
  projectId: string;
  agentId: string;
}): Promise<ProjectAgent> {
  const dto = await http.post<ProjectAgentDTO>("/project-agents", input);
  return toProjectAgent(dto);
}

export async function detachAgentFromProject(id: string): Promise<void> {
  await http.del(`/project-agents/${encodeURIComponent(id)}`);
}

/* ---------------- S1.55：项目 × 真实资源 ---------------- */

export async function fetchProjectResources(projectId: string): Promise<ProjectResource[]> {
  const page = await http.get<{ items: ProjectResourceDTO[]; total: number }>(
    `/projects/${encodeURIComponent(projectId)}/resources`
  );
  return page.items.map(toProjectResource);
}

export async function attachResourcesToProject(
  projectId: string,
  resourceIds: string[]
): Promise<ProjectResource[]> {
  const res = await http.post<{ items: ProjectResourceDTO[]; total: number }>(
    `/projects/${encodeURIComponent(projectId)}/resources`,
    { resourceIds }
  );
  return res.items.map(toProjectResource);
}

export async function detachResourceFromProject(
  projectId: string,
  resourceId: string
): Promise<void> {
  await http.del(
    `/projects/${encodeURIComponent(projectId)}/resources/${encodeURIComponent(resourceId)}`
  );
}
