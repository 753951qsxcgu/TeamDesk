import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/connection";
import type { CommentRecord, PublicUser } from "@/lib/domain/types";
import { mapComment, type CommentRow } from "./mappers";

export interface CreateCommentInput {
  ticketId: string;
  authorId: string;
  body: string;
}

export interface CommentWithAuthor extends CommentRecord {
  author: PublicUser | null;
}

export class CommentRepository {
  constructor(private readonly db: Db) {}

  create(input: CreateCommentInput): CommentRecord {
    const record: CommentRecord = {
      id: randomUUID(),
      ticketId: input.ticketId,
      authorId: input.authorId,
      body: input.body.trim(),
      createdAt: new Date().toISOString(),
    };
    this.db
      .prepare(
        `INSERT INTO comments (id, ticket_id, author_id, body, created_at)
         VALUES (@id, @ticketId, @authorId, @body, @createdAt)`,
      )
      .run(record);
    return record;
  }

  findById(id: string): CommentRecord | null {
    const row = this.db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as
      | CommentRow
      | undefined;
    return row ? mapComment(row) : null;
  }

  listByTicket(ticketId: string): CommentWithAuthor[] {
    const rows = this.db
      .prepare(
        `SELECT c.*, u.id AS author_user_id, u.email, u.name, u.role, u.created_at AS author_created_at
           FROM comments c
           LEFT JOIN users u ON u.id = c.author_id
          WHERE c.ticket_id = ?
          ORDER BY c.created_at ASC`,
      )
      .all(ticketId) as (CommentRow & {
      author_user_id: string | null;
      email: string | null;
      name: string | null;
      role: string | null;
      author_created_at: string | null;
    })[];

    return rows.map((row) => {
      const comment = mapComment(row);
      const author: PublicUser | null = row.author_user_id
        ? {
            id: row.author_user_id,
            email: row.email ?? "",
            name: row.name ?? "未知用户",
            role: (row.role ?? "member") as PublicUser["role"],
            createdAt: row.author_created_at ?? "",
          }
        : null;
      return { ...comment, author };
    });
  }

  countByTicketIds(ticketIds: string[]): Map<string, number> {
    const result = new Map<string, number>();
    if (ticketIds.length === 0) return result;

    const placeholders = ticketIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `SELECT ticket_id AS ticketId, COUNT(*) AS total
           FROM comments
          WHERE ticket_id IN (${placeholders})
          GROUP BY ticket_id`,
      )
      .all(...ticketIds) as { ticketId: string; total: number }[];

    for (const row of rows) {
      result.set(row.ticketId, row.total);
    }
    return result;
  }

  countByTicket(ticketId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM comments WHERE ticket_id = ?")
      .get(ticketId) as { total: number };
    return row.total;
  }

  delete(id: string): boolean {
    return this.db.prepare("DELETE FROM comments WHERE id = ?").run(id).changes > 0;
  }
}
