import { describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/connection";
import { StatsRepository } from "@/lib/repositories/stats-repository";
import { TagRepository } from "@/lib/repositories/tag-repository";
import { TicketRepository } from "@/lib/repositories/ticket-repository";
import { StatsService } from "@/lib/services/stats-service";
import { createTestDb, makeUser } from "../helpers/test-db";

function dayOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function setup(): { db: Db; stats: StatsService } {
  const db = createTestDb();
  return { db, stats: new StatsService(new StatsRepository(db)) };
}

describe("StatsService", () => {
  it("状态与优先级分布覆盖全部枚举，缺失项补 0", () => {
    const { db, stats } = setup();
    const author = makeUser(db);
    new TicketRepository(db).create({ title: "唯一工单", reporterId: author.id, priority: "high" });

    const overview = stats.overview();

    expect(overview.total).toBe(1);
    expect(overview.byStatus.open).toBe(1);
    expect(overview.byStatus.closed).toBe(0);
    expect(overview.byPriority.high).toBe(1);
    expect(overview.byPriority.urgent).toBe(0);
  });

  it("趋势长度固定为 7 天且按日期升序，缺失日期补 0", () => {
    const { db, stats } = setup();
    const tickets = new TicketRepository(db);
    const author = makeUser(db);

    tickets.create({ title: "三天前", reporterId: author.id, createdAt: dayOffset(3) });
    tickets.create({ title: "今天", reporterId: author.id, createdAt: dayOffset(0) });

    const overview = stats.overview();

    expect(overview.trend).toHaveLength(7);
    expect(overview.trend.reduce((sum, point) => sum + point.total, 0)).toBe(2);
    const days = overview.trend.map((point) => point.day);
    expect([...days].sort()).toEqual(days);
  });

  it("平均解决时长只统计有解决时间的工单", () => {
    const { db, stats } = setup();
    const tickets = new TicketRepository(db);
    const author = makeUser(db);

    const created = dayOffset(2);
    const resolved = dayOffset(1);
    const ticket = tickets.create({ title: "已解决", reporterId: author.id, createdAt: created });
    tickets.update(ticket.id, { status: "resolved", resolvedAt: resolved });
    tickets.create({ title: "未解决", reporterId: author.id, createdAt: created });

    const hours = stats.overview().averageResolutionHours;
    // 两个时间点相隔 24 小时
    expect(hours).not.toBeNull();
    expect(hours!).toBeCloseTo(24, 1);
  });

  it("没有已解决工单时平均解决时长为 null", () => {
    const { db, stats } = setup();
    const author = makeUser(db);
    new TicketRepository(db).create({ title: "刚创建", reporterId: author.id });

    expect(stats.overview().averageResolutionHours).toBeNull();
  });

  it("经办人负载只统计未关闭工单", () => {
    const { db, stats } = setup();
    const tickets = new TicketRepository(db);
    const assignee = makeUser(db, { name: "经办人" });
    const author = makeUser(db);

    tickets.create({ title: "处理中", reporterId: author.id, assigneeId: assignee.id });
    const closed = tickets.create({ title: "已关闭", reporterId: author.id, assigneeId: assignee.id });
    tickets.update(closed.id, { status: "closed", closedAt: new Date().toISOString() });

    const load = stats.overview().assigneeLoad;
    expect(load).toHaveLength(1);
    expect(load[0]?.name).toBe("经办人");
    expect(load[0]?.openCount).toBe(1);
  });

  it("未指派数量只算 assignee 为空的工单", () => {
    const { db, stats } = setup();
    const tickets = new TicketRepository(db);
    const author = makeUser(db);

    tickets.create({ title: "未指派", reporterId: author.id });
    tickets.create({ title: "已指派", reporterId: author.id, assigneeId: makeUser(db).id });

    expect(stats.overview().unassigned).toBe(1);
  });

  it("标签维度不影响统计口径", () => {
    const { db, stats } = setup();
    const tickets = new TicketRepository(db);
    const tags = new TagRepository(db);
    const author = makeUser(db);

    const ticket = tickets.create({ title: "带标签", reporterId: author.id });
    tags.setTicketTags(ticket.id, [tags.ensure("登录").id]);

    expect(stats.overview().total).toBe(1);
  });
});
