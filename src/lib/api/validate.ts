import type { z } from "zod";
import { AppError } from "@/lib/domain/errors";

/**
 * 入参校验入口：zod 失败统一转成 VALIDATION_ERROR，
 * 并把字段级错误放进 details，方便前端直接定位到表单项。
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw AppError.validation("参数校验失败", result.error.flatten());
  }
  return result.data;
}

/** URLSearchParams → 普通对象，空串视为「未传」，避免 zod 收到 "" 报类型错 */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (value !== "") output[key] = value;
  }
  return output;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.badRequest("请求体不是合法的 JSON");
  }
}
