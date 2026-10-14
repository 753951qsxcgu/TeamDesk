import { afterEach, describe, expect, it, vi } from "vitest";
import { signSession, verifySession } from "@/lib/auth/session";

const NOW = 1_800_000_000_000;

describe("会话令牌", () => {
  afterEach(() => {
    delete process.env.TEAMDESK_SESSION_SECRET;
  });

  it("签发的令牌可以验回 userId", () => {
    const token = signSession("user-1", NOW);
    expect(verifySession(token, NOW)).toBe("user-1");
  });

  it("过期后校验失败", () => {
    const token = signSession("user-1", NOW);
    // 令牌默认 7 天有效
    expect(verifySession(token, NOW + 8 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("篡改签名或 userId 后校验失败", () => {
    const token = signSession("user-1", NOW);

    expect(verifySession(`${token}x`, NOW)).toBeNull();
    expect(verifySession(token.replace("user-1", "user-2"), NOW)).toBeNull();
    expect(verifySession("garbage", NOW)).toBeNull();
    expect(verifySession("", NOW)).toBeNull();
  });

  it("不同密钥签出的令牌互不可认", () => {
    process.env.TEAMDESK_SESSION_SECRET = "secret-a";
    const token = signSession("user-1", NOW);

    process.env.TEAMDESK_SESSION_SECRET = "secret-b";
    expect(verifySession(token, NOW)).toBeNull();
  });

  it("生产环境缺少密钥时直接抛错，不使用默认密钥", () => {
    // NODE_ENV 在类型上是只读的，用 vi.stubEnv 改
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TEAMDESK_SESSION_SECRET", undefined);

    try {
      expect(() => signSession("user-1", NOW)).toThrow(/TEAMDESK_SESSION_SECRET/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
