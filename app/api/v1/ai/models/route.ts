import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 可用模型列表：GET /api/v1/ai/models（基于当前生效 Provider 配置，真实拉取端点 /models） */
export async function GET() {
  try {
    return NextResponse.json(await service.listAvailableLLMModels());
  } catch (e) {
    return handleError(e);
  }
}
