/**
 * 领域模型定义：只描述业务概念，不涉及任何存储与传输细节。
 */

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const USER_ROLES = ["admin", "member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

/** 对外暴露的用户信息，永远不包含密码哈希 */
export type PublicUser = Omit<UserRecord, "passwordHash">;

export interface TicketRecord {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  reporterId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface CommentRecord {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TagRecord {
  id: string;
  name: string;
  color: string;
}

/** 工单详情：附带关联对象，供详情页与接口直接消费 */
export interface TicketDetail extends TicketRecord {
  reporter: PublicUser | null;
  assignee: PublicUser | null;
  tags: TagRecord[];
  commentCount: number;
}

/** 列表查询条件，全部可选；由 repository 负责翻译成 SQL */
export interface TicketQuery {
  keyword?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
  reporterId?: string;
  tagId?: string;
  page?: number;
  pageSize?: number;
  sort?: "created_at" | "updated_at" | "priority";
  order?: "asc" | "desc";
}

/** 工单上的一次可追溯动作，用于详情页的活动流 */
export interface TicketActivity {
  id: string;
  ticketId: string;
  actorId: string | null;
  type: ActivityType;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  createdAt: string;
}

export interface TicketActivityWithActor extends TicketActivity {
  actor: PublicUser | null;
}

export const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "assignee_changed",
  "commented",
  "updated",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
