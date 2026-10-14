import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/connection";
import type {
  ActivityType,
  PublicUser,
  TicketActivity,
  TicketActivityWithActor,
} from "@/lib/domain/types";
import { mapActivity, type ActivityRow } from "./mappers";

export interface CreateActivityInput {
  ticketId: string;
  actorId: string | null;
  type: ActivityType;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
}

/**
 * 工单活动流：每一次状态、优先级、经办人变化与评论都留一条记录，
 * 详情页据此还原「谁在什么时候做了什么」。
 */
export class ActivityRepository {
  constructor(private readonly db: Db) {}

  create(input: CreateActivityInput): TicketActivity {
    const record: TicketActivity = {
      id: randomUUID(),
      ticketId: input.ticketId,
      actorId: input.actorId,
      type: input.type,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue ?? null,
      note: input.note ?? null,
      createdAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `INSERT INTO ticket_activities
           (id, ticket_id, actor_id, type, from_value, to_value, note, created_at)
         VALUES
           (@id, @ticketId, @actorId, @type, @fromValue, @toValue, @note, @createdAt)`,
      )
      .run(record);

    return record;
  }

  listByTicket(ticketId: string, limit = 50): TicketActivityWithActor[] {
    const rows = this.db
      .prepare(
        `SELECT a.*, u.id AS actor_user_id, u.email, u.name, u.role, u.created_at AS actor_created_at
           FROM ticket_activities a
           LEFT JOIN users u ON u.id = a.actor_id
          WHERE a.ticket_id = ?
          ORDER BY a.created_at DESC, a.rowid DESC
          LIMIT ?`,
      )
      .all(ticketId, limit) as (ActivityRow & {
      actor_user_id: string | null;
      email: string | null;
      name: string | null;
      role: string | null;
      actor_created_at: string | null;
    })[];

    return rows.map((row) => {
      const activity = mapActivity(row);
      const actor: PublicUser | null = row.actor_user_id
        ? {
            id: row.actor_user_id,
            email: row.email ?? "",
            name: row.name ?? "未知用户",
            role: (row.role ?? "member") as PublicUser["role"],
            createdAt: row.actor_created_at ?? "",
          }
        : null;
      return { ...activity, actor };
    });
  }

  countByTicket(ticketId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM ticket_activities WHERE ticket_id = ?")
      .get(ticketId) as { total: number };
    return row.total;
  }
}
