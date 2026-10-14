import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/domain/errors";
import { changePasswordSchema } from "@/lib/domain/validation";
import { parseOrThrow } from "@/lib/api/validate";
import { UserRepository } from "@/lib/repositories/user-repository";
import { UserService } from "@/lib/services/user-service";
import { createTestDb } from "../helpers/test-db";

const ORIGINAL = "teamdesk-original";
const UPDATED = "teamdesk-updated";

function setup() {
  const db = createTestDb();
  const repository = new UserRepository(db);
  const services = new UserService(repository);
  const user = services.register({
    email: "owner@teamdesk.test",
    name: "改密用户",
    password: ORIGINAL,
  });
  return { services, repository, user };
}

describe("changePassword", () => {
  it("旧密码正确时更新成功，之后可以用新密码登录", () => {
    const { services, user } = setup();

    services.changePassword(user.id, ORIGINAL, UPDATED);

    expect(() => services.authenticate(user.email, UPDATED)).not.toThrow();
    expect(() => services.authenticate(user.email, ORIGINAL)).toThrow();
  });

  it("即便新旧密码相同也会重新生成盐，哈希不会原样保留", () => {
    const { services, repository, user } = setup();
    const before = repository.findById(user.id)!.passwordHash;

    services.changePassword(user.id, ORIGINAL, ORIGINAL);

    expect(repository.findById(user.id)!.passwordHash).not.toBe(before);
  });

  it("旧密码错误时拒绝修改", () => {
    const { services, user } = setup();

    expect(() => services.changePassword(user.id, "wrong-password", UPDATED)).toThrow(AppError);
    expect(() => services.authenticate(user.email, ORIGINAL)).not.toThrow();
  });

  it("用户不存在时报 404", () => {
    const { services } = setup();

    try {
      services.changePassword("no-such-user", ORIGINAL, UPDATED);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("NOT_FOUND");
    }
  });
});

describe("changePasswordSchema", () => {
  it("新密码不足 8 位时给出字段级提示", () => {
    try {
      parseOrThrow(changePasswordSchema, { currentPassword: ORIGINAL, newPassword: "1234567" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION_ERROR");
    }
  });
});
