/**
 * GET /api/v1/resource-discovery/harnesses
 * 最新一次扫描中各 Harness 的命中结果。
 */
import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET() {
  try {
    const overview = service.getDiscoveryOverview();
    return NextResponse.json({ items: overview.harnesses });
  } catch (e) {
    return handleError(e);
  }
}
