/**
 * POST/DELETE /api/v1/resource-discovery/resources/[id]/hidden
 *
 * 用户级资源隐藏（展示排除）：
 * - POST   隐藏：按资源 id 取其 sourcePath 写入 user_hidden_resource（幂等）
 * - DELETE 恢复：按资源 id 的 sourcePath 删除隐藏记录（幂等）
 *
 * 原始 Harness 文件严格只读；列表查询自动过滤隐藏项（见 repository.listDiscoveredResources）。
 */
import { NextRequest, NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** GET：查询资源当前是否被隐藏（详情页展示状态用） */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json({ hidden: service.isResourceHidden(id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hidden = service.hideResource(id);
    return NextResponse.json({ hidden });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = service.unhideResource(id);
    return NextResponse.json({ unhidden: result });
  } catch (e) {
    return handleError(e);
  }
}
