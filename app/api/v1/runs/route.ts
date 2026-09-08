import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/db/repository";
import { handleError, pageMeta, parseSort, parseIntParam, parseTimeRange } from "@/lib/api/server";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = parseIntParam(sp.get("page"), 1, 10_000);
    const pageSize = parseIntParam(sp.get("pageSize"), 100, 100);
    const range = parseTimeRange(sp);
    const agentIds = sp.get("agents")?.split(",").filter(Boolean);
    const projectId = sp.get("project") ?? undefined;
    const sort = parseSort(sp.get("sort"), ["startedAt"]);
    const { items, total } = repo.listRuns(
      {
        from: range.from,
        to: range.to,
        agentIds,
        projectId,
        status: sp.get("status") ?? undefined,
        sort,
      },
      { page, pageSize }
    );
    return NextResponse.json({ items, ...pageMeta(page, pageSize, total) });
  } catch (e) {
    return handleError(e);
  }
}
