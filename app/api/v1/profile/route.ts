/**
 * GET/PUT /api/v1/profile
 *
 * 个人资料（S1.45）：
 * - GET：用户自定义展示信息（DB）+ 本机真实事实信息（派生），消除硬编码假身份；
 * - PUT：仅保存用户自定义字段（昵称/职位/简介/头像配色）。
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

const avatarColors = ["violet", "indigo", "emerald", "sky", "amber", "rose"] as const;

const putSchema = z.object({
  displayName: z.string().max(40, "昵称过长").nullish(),
  title: z.string().max(80, "职位描述过长").nullish(),
  bio: z.string().max(300, "简介过长").nullish(),
  avatarColor: z.enum(avatarColors).nullish(),
});

export async function GET() {
  try {
    return NextResponse.json(service.getProfile());
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = putSchema.parse(await req.json());
    const user = service.saveProfile({
      displayName: body.displayName ?? null,
      title: body.title ?? null,
      bio: body.bio ?? null,
      avatarColor: body.avatarColor ?? null,
    });
    return NextResponse.json({ user });
  } catch (e) {
    return handleError(e);
  }
}
