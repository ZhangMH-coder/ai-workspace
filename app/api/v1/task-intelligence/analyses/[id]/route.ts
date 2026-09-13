import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 单次任务分析详情：GET /[id] */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const plan = service.getTaskAnalysis(id);
    if (!plan) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "任务分析记录不存在" } },
        { status: 404 }
      );
    }
    return NextResponse.json(plan);
  } catch (e) {
    return handleError(e);
  }
}

/** 删除单条历史：DELETE /[id]（连带需求/推荐/计划；当前展示态由前端同步） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    service.deleteTaskAnalysis(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
