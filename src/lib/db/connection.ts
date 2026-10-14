import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { Migration } from "./schema";
import { MIGRATIONS } from "./schema";

export type Db = Database.Database;

export interface DbOptions {
  /** 指定数据库文件；缺省使用 TEAMDESK_DB_PATH 或 data/teamdesk.db */
  filename?: string;
  /** true 时使用内存库，测试场景专用 */
  memory?: boolean;
  /** 默认 true：建库后立刻执行迁移 */
  migrate?: boolean;
}

const DEFAULT_DB_FILE = path.join(process.cwd(), "data", "teamdesk.db");

let cached: Db | null = null;

/**
 * 迁移执行器：把已应用的版本记录在 schema_migrations 中，重复调用是幂等的。
 * 每个迁移在独立事务里执行，失败即回滚，不会留下半截结构。
 */
export function runMigrations(db: Db, migrations: readonly Migration[] = MIGRATIONS): number {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = db.prepare("SELECT version FROM schema_migrations").all() as {
    version: number;
  }[];
  const appliedVersions = new Set(applied.map((row) => row.version));

  const insert = db.prepare(
    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
  );

  let count = 0;
  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;
    const apply = db.transaction(() => {
      db.exec(migration.sql);
      insert.run(migration.version, migration.name, new Date().toISOString());
    });
    apply();
    count += 1;
  }
  return count;
}

export function createDb(options: DbOptions = {}): Db {
  const filename = options.memory
    ? ":memory:"
    : options.filename ?? process.env.TEAMDESK_DB_PATH ?? DEFAULT_DB_FILE;

  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  // 开启外键约束，级联删除才生效
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  if (options.migrate !== false) {
    runMigrations(db);
  }
  return db;
}

/** 进程内单例，供 Route Handler 与 Server Component 复用同一个连接 */
export function getDb(): Db {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}

export function closeDb(): void {
  cached?.close();
  cached = null;
}
