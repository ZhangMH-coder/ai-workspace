/**
 * Runs Service — 入口（双模式：Mock / HTTP）
 */
import * as mock from "./mock/runs";
import * as http from "./http/runs";
import { USE_MOCK } from "./mode";

export const fetchRunsStats = USE_MOCK ? mock.fetchRunsStats : http.fetchRunsStats;
export const fetchRecentRuns = USE_MOCK ? mock.fetchRecentRuns : http.fetchRecentRuns;
export const fetchProjectRuns = USE_MOCK ? mock.fetchProjectRuns : http.fetchProjectRuns;
export type { RunsStatsQuery } from "./http/runs";
