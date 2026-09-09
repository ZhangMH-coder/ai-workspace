import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/**
 * 任务计划生成：POST { analysisId } → TaskPlan（幂等：同 analysisId 复用已有计划）
 * 只负责「如何组织能力」，不产生任何执行语义。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { analysisId?: string };
    if (typeof body.analysisId !== "string" || body.analysisId.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "analysisId 不能为空" } },
        { status: 400 }
      );
    }
    const result = service.createPlanFromAnalysis(body.analysisId);
    return NextResponse.json({
      ...result.plan,
      reused: result.reused,
    });
  } catch (e) {
    return handleError(e);
  }
}
