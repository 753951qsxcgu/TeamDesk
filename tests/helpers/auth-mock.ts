/**
 * 接口测试用的登录态替身。
 * 真实实现依赖 next/headers 的 cookies()，在非请求上下文中拿不到，
 * 所以测试里把当前用户换成可切换的状态。
 */
import { AppError } from "@/lib/domain/errors";
import type { PublicUser } from "@/lib/domain/types";

export const authState: { currentUser: PublicUser | null } = { currentUser: null };

export async function getCurrentUser(): Promise<PublicUser | null> {
  return authState.currentUser;
}

export async function requireUser(): Promise<PublicUser> {
  if (!authState.currentUser) throw AppError.unauthorized();
  return authState.currentUser;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw AppError.forbidden("该操作仅管理员可执行");
  }
  return user;
}
