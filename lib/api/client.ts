/**
 * API Client（P4-2c）
 *
 * - fetch + JSON 封装；非 2xx 一律解析为 ApiError（按 code 分支，禁止解析响应文本）
 * - 所有端点返回 DTO；由 mappers.ts 转换为 Domain
 */
import { ApiError, type ApiErrorBody } from "./errors";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 204) return undefined as T;
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // 非 JSON 错误体：兜底为 INTERNAL_ERROR
    }
    throw new ApiError(res.status, body?.error ?? {
      code: "INTERNAL_ERROR",
      message: `请求失败 (${res.status})`,
    });
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { ApiError };
