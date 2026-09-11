/**
 * DELETE /api/v1/resource-discovery/hidden/[id]
 * Settings 恢复：按隐藏记录 id 删除隐藏状态（资源可能已不在索引中，仍可清除）。
 */
import { NextRequest, NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = service.unhideResourceRecord(id);
    return NextResponse.json({ unhidden: result });
  } catch (e) {
    return handleError(e);
  }
}
