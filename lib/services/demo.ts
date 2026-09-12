/**
 * Demo Reset Service — 入口（仅 Real）
 *
 * POST /api/v1/demo/reset：SQLite 清业务表 + 重跑 seed（seed 已不种任何演示数据）。
 * Store 在调用后统一重新拉取全量数据。
 */
import { http } from "@/lib/api/client";

export async function resetDemoData(): Promise<void> {
  await http.post("/demo/reset");
}