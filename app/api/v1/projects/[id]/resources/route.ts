import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import {
  attachResourceToProject,
  listProjectResourcesView,
  ServiceError,
} from "@/db/service";
import { handleError } from "@/lib/api/server";

/** 批量添加资源到项目（S1.55：项目 = 使用场景）；已关联的幂等跳过 */
const attachSchema = z.object({
  resourceIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const project = repo.getProject(id);
    if (!project) throw new ServiceError("NOT_FOUND", "Project 不存在");
    const resources = listProjectResourcesView(id);
    return NextResponse.json({ items: resources, total: resources.length });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = attachSchema.parse(await req.json());
    const added: string[] = [];
    for (const resourceId of body.resourceIds) {
      if (!repo.getProjectResourceByPair(id, resourceId)) {
        attachResourceToProject(id, resourceId);
        added.push(resourceId);
      }
    }
    // 返回与 GET 同构的 view（含完整 resource 实体），幂等跳过的不重复返回
    const items = listProjectResourcesView(id).filter((v) => added.includes(v.resourceId));
    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    return handleError(e);
  }
}
