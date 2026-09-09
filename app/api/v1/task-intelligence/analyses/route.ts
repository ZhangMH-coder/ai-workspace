import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 任务分析历史列表：GET ?limit= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(Number.parseInt(limitRaw, 10) || 20, 100) : 20;
    const rows = service.listTaskAnalyses(limit);
    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        task: r.task,
        status: r.status,
        taskType: r.taskType,
        analyzerVersion: r.analyzerVersion,
        createdAt: r.createdAt,
        analyzedAt: r.analyzedAt,
        isCurrent: r.isCurrent,
        summary: r.summary,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
