import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 按分析查询其当前计划：GET /analyses/[id]/plan（未生成时 404，前端据此显示「生成计划」入口） */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const plan = service.getPlanByAnalysis(id);
    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "该分析尚未生成任务计划" } },
        { status: 404 }
      );
    }
    return NextResponse.json(plan);
  } catch (e) {
    return handleError(e);
  }
}
