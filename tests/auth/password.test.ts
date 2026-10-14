import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("密码哈希", () => {
  it("同一密码两次哈希结果不同（随机盐）", () => {
    expect(hashPassword("teamdesk")).not.toBe(hashPassword("teamdesk"));
  });

  it("正确密码校验通过，错误密码被拒绝", () => {
    const stored = hashPassword("teamdesk-admin");
    expect(verifyPassword("teamdesk-admin", stored)).toBe(true);
    expect(verifyPassword("teamdesk-admin ", stored)).toBe(false);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("存储格式为 scrypt$<salt>$<hash>，不出现明文", () => {
    const stored = hashPassword("super-secret");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored.split("$")).toHaveLength(3);
    expect(stored).not.toContain("super-secret");
  });

  it("格式非法的存储值直接返回 false，不抛异常", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });
});
