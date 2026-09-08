/**
 * Agents Service — 入口（双模式：Mock / HTTP）
 */
import * as mock from "./mock/agents";
import * as http from "./http/agents";
import { USE_MOCK } from "./mode";

export const fetchAgents = USE_MOCK ? mock.fetchAgents : http.fetchAgents;
export const fetchRuns = USE_MOCK ? mock.fetchRuns : http.fetchRuns;
export const createAgent = USE_MOCK ? mock.createAgent : http.createAgent;
export const runAgent = USE_MOCK ? mock.runAgent : http.runAgent;
