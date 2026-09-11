/**
 * GET /api/v1/resource-discovery/hidden
 * 列出用户已隐藏的资源（sourcePath + 隐藏时间），供 Settings 恢复管理。
 */
import { NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET() {
  try {
    const items = service.listHiddenResources();
    return NextResponse.json({ items });
  } catch (e) {
    return handleError(e);
  }
}
