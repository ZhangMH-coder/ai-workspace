/**
 * POST /api/v1/ai/provider-config/endpoints
 * 新增 LLM Provider 端点（Key 加密存储）
 */
import { NextRequest, NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: unknown;
      baseUrl?: unknown;
      model?: unknown;
      apiKey?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : undefined;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : undefined;
    if (!name) throw new service.ServiceError("VALIDATION_ERROR", "端点名称不能为空");
    if (!baseUrl) throw new service.ServiceError("VALIDATION_ERROR", "Base URL 不能为空");
    const view = service.createProviderEndpoint({ name, baseUrl, model, apiKey });
    return NextResponse.json({ endpoint: view }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
