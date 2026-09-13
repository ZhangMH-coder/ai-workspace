/**
 * POST /api/v1/ai/provider-config/endpoints/[id]/activate
 * 将指定端点设为默认（当前生效）
 */
import { NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ endpoint: service.activateProviderEndpoint(id) });
  } catch (e) {
    return handleError(e);
  }
}
