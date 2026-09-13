/**
 * GET /api/v1/resource-discovery/resources/[id]/adjacent
 * 详情上一条 / 下一条导航（同列表排序：last_modified DESC, name ASC；排除隐藏）。
 */
import { NextRequest, NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(service.getAdjacentResources(id));
  } catch (e) {
    return handleError(e);
  }
}
