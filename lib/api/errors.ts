/**
 * 统一 ApiError Contract（P4-2b/c 共享）
 *
 * 规则：前端只按 code 分支，禁止解析 HTTP response 文本。
 * - VALIDATION_ERROR: 参数/请求体非法（含字段级 details）
 * - NOT_FOUND / CONFLICT / INTERNAL_ERROR / UNAUTHORIZED(预留) / FORBIDDEN(预留) / RATE_LIMITED(预留)
 */

export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INTERNAL_ERROR",
  "RATE_LIMITED",
  "LLM_NOT_CONFIGURED",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: FieldError[];
    requestId?: string;
  };
}

export const HTTP_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
  LLM_NOT_CONFIGURED: 501,
};

/** 前端统一异常类型（lib/api/client.ts 使用） */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: FieldError[];

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}
