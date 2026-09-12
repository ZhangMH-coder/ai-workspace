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
} from "./http/projects";