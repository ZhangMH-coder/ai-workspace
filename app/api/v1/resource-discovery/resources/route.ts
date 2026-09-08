/**
 * GET /api/v1/resource-discovery/resources
 * 统一资源索引列表：支持 search / type / harness / parseable 过滤 + 分页。
 */
import { NextRequest, NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError, pageMeta, parseIntParam } from "@/lib/api/server";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = parseIntParam(sp.get("page"), 1, 10_000);
    const pageSize = parseIntParam(sp.get("pageSize"), 50, 100);
    const parseableRaw = sp.get("parseable");
    const parseable = parseableRaw === "true" ? true : parseableRaw === "false" ? false : undefined;
    const { items, total } = service.listDiscoveredResources({
      search: sp.get("search") ?? undefined,
      type: sp.get("type") ?? undefined,
      harness: sp.get("harness") ?? undefined,
      parseable,
      page,
      pageSize,
    });
    return NextResponse.json({ items, ...pageMeta(page, pageSize, total) });
  } catch (e) {
    return handleError(e);
  }
}
