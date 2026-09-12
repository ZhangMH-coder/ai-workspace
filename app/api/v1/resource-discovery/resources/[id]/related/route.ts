import { NextRequest, NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 相关资源推荐：GET /resource-discovery/resources/[id]/related（真实派生，只读） */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = service.getRelatedResources(id);
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
