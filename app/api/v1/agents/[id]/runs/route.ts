import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/db/repository";
import * as service from "@/db/service";
import { ServiceError } from "@/db/service";
import { handleError, pageMeta, parseSort, parseIntParam, parseTimeRange } from "@/lib/api/server";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!repo.getAgent(id)) throw new ServiceError("NOT_FOUND", "Agent 不存在");
    const sp = req.nextUrl.searchParams;
    const page = parseIntParam(sp.get("page"), 1, 10_000);
    const pageSize = parseIntParam(sp.get("pageSize"), 100, 100);
    const range = parseTimeRange(sp);
    const sort = parseSort(sp.get("sort"), ["startedAt"]);
    const { items, total } = repo.listRuns(
      { agentIds: [id], from: range.from, to: range.to, status: sp.get("status") ?? undefined, sort },
      { page, pageSize }
    );
    return NextResponse.json({ items, ...pageMeta(page, pageSize, total) });
  } catch (e) {
    return handleError(e);
  }
}

/** 触发运行（S1.30 起经 Runtime 真实 LLM 执行；input 为给 Agent 的指令） */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { input?: string };
    const run = await service.runAgent(id, typeof body.input === "string" ? body.input : "");
    return NextResponse.json(run, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
