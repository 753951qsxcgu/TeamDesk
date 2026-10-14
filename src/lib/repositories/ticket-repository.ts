import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/connection";
import type {
  Paginated,
  PublicUser,
  TicketDetail,
  TicketPriority,
  TicketQuery,
  TicketRecord,
  TicketStatus,
} from "@/lib/domain/types";
import { mapTicket, type TicketRow, type UserRow } from "./mappers";

export interface CreateTicketInput {
  title: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  reporterId: string;
  assigneeId?: string | null;
  /** 仅种子数据使用：显式指定创建/更新时间，便于造出有趋势的演示数据 */
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** 允许动态更新的列白名单，避免调用方拼出任意 SQL */
const UPDATABLE_COLUMNS: Record<string, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  assigneeId: "assignee_id",
  resolvedAt: "resolved_at",
  closedAt: "closed_at",
};

const SORT_EXPRESSIONS = {
  created_at: "t.created_at",
  updated_at: "t.updated_at",
  priority: "CASE t.priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END",
} as const;

interface WhereClause {
  sql: string;
  params: Record<string, unknown>;
}

/**
 * 工单数据访问层：唯一允许拼接 tickets 相关 SQL 的地方。
 * 筛选条件在 repository 内翻译成参数化查询，禁止字符串插值拼用户输入。
 */
export class TicketRepository {
  constructor(private readonly db: Db) {}

  create(input: CreateTicketInput): TicketRecord {
    const now = new Date().toISOString();
    const createdAt = input.createdAt ?? now;
    const updatedAt = input.updatedAt ?? createdAt;
    const record: TicketRecord = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      status: input.status ?? "open",
      priority: input.priority ?? "medium",
      reporterId: input.reporterId,
      assigneeId: input.assigneeId ?? null,
      createdAt,
      updatedAt,
      resolvedAt: null,
      closedAt: null,
    };

    this.db
      .prepare(
        `INSERT INTO tickets
           (id, title, description, status, priority, reporter_id, assignee_id,
            created_at, updated_at, resolved_at, closed_at)
         VALUES
           (@id, @title, @description, @status, @priority, @reporterId, @assigneeId,
            @createdAt, @updatedAt, @resolvedAt, @closedAt)`,
      )
      .run(record);

