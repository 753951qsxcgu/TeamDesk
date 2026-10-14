/**
 * 统计查询：所有聚合 SQL 都收在这里，service 只做补齐与换算。
 */
import type { Db } from "@/lib/db/connection";
import type { TicketPriority, TicketStatus } from "@/lib/domain/types";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/domain/types";

export interface AssigneeLoad {
  userId: string;
  name: string;
  openCount: number;
}

export class StatsRepository {
  constructor(private readonly db: Db) {}

  countByStatus(): Record<TicketStatus, number> {
    const rows = this.db
      .prepare("SELECT status, COUNT(*) AS total FROM tickets GROUP BY status")
      .all() as { status: TicketStatus; total: number }[];

    const result = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0])) as Record<
      TicketStatus,
      number
    >;
    for (const row of rows) {
      if (row.status in result) result[row.status] = row.total;
    }
    return result;
  }

  countByPriority(): Record<TicketPriority, number> {
    const rows = this.db
      .prepare("SELECT priority, COUNT(*) AS total FROM tickets GROUP BY priority")
      .all() as { priority: TicketPriority; total: number }[];

    const result = Object.fromEntries(TICKET_PRIORITIES.map((p) => [p, 0])) as Record<
      TicketPriority,
      number
    >;
    for (const row of rows) {
      if (row.priority in result) result[row.priority] = row.total;
    }
    return result;
  }

  /** 按天统计新建量，缺口由 service 补零 */
  countCreatedByDay(sinceIso: string): { day: string; total: number }[] {
    return this.db
      .prepare(
        `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS total
           FROM tickets
          WHERE created_at >= ?
          GROUP BY day
          ORDER BY day`,
      )
      .all(sinceIso) as { day: string; total: number }[];
  }

  /** 平均解决时长（小时），没有已解决工单时返回 null */
  averageResolutionHours(): number | null {
    const row = this.db
      .prepare(
        `SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS hours
           FROM tickets
          WHERE resolved_at IS NOT NULL`,
      )
      .get() as { hours: number | null };
    return row.hours;
  }

  countUnassigned(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM tickets WHERE assignee_id IS NULL")
      .get() as { total: number };
    return row.total;
  }

  /** 未关闭工单的经办人负载 */
  assigneeLoad(limit = 5): AssigneeLoad[] {
    return this.db
      .prepare(
        `SELECT u.id AS userId, u.name AS name, COUNT(*) AS openCount
           FROM tickets t
           JOIN users u ON u.id = t.assignee_id
          WHERE t.status IN ('open', 'in_progress')
          GROUP BY u.id
          ORDER BY openCount DESC, u.name ASC
          LIMIT ?`,
      )
      .all(limit) as AssigneeLoad[];
  }
}
