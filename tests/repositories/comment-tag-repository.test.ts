import { describe, expect, it } from "vitest";
import { CommentRepository } from "@/lib/repositories/comment-repository";
import { TagRepository } from "@/lib/repositories/tag-repository";
import { TicketRepository } from "@/lib/repositories/ticket-repository";
import { createTestDb, makeUser } from "../helpers/test-db";

describe("CommentRepository", () => {
  it("评论列表带出作者信息并按时间升序", () => {
    const db = createTestDb();
    const author = makeUser(db, { name: "陈昊" });
    const ticket = new TicketRepository(db).create({ title: "工单", reporterId: author.id });
    const comments = new CommentRepository(db);

    comments.create({ ticketId: ticket.id, authorId: author.id, body: "第一条", createdAt: "2026-01-01T00:00:00.000Z" });
    comments.create({ ticketId: ticket.id, authorId: author.id, body: "第二条", createdAt: "2026-01-02T00:00:00.000Z" });

    const list = comments.listByTicket(ticket.id);
    expect(list.map((item) => item.body)).toEqual(["第一条", "第二条"]);
    expect(list[0]?.author?.name).toBe("陈昊");
    expect(list[0]?.author && "passwordHash" in list[0].author).toBe(false);
  });

  it("批量统计评论数", () => {
    const db = createTestDb();
    const author = makeUser(db);
    const tickets = new TicketRepository(db);
    const comments = new CommentRepository(db);

    const first = tickets.create({ title: "有评论", reporterId: author.id });
    const second = tickets.create({ title: "无评论", reporterId: author.id });
    comments.create({ ticketId: first.id, authorId: author.id, body: "a" });
    comments.create({ ticketId: first.id, authorId: author.id, body: "b" });

    const counts = comments.countByTicketIds([first.id, second.id]);
    expect(counts.get(first.id)).toBe(2);
    expect(counts.get(second.id)).toBeUndefined();
  });

  it("删除工单时评论级联清理", () => {
    const db = createTestDb();
    const author = makeUser(db);
    const tickets = new TicketRepository(db);
    const comments = new CommentRepository(db);

    const ticket = tickets.create({ title: "待删除", reporterId: author.id });
    comments.create({ ticketId: ticket.id, authorId: author.id, body: "hi" });

    tickets.delete(ticket.id);
    expect(comments.listByTicket(ticket.id)).toHaveLength(0);
  });
});

describe("TagRepository", () => {
  it("ensure 对同名标签幂等", () => {
    const db = createTestDb();
    const tags = new TagRepository(db);

    const first = tags.ensure("性能");
    const second = tags.ensure("性能");

    expect(second.id).toBe(first.id);
    expect(tags.list()).toHaveLength(1);
  });

  it("setTicketTags 全量覆盖，重复设置不产生重复关联", () => {
    const db = createTestDb();
    const tags = new TagRepository(db);
    const author = makeUser(db);
    const ticket = new TicketRepository(db).create({ title: "工单", reporterId: author.id });

    const ui = tags.ensure("UI");
    const perf = tags.ensure("性能");

    tags.setTicketTags(ticket.id, [ui.id, perf.id]);
    tags.setTicketTags(ticket.id, [perf.id]);

    expect(tags.listByTicketIds([ticket.id]).get(ticket.id)?.map((tag) => tag.name)).toEqual(["性能"]);
  });

  it("listByTicketIds 入参为空时返回空 Map", () => {
    const db = createTestDb();
    expect(new TagRepository(db).listByTicketIds([]).size).toBe(0);
  });
});
