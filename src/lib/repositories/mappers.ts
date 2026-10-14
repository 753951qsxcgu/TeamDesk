/**
 * 数据库行 → 领域对象的映射。
 * 只有这里知道表里的 snake_case 列名，repository 之外一律使用 camelCase。
 */
import type {
  CommentRecord,
  TagRecord,
  TicketRecord,
  TicketPriority,
  TicketStatus,
  UserRecord,
  UserRole,
} from "@/lib/domain/types";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export interface TicketRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  reporter_id: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface CommentRow {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
}

export function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    createdAt: row.created_at,
  };
}

export function mapTicket(row: TicketRow): TicketRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    reporterId: row.reporter_id,
    assigneeId: row.assignee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
  };
}

export function mapComment(row: CommentRow): CommentRecord {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapTag(row: TagRow): TagRecord {
  return { id: row.id, name: row.name, color: row.color };
}
