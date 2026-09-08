/**
 * Projects Service — HTTP 实现（P4-2c）
 *
 * 同名函数契约；项目统计保持「ProjectAgent → Agent → Run」派生（Run 无 projectId）。
 */
import { http } from "@/lib/api/client";
import type { PageDTO, ProjectAgentDTO, ProjectDTO } from "@/lib/api/dto";
import { toProject, toProjectAgent } from "@/lib/api/mappers";
import type { NewProjectInput, Project, ProjectAgent } from "@/lib/types";

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
