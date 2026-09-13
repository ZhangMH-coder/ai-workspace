/**
 * GET /api/v1/resource-capabilities/export?format=csv|json
 * 导出全量当前能力标签（含来源资源与证据引用；CSV / JSON）。
 */
import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET(req: Request) {
  try {
    const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "csv";
    const { contentType, body } = service.exportCapabilities(format);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="ai-workspace-capabilities.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
