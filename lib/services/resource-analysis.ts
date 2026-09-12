/**
 * Resource Intelligence Service 入口（仅 Real：HTTP → Route Handler → SQLite）
 */
export {
  fetchAnalysisStatus,
  runAnalysis,
  fetchResourceInsight,
  fetchCapabilityIndex,
  matchResourcesForTask,
} from "@/lib/api/resource-analysis";