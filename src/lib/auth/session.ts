/**
 * 会话令牌：userId + 过期时间 + HMAC 签名，放在 HttpOnly Cookie 里。
 * 不引入第三方 session 库，签名密钥来自环境变量。
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "teamdesk_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const DEV_FALLBACK_SECRET = "teamdesk-local-dev-secret";

let warnedAboutFallback = false;

function getSecret(): string {
  const secret = process.env.TEAMDESK_SESSION_SECRET;
  if (secret && secret.length > 0) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须配置 TEAMDESK_SESSION_SECRET");
  }
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn("[auth] 未配置 TEAMDESK_SESSION_SECRET，正在使用本地开发用默认密钥");
  }
  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function signSession(userId: string, now: number = Date.now()): string {
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** 校验通过返回 userId，签名不符或已过期返回 null */
export function verifySession(token: string, now: number = Date.now()): string | null {
  const [userId, expiresAtRaw, signature] = token.split(".");
  if (!userId || !expiresAtRaw || !signature) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) return null;

  const expected = Buffer.from(sign(`${userId}.${expiresAt}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return expiresAt > now ? userId : null;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
  secure: process.env.NODE_ENV === "production",
} as const;