    return record;
  }

  findById(id: string): TicketRecord | null {
    const row = this.db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as
      | TicketRow
      | undefined;
    return row ? mapTicket(row) : null;
  }

  findDetail(id: string): TicketDetail | null {
    const ticket = this.findById(id);
    if (!ticket) return null;
    return this.hydrate([ticket])[0] ?? null;
  }

  list(query: TicketQuery = {}): Paginated<TicketDetail> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)));
    const { sql: whereSql, params } = this.buildWhere(query);
    const order = query.order === "asc" ? "ASC" : "DESC";
    const sortExpr = SORT_EXPRESSIONS[query.sort ?? "created_at"] ?? SORT_EXPRESSIONS.created_at;

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM tickets t ${whereSql}`)
      .get(params) as { total: number };

    const rows = this.db
      .prepare(
        `SELECT t.* FROM tickets t
         ${whereSql}
         ORDER BY ${sortExpr} ${order}, t.created_at DESC
         LIMIT @__limit OFFSET @__offset`,
      )
      .all({ ...params, __limit: pageSize, __offset: (page - 1) * pageSize }) as TicketRow[];

    return {
      items: this.hydrate(rows.map(mapTicket)),
      total: totalRow.total,
      page,
      pageSize,
    };
  }

  update(id: string, patch: UpdateTicketInput): TicketRecord | null {
    const entries = Object.entries(patch).filter(
      ([key, value]) => key in UPDATABLE_COLUMNS && value !== undefined,
    );
    if (entries.length === 0) return this.findById(id);

    const assignments = entries.map(([key]) => `${UPDATABLE_COLUMNS[key]} = @${key}`).join(", ");
    const params: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      params[key] = value;
    }
    params.id = id;
    params.updatedAt = new Date().toISOString();

    const result = this.db
      .prepare(`UPDATE tickets SET ${assignments}, updated_at = @updatedAt WHERE id = @id`)
      .run(params);

    return result.changes > 0 ? this.findById(id) : null;
  }

  delete(id: string): boolean {
    return this.db.prepare("DELETE FROM tickets WHERE id = ?").run(id).changes > 0;
  }

  countAll(): number {
    const row = this.db.prepare("SELECT COUNT(*) AS total FROM tickets").get() as {
      total: number;
    };
    return row.total;
  }

  /**
   * 把工单补齐为详情对象：一次批量查用户、一次批量查标签、一次批量查评论数，
   * 避免逐条查询带来的 N+1。
   */
  private hydrate(tickets: TicketRecord[]): TicketDetail[] {
    if (tickets.length === 0) return [];

    const ids = tickets.map((ticket) => ticket.id);
    const placeholders = ids.map(() => "?").join(", ");

    const userIds = new Set<string>();
    for (const ticket of tickets) {
      userIds.add(ticket.reporterId);
      if (ticket.assigneeId) userIds.add(ticket.assigneeId);
    }

    const userRows = this.db
      .prepare(`SELECT * FROM users WHERE id IN (${Array.from(userIds).map(() => "?").join(", ")})`)
      .all(...Array.from(userIds)) as UserRow[];

    const users = new Map<string, PublicUser>();
    for (const row of userRows) {
      const { password_hash: _hash, ...rest } = row;
      users.set(rest.id, {
        id: rest.id,
        email: rest.email,
        name: rest.name,
        role: rest.role as PublicUser["role"],
        createdAt: rest.created_at,
      });
    }

    const tagRows = this.db
      .prepare(
        `SELECT tt.ticket_id AS ticketId, t.id, t.name, t.color
           FROM ticket_tags tt
           JOIN tags t ON t.id = tt.tag_id
          WHERE tt.ticket_id IN (${placeholders})`,
      )
      .all(...ids) as { ticketId: string; id: string; name: string; color: string }[];

    const tagsByTicket = new Map<string, { id: string; name: string; color: string }[]>();
    for (const row of tagRows) {
      const list = tagsByTicket.get(row.ticketId) ?? [];
      list.push({ id: row.id, name: row.name, color: row.color });
      tagsByTicket.set(row.ticketId, list);
    }

    const commentRows = this.db
      .prepare(
        `SELECT ticket_id AS ticketId, COUNT(*) AS total
           FROM comments
          WHERE ticket_id IN (${placeholders})
          GROUP BY ticket_id`,
      )
      .all(...ids) as { ticketId: string; total: number }[];

    const commentsByTicket = new Map(commentRows.map((row) => [row.ticketId, row.total]));

    return tickets.map((ticket) => ({
      ...ticket,
      reporter: users.get(ticket.reporterId) ?? null,
      assignee: ticket.assigneeId ? users.get(ticket.assigneeId) ?? null : null,
      tags: tagsByTicket.get(ticket.id) ?? [],
      commentCount: commentsByTicket.get(ticket.id) ?? 0,
    }));
  }

  private buildWhere(query: TicketQuery): WhereClause {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (query.keyword?.trim()) {
      // 转义 LIKE 通配符，保证用户输入只被当作普通字符
      const escaped = query.keyword.trim().replace(/[\\%_]/g, (char) => `\\${char}`);
      conditions.push("(t.title LIKE @keyword ESCAPE '\\' OR t.description LIKE @keyword ESCAPE '\\')");
      params.keyword = `%${escaped}%`;
    }
    if (query.status) {
      conditions.push("t.status = @status");
      params.status = query.status;
    }
    if (query.priority) {
      conditions.push("t.priority = @priority");
      params.priority = query.priority;
    }
    if (query.assigneeId === null) {
      conditions.push("t.assignee_id IS NULL");
    } else if (query.assigneeId) {
      conditions.push("t.assignee_id = @assigneeId");
      params.assigneeId = query.assigneeId;
    }
    if (query.reporterId) {
      conditions.push("t.reporter_id = @reporterId");
      params.reporterId = query.reporterId;
    }
    if (query.tagId) {
      conditions.push("EXISTS (SELECT 1 FROM ticket_tags tt WHERE tt.ticket_id = t.id AND tt.tag_id = @tagId)");
      params.tagId = query.tagId;
    }

    return { sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
  }
}
