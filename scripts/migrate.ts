/**
 * 执行数据库迁移：npm run db:migrate
 * 幂等，可重复执行；只会应用尚未执行的版本。
 */
import { createDb, runMigrations } from "../src/lib/db/connection";
import { MIGRATIONS, SCHEMA_VERSION } from "../src/lib/db/schema";

function main(): void {
  const target = process.env.TEAMDESK_DB_PATH ?? "./data/teamdesk.db";
  // 关闭建库时的自动迁移，让本脚本独占迁移执行与日志输出
  const db = createDb({ migrate: false });
  const applied = runMigrations(db);

  const versions = db
    .prepare("SELECT version, name FROM schema_migrations ORDER BY version")
    .all() as { version: number; name: string }[];

  console.log(`数据库：${target}`);
  console.log(`本次应用迁移：${applied} 个`);
  for (const row of versions) {
    console.log(`  v${row.version} ${row.name}`);
  }
  console.log(`当前 schema 版本：${SCHEMA_VERSION}（共 ${MIGRATIONS.length} 个迁移）`);

  db.close();
}

main();
