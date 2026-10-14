import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/connection";
import { TicketRepository } from "@/lib/repositories/ticket-repository";
import { TagRepository } from "@/lib/repositories/tag-repository";
import { createTestDb, makeUser } from "../helpers/test-db";

function seedTickets(db: Db) {
  const reporter = makeUser(db, { name: "报告人" });
  const assignee = makeUser(db, { name: "经办人" });
  const repo = new TicketRepository(db);

  repo.create({ title: "登录页验证码不刷新", description: "Safari 下不刷新", reporterId: reporter.id });
  repo.create({
    title: "支付回调超时",
    description: "第三方回调 8s 才返回",
    priority: "urgent",
    reporterId: reporter.id,
    assigneeId: assignee.id,
  });
  repo.create({
    title: "列表首屏过慢",
    description: "全表扫描导致",
    priority: "high",
    reporterId: assignee.id,
    assigneeId: assignee.id,
  });

  return { reporter, assignee, repo };
}

describe("TicketRepository", () => {
  it("创建工单时填充默认值", () => {
    const db = createTestDb();
    const reporter = makeUser(db);
    const ticket = new TicketRepository(db).create({ title: "新工单", reporterId: reporter.id });

    expect(ticket.status).toBe("open");
    expect(ticket.priority).toBe("medium");
    expect(ticket.assigneeId).toBeNull();
    expect(ticket.resolvedAt).toBeNull();
    expect(ticket.updatedAt).toBe(ticket.createdAt);
  });

  it("findDetail 一次性补齐报告人、经办人、标签与评论数", () => {
    const db = createTestDb();
    const { reporter, assignee, repo } = seedTickets(db);
    const tags = new TagRepository(db);

    const tag = tags.ensure("登录", "#2563eb");
    const created = repo.create({ title: "带标签的工单", reporterId: reporter.id, assigneeId: assignee.id });
    tags.setTicketTags(created.id, [tag.id]);

    const detail = repo.findDetail(created.id);
    expect(detail).not.toBeNull();
    expect(detail?.reporter?.id).toBe(reporter.id);
    expect(detail?.assignee?.id).toBe(assignee.id);
    expect(detail?.tags.map((item) => item.name)).toEqual(["登录"]);
    expect(detail?.commentCount).toBe(0);
    // 详情不能带出密码哈希
    expect(detail?.reporter && "passwordHash" in detail.reporter).toBe(false);
  });

  it("按状态和优先级筛选", () => {
    const db = createTestDb();
    const { reporter, assignee, repo } = seedTickets(db);
    repo.update(
      repo.create({ title: "已解决的工单", reporterId: reporter.id }).id,
      { status: "resolved" },
    );

    expect(repo.list({ status: "open" }).total).toBe(3);
    expect(repo.list({ status: "resolved" }).total).toBe(1);
    expect(repo.list({ priority: "urgent" }).items[0]?.title).toBe("支付回调超时");
    expect(repo.list({ assigneeId: assignee.id }).total).toBe(2);
    expect(repo.list({ assigneeId: null }).total).toBe(2);
  });

  it("关键词搜索会转义 LIKE 通配符，% 不应匹配全部", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);

    expect(repo.list({ keyword: "%" }).total).toBe(0);
    expect(repo.list({ keyword: "支付" }).total).toBe(1);
    expect(repo.list({ keyword: "不刷新" }).total).toBe(1);
  });

  it("分页返回总数与当前页数据", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);

    const firstPage = repo.list({ page: 1, pageSize: 2 });
    const secondPage = repo.list({ page: 2, pageSize: 2 });

    expect(firstPage.total).toBe(3);
    expect(firstPage.items).toHaveLength(2);
    expect(secondPage.items).toHaveLength(1);
    expect(firstPage.items.map((item) => item.id)).not.toEqual(secondPage.items.map((item) => item.id));
  });

  it("页长超过上限时被收敛到 100", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);
    expect(repo.list({ pageSize: 9999 }).pageSize).toBe(100);
  });

  it("排序：优先级按权重而非字典序", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);

    const priorities = repo.list({ sort: "priority", order: "desc" }).items.map((t) => t.priority);
    expect(priorities).toEqual(["urgent", "high", "medium"]);
  });

  it("update 只接受白名单字段，忽略未知键", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);
    const created = repo.create({ title: "原始标题", reporterId: makeUser(db).id });

    const updated = repo.update(created.id, {
      title: "新标题",
      ...({ id: "被篡改的 id" } as Record<string, unknown>),
    } as never);

    expect(updated?.title).toBe("新标题");
    expect(updated?.id).toBe(created.id);
  });

  it("按标签筛选走 EXISTS 子查询", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);
    const tags = new TagRepository(db);
    const tag = tags.ensure("性能");

    const target = repo.create({ title: "性能问题", reporterId: makeUser(db).id });
    tags.setTicketTags(target.id, [tag.id]);

    const result = repo.list({ tagId: tag.id });
    expect(result.total).toBe(1);
    expect(result.items[0]?.title).toBe("性能问题");
  });

  it("删除工单返回影响行数", () => {
    const db = createTestDb();
    const { repo } = seedTickets(db);
    const created = repo.create({ title: "待删除", reporterId: makeUser(db).id });

    expect(repo.delete(created.id)).toBe(true);
    expect(repo.delete(created.id)).toBe(false);
  });
});
