import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/connection";
import { createDb } from "@/lib/db/connection";
import type { UserRecord, UserRole } from "@/lib/domain/types";
import { UserRepository } from "@/lib/repositories/user-repository";

/** 每个用例一个内存库，互不干扰 */
export function createTestDb(): Db {
  return createDb({ memory: true });
}

export interface MakeUserOptions {
  email?: string;
  name?: string;
  role?: UserRole;
  passwordHash?: string;
}

export function makeUser(db: Db, options: MakeUserOptions = {}): UserRecord {
  return new UserRepository(db).create({
    email: options.email ?? `user-${randomUUID()}@teamdesk.test`,
    name: options.name ?? "测试用户",
    passwordHash: options.passwordHash ?? "scrypt$00$00",
    role: options.role ?? "member",
  });
}
