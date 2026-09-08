import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import { ServiceError } from "@/db/service";
import { handleError } from "@/lib/api/server";

const updateAgentSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(400).optional(),
  model: z.string().min(1).max(60).optional(),
  systemPrompt: z.string().max(4000).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const agent = repo.getAgent(id);
    if (!agent) throw new ServiceError("NOT_FOUND", "Agent 不存在");
    return NextResponse.json(agent);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const patch = updateAgentSchema.parse(await req.json());
    const agent = repo.updateAgent(id, patch);
    if (!agent) throw new ServiceError("NOT_FOUND", "Agent 不存在");
    return NextResponse.json(agent);
  } catch (e) {
    return handleError(e);
  }
}
