/**
 * 登录态读取：服务端的页面与接口统一从这里取当前用户。
 * 没有 middleware，鉴权在服务端组件与 Route Handler 内完成，
 * 避免把 better-sqlite3 带进 Edge 运行时。
 */
import { cookies } from "next/headers";
import { AppError } from "@/lib/domain/errors";
import type { PublicUser } from "@/lib/domain/types";
import { SESSION_COOKIE, verifySession } from "./session";
import { getServices } from "@/lib/services/container";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = verifySession(token);
  if (!userId) return null;

  return getServices().users.findById(userId);
}

/** 需要登录：未登录抛 401，由响应包装层翻译成 UNAUTHORIZED */
export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) throw AppError.unauthorized();
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw AppError.forbidden("该操作仅管理员可执行");
  }
  return user;
}
