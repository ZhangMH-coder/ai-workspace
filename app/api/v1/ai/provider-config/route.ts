/**
 * /api/v1/ai/provider-config
 *
 * LLM Provider 配置（S1.20）：
 * - GET    读取当前生效配置（Key 仅回显掩码）
 * - PUT    保存手动配置（baseUrl / model / apiKey；apiKey 传空 = 不修改）
 * - DELETE 清除手动配置，恢复自动发现
 */
import { NextRequest, NextResponse } from "next/server";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET() {
  try {
    return NextResponse.json(service.getLLMProviderConfigView());
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      baseUrl?: unknown;
      model?: unknown;
      apiKey?: unknown;
    };
    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl : undefined;
    const model = typeof body.model === "string" ? body.model : undefined;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;
    service.saveLLMProviderConfig({ baseUrl, model, apiKey });
    return NextResponse.json(service.getLLMProviderConfigView());
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    service.clearLLMProviderConfig();
    return NextResponse.json(service.getLLMProviderConfigView());
  } catch (e) {
    return handleError(e);
  }
}
