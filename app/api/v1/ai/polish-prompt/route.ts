/**
 * POST /api/v1/ai/polish-prompt
 *
 * 系统提示词润色（S1.44）：调用当前生效 LLM 端点，把草稿润色为专业 system prompt。
 * - 空输入 → 400 VALIDATION_ERROR
 * - 未配置 LLM Key → 501 LLM_NOT_CONFIGURED（前端如实提示，不伪造）
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

const bodySchema = z.object({
  prompt: z.string().max(4000, "系统提示词过长（上限 4000 字符）"),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const result = await service.polishSystemPrompt(body.prompt);
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
