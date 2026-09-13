/**
 * Projects Service — 入口（仅 Real：HTTP + SQLite）
 */
export {
  fetchProjects,
  fetchProjectAgents,
  fetchAllProjectAgents,
  createProject,
  attachAgentToProject,
  detachAgentFromProject,
  // S1.55：项目 × 真实资源
  fetchProjectResources,
  attachResourcesToProject,
  detachResourceFromProject,
} from "./http/projects";
