import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/db/repository";
import { ServiceError } from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 从项目移除资源（S1.55）；只删关系，不删真实资源 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const { id, resourceId } = await ctx.params;
    const rel = repo.getProjectResourceByPair(id, resourceId);
    if (!rel) throw new ServiceError("NOT_FOUND", "该资源未关联到此项目");
    repo.deleteProjectResource(rel.id);
    return NextResponse.json(rel);
  } catch (e) {
    return handleError(e);
  }
}
