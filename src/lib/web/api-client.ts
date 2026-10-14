/**
 * 浏览器侧调用自有 /api 的轻量封装。
 * 统一解包 { ok, data } / { ok, error }，失败时抛出 ApiClientError。
 */
import type { ApiFailure, ApiSuccess } from "@/lib/api/response";

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  const body = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!body.ok) {
    throw new ApiClientError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiSend<T>(path: string, method: "POST" | "PATCH" | "DELETE", payload?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

/** 把未知错误收敛成一句可展示的中文提示 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> } | undefined)
      ?.fieldErrors;
    const firstFieldError = fieldErrors ? Object.values(fieldErrors)[0]?.[0] : undefined;
    return firstFieldError ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "操作失败，请稍后重试";
}
