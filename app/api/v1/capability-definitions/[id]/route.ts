import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import * as service from "@/db/service";
import { ServiceError } from "@/db/service";
import { handleError } from "@/lib/api/server";

const updateCapabilitySchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(400).optional(),
  type: z.enum(["skill", "memory", "rule", "tool"]).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const definition = repo.getCapabilityDefinition(id);
    if (!definition) throw new ServiceError("NOT_FOUND", "Capability 不存在");
    return NextResponse.json(definition);
  } catch (e) {
    return handleError(e);
  }
}

/** 仅元信息更新（生命周期变更走 /lifecycle） */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const patch = updateCapabilitySchema.parse(await req.json());
    const definition = service.updateCapability(id, patch);
    return NextResponse.json(definition);
  } catch (e) {
    return handleError(e);
  }
}
