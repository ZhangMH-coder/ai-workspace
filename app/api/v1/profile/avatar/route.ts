/**
 * /api/v1/profile/avatar
 *
 * POST   — 上传头像（body: { dataUrl }，PNG/JPEG/WebP，≤2MB）→ { avatarUrl }
 * DELETE — 移除头像（删文件 + 清 DB 引用）→ { avatarUrl: null }
 * GET    — 读取当前头像图片（服务端文件流，Content-Type 按扩展名）
 */
import fs from "node:fs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import * as service from "@/db/service";
import { handleError } from "@/lib/api/server";

const postSchema = z.object({
  dataUrl: z.string().min(1, "头像内容为空").max(3_000_000, "头像数据过大"),
});

export async function POST(req: NextRequest) {
  try {
    const body = postSchema.parse(await req.json());
    const result = service.uploadAvatar(body.dataUrl);
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    return NextResponse.json(service.clearAvatar());
  } catch (e) {
    return handleError(e);
  }
}

export async function GET() {
  try {
    const avatar = service.getAvatarFile();
    if (!avatar) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "未设置头像" } },
        { status: 404 }
      );
    }
    const buf = fs.readFileSync(avatar.absolutePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": avatar.mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
