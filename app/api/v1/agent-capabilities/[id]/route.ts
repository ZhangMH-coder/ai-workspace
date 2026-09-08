import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

const enableSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { enabled } = enableSchema.parse(await req.json());
    const relation = service.setCapabilityEnabled(id, enabled);
    return NextResponse.json(relation);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    service.detachCapability(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
