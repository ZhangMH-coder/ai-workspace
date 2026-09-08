import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as repo from "@/db/repository";
import * as service from "@/db/service";
import { handleError, pageMeta, parseSort, parseIntParam } from "@/lib/api/server";

const createProjectSchema = z.object({
  name: z.string().min(1, "名称必填").max(60),
  description: z.string().max(400).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = parseIntParam(sp.get("page"), 1, 10_000);
    const pageSize = parseIntParam(sp.get("pageSize"), 100, 100);
    const sort = parseSort(sp.get("sort"), ["name", "createdAt"]);
    const { items, total } = repo.listProjects(
      { status: sp.get("status") ?? undefined, search: sp.get("search") ?? undefined, sort },
      { page, pageSize }
    );
    return NextResponse.json({ items, ...pageMeta(page, pageSize, total) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = createProjectSchema.parse(await req.json());
    const project = service.createProject(body);
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
