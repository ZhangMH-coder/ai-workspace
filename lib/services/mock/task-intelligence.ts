/**
 * Mock 模式 Task Intelligence 服务（真实空态，不伪造分析结果）
 * - analyze：无真实资源 → 抛 ApiError（前端按 code 分支展示）
 * - analyses：空列表
 */
import { ApiError } from "@/lib/api/errors";
import type { TaskAnalysisListItemDTO } from "@/lib/api/task-intelligence";

export async function analyzeTaskMock(): Promise<never> {
  throw new ApiError(400, {
    code: "NOT_FOUND",
    message: "Mock 模式无真实资源，无法执行任务分析",
  });
}

export async function fetchTaskAnalysesMock(): Promise<TaskAnalysisListItemDTO[]> {
  return [];
}

export async function fetchTaskAnalysisMock(): Promise<never> {
  throw new ApiError(404, { code: "NOT_FOUND", message: "Mock 模式无任务分析记录" });
}
