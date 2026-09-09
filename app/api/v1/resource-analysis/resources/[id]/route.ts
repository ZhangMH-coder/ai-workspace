import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    return NextResponse.json(service.getResourceInsight(id));
  } catch (e) {
    return handleError(e);
  }
}
