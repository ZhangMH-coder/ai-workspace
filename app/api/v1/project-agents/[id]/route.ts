import { NextRequest, NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    service.detachAgentFromProject(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
