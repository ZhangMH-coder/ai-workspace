import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import * as service from "@/db/service";
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
    const agent = service.updateAgent(id, patch);
    return NextResponse.json(agent);
  } catch (e) {
    return handleError(e);
  }
}


/** S1.60：归档 Agent（软删除语义，非物理删除；关联运行与能力装配保留） */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const agent = service.archiveAgent(id);
    return NextResponse.json(agent);
  } catch (e) {
    return handleError(e);
  }
}
