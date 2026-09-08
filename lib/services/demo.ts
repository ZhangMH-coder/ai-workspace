/**
 * Demo Reset Service — 入口（双模式）
 *
 * - Real：POST /api/v1/demo/reset（SQLite 清业务表 + 重跑 seed）
 * - Mock：重置 Mock 内存数据层（state.ts）回 seed 初始态
 * Store 在调用后统一重新拉取全量数据。
 */
import { http } from "@/lib/api/client";
import { USE_MOCK } from "./mode";
import { resetMockState } from "./mock/state";

async function mockResetDemoData(): Promise<void> {
  resetMockState();
}

async function httpResetDemoData(): Promise<void> {
  await http.post("/demo/reset");
}

export const resetDemoData = USE_MOCK ? mockResetDemoData : httpResetDemoData;
