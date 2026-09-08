import { NextRequest, NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/**
 * 演示数据重置（P4-2d）：清空业务表 + 重跑 Seed（保留 migration 历史）
 * 前端 resetDemoData 在 Real 模式下调用本端点，不再作为领域数据第二来源。
 */
export async function POST(req: NextRequest) {
  void req;
  try {
    const counts = service.resetDemo();
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    return handleError(e);
  }
}
