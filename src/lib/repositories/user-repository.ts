import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/connection";
import type { PublicUser, UserRecord, UserRole } from "@/lib/domain/types";
import { mapUser, type UserRow } from "./mappers";

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
  role?: UserRole;
}

/**
 * 用户数据访问层。所有涉及 users 表的 SQL 都收敛在这里。
 */
export class UserRepository {
  constructor(private readonly db: Db) {}

  create(input: CreateUserInput): UserRecord {
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      role: input.role ?? "member",
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `INSERT INTO users (id, email, name, password_hash, role, created_at)
         VALUES (@id, @email, @name, @passwordHash, @role, @createdAt)`,
      )
      .run(record);

    return record;
  }

  findById(id: string): UserRecord | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  findByEmail(email: string): UserRecord | null {
    const row = this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email.trim().toLowerCase()) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  exists(email: string): boolean {
    return this.findByEmail(email) !== null;
  }

  /** 返回不含密码哈希的用户列表，避免凭据泄漏到上层 */
  list(): PublicUser[] {
    const rows = this.db
      .prepare("SELECT * FROM users ORDER BY created_at ASC")
      .all() as UserRow[];
    return rows.map((row) => {
      const { passwordHash: _passwordHash, ...safe } = mapUser(row);
      return safe;
    });
  }

  count(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number };
    return row.total;
  }

  updatePasswordHash(id: string, passwordHash: string): void {
    this.db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
  }
}
