import { AppError } from "@/lib/domain/errors";
import type { PublicUser, UserRecord } from "@/lib/domain/types";
import type { UserRepository } from "@/lib/repositories/user-repository";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  role?: UserRecord["role"];
}

/**
 * 用户业务层：注册与登录的规则都在这里，repository 只负责存取。
 */
export class UserService {
  constructor(private readonly users: UserRepository) {}

  list(): PublicUser[] {
    return this.users.list();
  }

  findById(id: string): PublicUser | null {
    return this.toPublic(this.users.findById(id));
  }

  /** 导入工单时按邮箱定位经办人，用不到密码哈希所以也返回公开形态 */
  findByEmail(email: string): PublicUser | null {
    return this.toPublic(this.users.findByEmail(email.trim().toLowerCase()));
  }

  register(input: RegisterInput): PublicUser {
    const email = input.email.trim().toLowerCase();
    if (this.users.findByEmail(email)) {
      throw AppError.conflict("该邮箱已注册");
    }

    const created = this.users.create({
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: input.role ?? "member",
    });
    return this.toPublic(created)!;
  }

  /** 登录：邮箱不存在与密码错误返回同一句提示，避免账号枚举 */
  authenticate(email: string, password: string): UserRecord {
    const user = this.users.findByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw AppError.unauthorized("邮箱或密码不正确");
    }
    return user;
  }

  toPublic(user: UserRecord | null): PublicUser | null {
    if (!user) return null;
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  /** 首次启动时的兜底管理员，避免空库无法登录 */
  ensureBootstrapAdmin(email: string, name: string, password: string): PublicUser {
    const existing = this.users.findByEmail(email);
    if (existing) return this.toPublic(existing)!;
    return this.register({ email, name, password, role: "admin" });
  }
}
