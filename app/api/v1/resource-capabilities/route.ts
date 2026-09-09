import { NextResponse } from "next/server";
import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

export async function GET() {
  try {
    return NextResponse.json(service.listCapabilityIndex());
  } catch (e) {
    return handleError(e);
  }
}
