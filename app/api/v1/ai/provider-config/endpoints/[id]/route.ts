/**
 * /api/v1/ai/provider-config/endpoints/[id]
 * - PUT    更新端点（name / baseUrl / model；apiKey 传空=清空 Key，未传=不改）
 * - DELETE 删除端点（删除默认端点后其余第一条自动生效）
 */
import { NextRequest, NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      name?: unknown;
      baseUrl?: unknown;
      model?: unknown;
      apiKey?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined;
    const model = typeof body.model === "string" ? body.model.trim() : undefined;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;
    const view = service.updateProviderEndpoint(id, { name, baseUrl, model, apiKey });
    return NextResponse.json({ endpoint: view });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json(service.deleteProviderEndpoint(id));
  } catch (e) {
    return handleError(e);
  }
}
