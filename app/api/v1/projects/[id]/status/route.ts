import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import { ServiceError } from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 预留（V1 前端未用归档/恢复 UI，契约先行） */
const statusSchema = z.object({
  status: z.enum(["active", "archived"]),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { status } = statusSchema.parse(await req.json());
    const project = repo.updateProject(id, { status, updatedAt: new Date().toISOString() });
    if (!project) throw new ServiceError("NOT_FOUND", "Project 不存在");
    return NextResponse.json(project);
  } catch (e) {
    return handleError(e);
  }
}
