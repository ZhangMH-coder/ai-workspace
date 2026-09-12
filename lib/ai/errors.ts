/**
 * AI 调用统一错误模型（服务端）
 *
 * 前端只按 code 分支，不解析文本。
 */
export type AiErrorCode =
  | "CONFIG_MISSING" // 未配置 API Key
  | "TIMEOUT" // 请求超时
  | "NETWORK" // 网络错误
  | "API_ERROR" // Provider 返回非 2xx
  | "PARSE_ERROR"; // 返回内容无法解析

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly status?: number;

  constructor(code: AiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = status;
  }
}
