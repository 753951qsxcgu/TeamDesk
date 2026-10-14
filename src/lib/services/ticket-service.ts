/**
 * 工单业务编排层：只依赖 repository，不感知 HTTP。
 * 状态机、存在性校验、关联维护都放在这里，接口层保持薄。
 */
import { AppError } from "@/lib/domain/errors";
import { assertTransition, timestampsForTransition } from "@/lib/domain/ticket-status";
import type {
  Paginated,
  PublicUser,
  TicketDetail,
  TicketQuery,
  TicketRecord,
  UserRole,
} from "@/lib/domain/types";
import type { CreateCommentPayload, CreateTicketPayload, UpdateTicketPayload, TransitionPayload } from "@/lib/domain/validation";
import type { CommentRepository, CommentWithAuthor } from "@/lib/repositories/comment-repository";
import type { TagRepository } from "@/lib/repositories/tag-repository";
import type { TicketRepository } from "@/lib/repositories/ticket-repository";

/** 只需要「按 id 查用户」的能力，repository 与 service 都能满足 */
export interface UserLookup {
  findById(id: string): PublicUser | null;
}

/** 操作者身份：接口层从会话里取出来传进来，service 不感知 Cookie */
export interface Actor {
  id: string;
  role: UserRole;
}

export interface TicketServiceDeps {
  tickets: TicketRepository;
  comments: CommentRepository;
  tags: TagRepository;
  users: UserLookup;
}

export class TicketService {
  constructor(private readonly deps: TicketServiceDeps) {}

  list(query: TicketQuery): Paginated<TicketDetail> {
    return this.deps.tickets.list(query);
  }

  get(id: string): TicketDetail {
    return this.deps.tickets.findDetail(this.requireTicket(id).id) ?? this.raiseNotFound();
  }

  create(payload: CreateTicketPayload, reporterId: string): TicketDetail {
    this.assertUserExists(reporterId, "报告人");
    if (payload.assigneeId) {
      this.assertUserExists(payload.assigneeId, "经办人");
    }

    const ticket = this.deps.tickets.create({
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      reporterId,
      assigneeId: payload.assigneeId ?? null,
    });

    if (payload.tagIds?.length) {
      this.applyTags(ticket.id, payload.tagIds);
    }
    return this.get(ticket.id);
  }

  update(id: string, payload: UpdateTicketPayload, actor: Actor): TicketDetail {
    const ticket = this.requireTicket(id);
    this.assertCanEdit(ticket, actor);
    if (payload.assigneeId) {
      this.assertUserExists(payload.assigneeId, "经办人");
    }

    const { tagIds, ...fields } = payload;
    if (Object.keys(fields).length > 0) {
      this.deps.tickets.update(id, fields);
    }
    if (tagIds) {
      this.applyTags(id, tagIds);
    }
    return this.get(id);
  }

  /** 状态流转：先过状态机，再同步维护时间戳，可选地记一条流转说明 */
  transition(id: string, payload: TransitionPayload, actorId?: string): TicketDetail {
    const ticket = this.requireTicket(id);
    assertTransition(ticket.status, payload.to);

    const now = new Date().toISOString();
    this.deps.tickets.update(id, {
      status: payload.to,
      ...timestampsForTransition(ticket.status, payload.to, now),
    });

    if (payload.comment?.trim()) {
      this.deps.comments.create({
        ticketId: id,
        authorId: actorId ?? ticket.reporterId,
        body: payload.comment.trim(),
      });
    }

    return this.get(id);
  }

  remove(id: string, actor: Actor): { id: string } {
    this.requireTicket(id);
    if (actor.role !== "admin") {
      throw AppError.forbidden("只有管理员可以删除工单");
    }
    this.deps.tickets.delete(id);
    return { id };
  }

  listComments(ticketId: string): CommentWithAuthor[] {
    this.requireTicket(ticketId);
    return this.deps.comments.listByTicket(ticketId);
  }

  addComment(ticketId: string, payload: CreateCommentPayload, authorId: string): CommentWithAuthor {
    this.requireTicket(ticketId);
    this.assertUserExists(authorId, "评论作者");

    const comment = this.deps.comments.create({
      ticketId,
      authorId,
      body: payload.body,
    });
    const author = this.deps.users.findById(authorId);

    return { ...comment, author };
  }

  private requireTicket(id: string): TicketRecord {
    const ticket = this.deps.tickets.findById(id);
    if (!ticket) throw AppError.notFound("工单");
    return ticket;
  }

  /** 管理员放行；其余情况只有报告人或经办人能改 */
  private assertCanEdit(ticket: TicketRecord, actor: Actor): void {
    if (actor.role === "admin") return;
    if (ticket.reporterId === actor.id || ticket.assigneeId === actor.id) return;
    throw AppError.forbidden("只有报告人、经办人或管理员可以修改该工单");
  }

  private assertUserExists(id: string, label: string): void {
    if (!this.deps.users.findById(id)) {
      throw AppError.badRequest(`${label}不存在：${id}`);
    }
  }

  private applyTags(ticketId: string, tagIds: string[]): void {
    for (const tagId of tagIds) {
      if (!this.deps.tags.findById(tagId)) {
        throw AppError.badRequest(`标签不存在：${tagId}`);
      }
    }
    this.deps.tags.setTicketTags(ticketId, tagIds);
  }

  private raiseNotFound(): never {
    throw AppError.notFound("工单");
  }
}
