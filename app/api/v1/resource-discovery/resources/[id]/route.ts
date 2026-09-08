/**
 * GET /api/v1/resource-discovery/resources/[id]
 * 资源详情：真实来源路径 + 元数据摘要（可溯源到原始文件）。
 */
import { NextRequest, NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json(service.getDiscoveredResource(id));
  } catch (e) {
    return handleError(e);
  }
}
