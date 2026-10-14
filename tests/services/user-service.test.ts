import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/connection";
import { createTestDb } from "../helpers/test-db";
import { UserService } from "@/lib/services/user-service";
import { UserRepository } from "@/lib/repositories/user-repository";
import { AppError } from "@/lib/domain/errors";

function makeService(db: Db) {
  return new UserService(new UserRepository(db));
}

describe("UserService", () => {
  it("注册后不返回密码哈希", () => {
    const service = makeService(createTestDb());
    const user = service.register({
      email: "lily@teamdesk.dev",
      name: "李莉",
      password: "teamdesk-member",
    });

    expect(user.email).toBe("lily@teamdesk.dev");
    expect(user.role).toBe("member");
    expect(user && "passwordHash" in user).toBe(false);
  });

  it("重复邮箱注册报 CONFLICT", () => {
    const service = makeService(createTestDb());
    service.register({ email: "dup@teamdesk.dev", name: "甲", password: "password123" });

    expect(() =>
      service.register({ email: "DUP@teamdesk.dev", name: "乙", password: "password456" }),
    ).toThrow(AppError);
  });

  it("密码正确可登录，错误被拒绝", () => {
    const service = makeService(createTestDb());
    service.register({ email: "a@teamdesk.dev", name: "甲", password: "password123" });

    expect(service.authenticate("a@teamdesk.dev", "password123").email).toBe("a@teamdesk.dev");
    expect(() => service.authenticate("a@teamdesk.dev", "wrong-password")).toThrow(/邮箱或密码/);
  });

  it("邮箱不存在与密码错误返回同一句提示，避免账号枚举", () => {
    const service = makeService(createTestDb());
    service.register({ email: "a@teamdesk.dev", name: "甲", password: "password123" });

    const messages: string[] = [];
    for (const [email, password] of [
      ["nobody@teamdesk.dev", "password123"],
      ["a@teamdesk.dev", "wrong-password"],
    ] as const) {
      try {
        service.authenticate(email, password);
      } catch (error) {
        messages.push((error as AppError).message);
      }
    }

    expect(messages).toHaveLength(2);
    expect(messages[0]).toBe(messages[1]);
  });

  it("ensureBootstrapAdmin 对已存在账号幂等", () => {
    const service = makeService(createTestDb());
    const first = service.ensureBootstrapAdmin("root@teamdesk.dev", "管理员", "password123");
    const second = service.ensureBootstrapAdmin("root@teamdesk.dev", "管理员", "password123");

    expect(first.role).toBe("admin");
    expect(second.id).toBe(first.id);
    expect(service.list()).toHaveLength(1);
  });
});
