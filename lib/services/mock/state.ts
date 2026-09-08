/**
 * Mock 内存数据层（P4-3）
 *
 * Mock 模式下统计由 Service 直接聚合（与 Real 的 SQLite 聚合同构），
 * 因此写操作必须在 Mock 侧落地，聚合才能反映最新状态：
 * - mock/agents.ts 的 runAgent → pushRun
 * - mock/projects.ts 的 create/attach/detach → 同步 projects / projectAgents
 * - resetDemoData → resetMockState()（与 Real 的 db:reset 语义对齐）
 *
 * 仅 Mock 模式持有；Store 仍是 UI 唯一数据源暴露层。
 */
import { seedProjectAgents, seedProjects, seedRuns } from "@/lib/mock-data/seed";
import type { AgentRun, Project, ProjectAgent } from "@/lib/types";

export const mockState: {
  runs: AgentRun[];
  projects: Project[];
  projectAgents: ProjectAgent[];
} = {
  runs: seedRuns.map((r) => ({ ...r })),
  projects: seedProjects.map((p) => ({ ...p })),
  projectAgents: seedProjectAgents.map((pa) => ({ ...pa })),
};

export function pushRun(run: AgentRun): void {
  mockState.runs.unshift(run);
}

export function resetMockState(): void {
  mockState.runs = seedRuns.map((r) => ({ ...r }));
  mockState.projects = seedProjects.map((p) => ({ ...p }));
  mockState.projectAgents = seedProjectAgents.map((pa) => ({ ...pa }));
}
