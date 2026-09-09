import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 增量分析：body { force?, resourceIds? }；指纹相同跳过 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { force?: boolean; resourceIds?: string[] };
    const result = service.runIncrementalAnalysis({
      force: Boolean(body.force),
      resourceIds: Array.isArray(body.resourceIds) ? body.resourceIds : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
