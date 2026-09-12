/**
 * Route Handler 工具（P4-2b）
 *
 * 统一：query/body 解析、zod 校验错误 → VALIDATION_ERROR、ServiceError → ApiError 映射。
 * 错误永远以 ApiErrorBody 结构输出，前端不解析文本。
 */
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { HTTP_STATUS_BY_CODE, type ApiErrorBody } from "@/lib/api/errors";
import { AiError } from "@/lib/ai/errors";
import { ServiceError } from "@/db/service";

export function toApiErrorBody(
  code: ApiErrorBody["error"]["code"],
  message: string,
  details?: ApiErrorBody["error"]["details"]
): ApiErrorBody {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

export function handleError(e: unknown): NextResponse<ApiErrorBody> {
  if (e instanceof ServiceError) {
    return NextResponse.json(toApiErrorBody(e.code, e.message), {
      status: HTTP_STATUS_BY_CODE[e.code],
    });
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      toApiErrorBody(
        "VALIDATION_ERROR",
        "请求参数不合法",
        e.issues.map((i) => ({
          field: i.path.join(".") || "(root)",
          message: i.message,
        }))
      ),
      { status: 400 }
    );
  }
  // 数据库唯一约束冲突（UNIQUE(agent,capability) 等）→ CONFLICT
  const anyErr = e as { code?: string };
  if (typeof anyErr?.code === "string" && anyErr.code.startsWith("SQLITE_CONSTRAINT")) {
    return NextResponse.json(toApiErrorBody("CONFLICT", "数据冲突：资源已存在或状态不允许"), {
      status: 409,
    });
  }
  // LLM 调用错误（API_ERROR/TIMEOUT/NETWORK/PARSE_ERROR 等）→ 502 + 真实原因透传，不吞成笼统 500
  if (e instanceof AiError) {
    return NextResponse.json(toApiErrorBody("INTERNAL_ERROR", e.message), { status: 502 });
  }
  console.error("[api] unexpected error:", e);
  return NextResponse.json(toApiErrorBody("INTERNAL_ERROR", "服务器内部错误"), { status: 500 });
}

/* ---------------- 参数解析 ---------------- */

export function parseIntParam(raw: string | null, fallback: number, max: number): number {
  if (raw === null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) throw new ServiceError("VALIDATION_ERROR", "分页参数不合法");
  return Math.min(n, max);
}

export const sortParamSchema = z
  .string()
  .regex(/^[a-zA-Z]+:(asc|desc)(,[a-zA-Z]+:(asc|desc))*$/, "sort 格式：field:asc|desc");

export function parseSort(raw: string | null, allowed: string[]): string | undefined {
  if (!raw) return undefined;
  const result = sortParamSchema.safeParse(raw);
  if (!result.success) throw new ServiceError("VALIDATION_ERROR", "sort 参数不合法");
  const field = raw.split(":")[0];
  if (!allowed.includes(field)) {
    throw new ServiceError("VALIDATION_ERROR", `不支持的排序字段: ${field}`);
  }
  return raw;
}

/** 显式 from/to 边界（P4-2 收敛：统计/时间过滤唯一入口，前端负责计算窗口） */
export function parseTimeRange(searchParams: URLSearchParams): {
  from?: string;
  to?: string;
} {
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  if (fromRaw === null && toRaw === null) return {};
  if (fromRaw === null || toRaw === null) {
    throw new ServiceError("VALIDATION_ERROR", "from 与 to 必须成对提供");
  }
  const from = normalizeISOOrThrow(fromRaw);
  const to = normalizeISOOrThrow(toRaw);
  if (from >= to) {
    throw new ServiceError("VALIDATION_ERROR", "from 必须早于 to");
  }
  return { from, to };
}

function normalizeISOOrThrow(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new ServiceError("VALIDATION_ERROR", `无效时间值: ${v}`);
  }
  return d.toISOString();
}

/* ---------------- 分页响应 ---------------- */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function pageMeta(page: number, pageSize: number, total: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
