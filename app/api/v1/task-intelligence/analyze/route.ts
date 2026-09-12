import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/**
 * 任务分析：POST { task, strategy? } → RecommendationPlan（只选什么，不执行）。
 * strategy = "heuristic" 走纯启发式；默认 / "llm-assisted" 在启发式基础上用 LLM 增强推断字段（LLM 未配置时静默回退）。
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      task?: string;
      strategy?: string;
    };
    if (typeof body.task !== "string" || body.task.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "任务文本不能为空" } },
        { status: 400 }
      );
    }
    const result =
      body.strategy === "heuristic"
        ? await service.analyzeTask(body.task)
        : await service.analyzeTaskWithLLM(body.task);
    return NextResponse.json({
      ...result.plan,
      reused: result.reused,
    });
  } catch (e) {
    return handleError(e);
  }
}
