import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 归档/恢复统一端点（软删除语义；归档不影响已有装配） */
const lifecycleSchema = z.object({
  lifecycle: z.enum(["active", "archived"]),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { lifecycle } = lifecycleSchema.parse(await req.json());
    const definition = service.setCapabilityLifecycle(id, lifecycle);
    return NextResponse.json(definition);
  } catch (e) {
    return handleError(e);
  }
}
