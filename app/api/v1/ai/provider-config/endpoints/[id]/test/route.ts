/**
 * POST /api/v1/ai/provider-config/endpoints/[id]/test
 * 测试指定端点连接（真实调用一次 LLM），成功时顺带返回可用模型列表
 */
import { NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ result: await service.testProviderEndpoint(id) });
  } catch (e) {
    return handleError(e);
  }
}
