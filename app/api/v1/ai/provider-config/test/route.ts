/**
 * POST /api/v1/ai/provider-config/test
 *
 * 连接测试：用当前生效配置真实调用一次 LLM，返回延迟 / 模型 / 错误信息。
 * 未配置 Key 时返回 ok:false（不是 501），页面如实展示。
 */
import { NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function POST() {
  try {
    const result = await service.testLLMProviderConfig();
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
