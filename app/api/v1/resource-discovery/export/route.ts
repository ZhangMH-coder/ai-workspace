/**
 * GET /api/v1/resource-discovery/export?format=csv|json
 * 导出全量可见真实资源清单（排除用户隐藏；CSV / JSON）。
 */
import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET(req: Request) {
  try {
    const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "csv";
    const { contentType, body } = service.exportResources(format);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="ai-workspace-resources.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
