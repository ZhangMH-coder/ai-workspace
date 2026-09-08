/**
 * Demo Reset Service — 入口（双模式）
 *
 * - Real：POST /api/v1/demo/reset（SQLite 清业务表 + 重跑 seed）
 * - Mock：no-op（seed 为常量，Store 重新 fetchAll 即重置）
 * Store 在调用后统一重新拉取全量数据。
 */
import { http } from "@/lib/api/client";
import { USE_MOCK } from "./mode";

async function mockResetDemoData(): Promise<void> {
  // Mock 模式数据来自 seed 常量，无需服务端重置
}

async function httpResetDemoData(): Promise<void> {
  await http.post("/demo/reset");
}

export const resetDemoData = USE_MOCK ? mockResetDemoData : httpResetDemoData;
