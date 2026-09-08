import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import * as service from "@/db/service";
import { handleError, pageMeta, parseIntParam } from "@/lib/api/server";

const attachSchema = z.object({
  agentId: z.string().min(1),
  capabilityId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = parseIntParam(sp.get("page"), 1, 10_000);
    const pageSize = parseIntParam(sp.get("pageSize"), 100, 100);
    const { items, total } = repo.listAgentCapabilities(
      { agentId: sp.get("agentId") ?? undefined, capabilityId: sp.get("capabilityId") ?? undefined },
      { page, pageSize }
    );
    return NextResponse.json({ items, ...pageMeta(page, pageSize, total) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = attachSchema.parse(await req.json());
    const relation = service.attachCapability(body.agentId, body.capabilityId);
    return NextResponse.json(relation, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
