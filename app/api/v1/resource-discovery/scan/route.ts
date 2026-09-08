/**
 * POST /api/v1/resource-discovery/scan
 * 重新扫描本机真实 Harness 资源（只读）并更新索引。
 * 返回：最新扫描记录 + Harness 汇总 + 本次扫描到的资源。
 */
import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function POST() {
  try {
    const result = service.runResourceScan();
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
