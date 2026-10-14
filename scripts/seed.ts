/**
 * 写入演示数据：npm run db:seed
 * 默认幂等保护——库里已有工单时拒绝重复写入，需要追加请加 --force。
 */
import { createDb } from "../src/lib/db/connection";
import { seedDatabase } from "../src/lib/db/seed";
import { TicketRepository } from "../src/lib/repositories/ticket-repository";

function main(): void {
  const force = process.argv.includes("--force");
  const db = createDb();

  if (!force && new TicketRepository(db).countAll() > 0) {
    console.log("数据库已有工单数据，跳过写入。若要追加演示数据请执行：npm run db:seed -- --force");
    db.close();
    return;
  }

  const result = seedDatabase(db);
  console.log(
    `写入完成：用户 ${result.users} 个、标签 ${result.tags} 个、工单 ${result.tickets} 条、评论 ${result.comments} 条`,
  );
  console.log("默认账号：admin@teamdesk.dev / teamdesk-admin（仅本地演示使用）");

  db.close();
}

main();
