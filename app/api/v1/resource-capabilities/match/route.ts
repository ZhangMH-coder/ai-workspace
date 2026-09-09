import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const task = searchParams.get("task")?.trim() ?? "";
    if (!task) {
      return NextResponse.json({ task: "", matches: [] });
    }
    return NextResponse.json(service.matchResourcesForTask(task));
  } catch (e) {
    return handleError(e);
  }
}
