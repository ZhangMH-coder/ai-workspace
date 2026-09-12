/**
 * POST /api/v1/resource-discovery/resources/[id]/interpret
 *
 * 技能 AI 解读（场景 B）：服务端调用真实 LLM 总结资源用途，返回 Markdown。
 * - 未配置 LLM Key → 501 LLM_NOT_CONFIGURED（前端如实提示，不伪造）
 * - 原始 Harness 文件严格只读
 */
import { NextRequest, NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const result = await service.interpretResource(id);
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
