/**
 * 工单业务编排层：只依赖 repository，不感知 HTTP。
 * 状态机、存在性校验、关联维护都放在这里，接口层保持薄。
 */
import { AppError } from "@/lib/domain/errors";
import { assertTransition, timestampsForTransition } from "@/lib/domain/ticket-status";
import type {
  Paginated,
  TicketDetail,
  TicketQuery,
  TicketRecord,
} from "@/lib/domain/types";
import type { CreateCommentPayload, CreateTicketPayload, UpdateTicketPayload, TransitionPayload } from "@/lib/domain/validation";
import type { CommentRepository, CommentWithAuthor } from "@/lib/repositories/comment-repository";
import type { TagRepository } from "@/lib/repositories/tag-repository";
import type { TicketRepository } from "@/lib/repositories/ticket-repository";
import type { UserRepository } from "@/lib/repositories/user-repository";

export interface TicketServiceDeps {
  tickets: TicketRepository;
  comments: CommentRepository;
  tags: TagRepository;
  users: UserRepository;
}

export class TicketService {
  constructor(private readonly deps: TicketServiceDeps) {}

  list(query: TicketQuery): Paginated<TicketDetail> {
    return this.deps.tickets.list(query);
  }

  get(id: string): TicketDetail {
    return this.deps.tickets.findDetail(this.requireTicket(id).id) ?? this.raiseNotFound();
  }

  create(payload: CreateTicketPayload): TicketDetail {
    this.assertUserExists(payload.reporterId, "报告人");
    if (payload.assigneeId) {
      this.assertUserExists(payload.assigneeId, "经办人");
    }

    const ticket = this.deps.tickets.create({
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      reporterId: payload.reporterId,
      assigneeId: payload.assigneeId ?? null,
    });

    if (payload.tagIds?.length) {
      this.applyTags(ticket.id, payload.tagIds);
    }
    return this.get(ticket.id);
  }

  update(id: string, payload: UpdateTicketPayload): TicketDetail {
    this.requireTicket(id);
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

  remove(id: string): { id: string } {
    this.requireTicket(id);
    this.deps.tickets.delete(id);
    return { id };
  }

  listComments(ticketId: string): CommentWithAuthor[] {
    this.requireTicket(ticketId);
    return this.deps.comments.listByTicket(ticketId);
  }

  addComment(ticketId: string, payload: CreateCommentPayload): CommentWithAuthor {
    this.requireTicket(ticketId);
    this.assertUserExists(payload.authorId, "评论作者");

    const comment = this.deps.comments.create({
      ticketId,
      authorId: payload.authorId,
      body: payload.body,
    });
    const author = this.deps.users.findById(payload.authorId);

    return {
      ...comment,
      author: author
        ? {
            id: author.id,
            email: author.email,
            name: author.name,
            role: author.role,
            createdAt: author.createdAt,
          }
        : null,
    };
  }

  private requireTicket(id: string): TicketRecord {
    const ticket = this.deps.tickets.findById(id);
    if (!ticket) throw AppError.notFound("工单");
    return ticket;
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
