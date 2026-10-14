/**
 * 统一错误模型：业务层只抛 AppError，
 * 由接口边界统一翻译成 HTTP 状态码与错误码。
 */

export const ERROR_CODES = [
  "BAD_REQUEST",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_TRANSITION",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 409,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError("BAD_REQUEST", message, details);
  }

  static validation(message: string, details?: unknown) {
    return new AppError("VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "请先登录") {
    return new AppError("UNAUTHORIZED", message);
  }

  static forbidden(message = "没有权限执行该操作") {
    return new AppError("FORBIDDEN", message);
  }

  static notFound(resource: string) {
    return new AppError("NOT_FOUND", `${resource}不存在`);
  }

  static conflict(message: string) {
    return new AppError("CONFLICT", message);
  }

  static invalidTransition(from: string, to: string) {
    return new AppError("INVALID_TRANSITION", `不允许从 ${from} 直接变更为 ${to}`, {
      from,
      to,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
