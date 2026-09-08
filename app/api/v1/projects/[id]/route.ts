import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import { ServiceError } from "@/db/service";
import { handleError } from "@/lib/api/server";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(400).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = repo.getProject(id);
    if (!project) throw new ServiceError("NOT_FOUND", "Project 不存在");
    return NextResponse.json(project);
  } catch (e) {
    return handleError(e);
  }
}

/** 预留（V1 前端未用编辑） */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const patch = updateProjectSchema.parse(await req.json());
    const project = repo.updateProject(id, { ...patch, updatedAt: new Date().toISOString() });
    if (!project) throw new ServiceError("NOT_FOUND", "Project 不存在");
    return NextResponse.json(project);
  } catch (e) {
    return handleError(e);
  }
}
