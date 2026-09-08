/**
 * GET /api/v1/resource-discovery/overview
 * 资源发现概览（最新一次扫描：汇总 + Harness 清单 + 数量）。
 * 从未扫描时返回结构化空态（scanRun=null），供前端展示"未发现/未扫描"。
 */
import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET() {
  try {
    return NextResponse.json(service.getDiscoveryOverview());
  } catch (e) {
    return handleError(e);
  }
}
