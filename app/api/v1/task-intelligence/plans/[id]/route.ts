import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 单次任务计划详情：GET /plans/[id]（含步骤 + 依赖 + 校验结果） */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const plan = service.getPlan(id);
    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "任务计划不存在" } },
        { status: 404 }
      );
    }
    return NextResponse.json(plan);
  } catch (e) {
    return handleError(e);
  }
}
