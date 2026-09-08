/**
 * Projects Service — 入口（双模式：Mock / HTTP）
 */
import * as mock from "./mock/projects";
import * as http from "./http/projects";
import { USE_MOCK } from "./mode";

export const fetchProjects = USE_MOCK ? mock.fetchProjects : http.fetchProjects;
export const fetchProjectAgents = USE_MOCK
  ? mock.fetchProjectAgents
  : http.fetchProjectAgents;
export const fetchAllProjectAgents = USE_MOCK
  ? mock.fetchAllProjectAgents
  : http.fetchAllProjectAgents;
export const createProject = USE_MOCK ? mock.createProject : http.createProject;
export const attachAgentToProject = USE_MOCK
  ? mock.attachAgentToProject
  : http.attachAgentToProject;
export const detachAgentFromProject = USE_MOCK
  ? mock.detachAgentFromProject
  : http.detachAgentFromProject;
