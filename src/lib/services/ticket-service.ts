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
  TicketActivityWithActor,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "@/lib/domain/types";
import type { CreateCommentPayload, CreateTicketPayload, UpdateTicketPayload, TransitionPayload } from "@/lib/domain/validation";
import type { ActivityRepository } from "@/lib/repositories/activity-repository";
import type { CommentRepository, CommentWithAuthor } from "@/lib/repositories/comment-repository";
import type { TagRepository } from "@/lib/repositories/tag-repository";
import type { TicketRepository } from "@/lib/repositories/ticket-repository";

/** 只需要「按 id 查用户」的能力，repository 与 service 都能满足 */
export interface UserLookup {
  findById(id: string): PublicUser | null;
}

export interface BulkUpdatePatch {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}

export interface BulkUpdateResult {
  updated: number;
  skipped: { id: string; reason: string }[];
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
  activities: ActivityRepository;
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
    this.deps.activities.create({
      ticketId: ticket.id,
      actorId: reporterId,
      type: "created",
      toValue: ticket.title,
    });
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
    this.recordFieldChanges(ticket, fields, actor);
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
    this.deps.activities.create({
      ticketId: id,
      actorId: actorId ?? ticket.reporterId,
      type: "status_changed",
      fromValue: ticket.status,
      toValue: payload.to,
    });

    if (payload.comment?.trim()) {
      this.deps.comments.create({
        ticketId: id,
        authorId: actorId ?? ticket.reporterId,
        body: payload.comment.trim(),
      });
      this.deps.activities.create({
        ticketId: id,
        actorId: actorId ?? ticket.reporterId,
        type: "commented",
        note: payload.comment.trim().slice(0, 120),
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
    this.deps.activities.create({
      ticketId,
      actorId: authorId,
      type: "commented",
      note: payload.body.slice(0, 120),
    });

    return { ...comment, author };
  }

  /**
   * 批量更新：逐条校验，单条失败不影响其余，返回成功条数与跳过原因。
   * 批量接口刻意不做「要么全成功要么全回滚」，运营场景下部分成功更有用。
   */
  bulkUpdate(ids: string[], patch: BulkUpdatePatch, actor: Actor): BulkUpdateResult {
    const result: BulkUpdateResult = { updated: 0, skipped: [] };

    for (const id of ids) {
      const ticket = this.deps.tickets.findById(id);
      if (!ticket) {
        result.skipped.push({ id, reason: "工单不存在" });
        continue;
      }
      try {
        this.assertCanEdit(ticket, actor);
        if (patch.status) {
          assertTransition(ticket.status, patch.status);
        }
        if (patch.assigneeId) {
          this.assertUserExists(patch.assigneeId, "经办人");
        }
      } catch (error) {
        result.skipped.push({ id, reason: error instanceof AppError ? error.message : "不允许的操作" });
        continue;
      }

      const now = new Date().toISOString();
      this.deps.tickets.update(id, {
        ...patch,
        ...(patch.status ? timestampsForTransition(ticket.status, patch.status, now) : {}),
      });

      if (patch.status && patch.status !== ticket.status) {
        this.deps.activities.create({
          ticketId: id,
          actorId: actor.id,
          type: "status_changed",
          fromValue: ticket.status,
          toValue: patch.status,
        });
      }
      if (patch.priority && patch.priority !== ticket.priority) {
        this.deps.activities.create({
          ticketId: id,
          actorId: actor.id,
          type: "priority_changed",
          fromValue: ticket.priority,
          toValue: patch.priority,
        });
      }
      if (patch.assigneeId !== undefined && patch.assigneeId !== ticket.assigneeId) {
        this.deps.activities.create({
          ticketId: id,
          actorId: actor.id,
          type: "assignee_changed",
          fromValue: ticket.assigneeId ?? "未指派",
          toValue: patch.assigneeId ?? "未指派",
        });
      }

      result.updated += 1;
    }

    return result;
  }

  listActivities(ticketId: string, limit = 50): TicketActivityWithActor[] {
    this.requireTicket(ticketId);
    return this.deps.activities.listByTicket(ticketId, limit);
  }

  /** 记录优先级与经办人的变化；标题/描述这类改动只记一条 updated */
  private recordFieldChanges(
    before: TicketRecord,
    fields: Omit<UpdateTicketPayload, "tagIds">,
    actor: Actor,
  ): void {
    if (fields.priority !== undefined && fields.priority !== before.priority) {
      this.deps.activities.create({
        ticketId: before.id,
        actorId: actor.id,
        type: "priority_changed",
        fromValue: before.priority,
        toValue: fields.priority,
      });
    }
    if (fields.assigneeId !== undefined && fields.assigneeId !== before.assigneeId) {
      this.deps.activities.create({
        ticketId: before.id,
        actorId: actor.id,
        type: "assignee_changed",
        fromValue: before.assigneeId ?? "未指派",
        toValue: fields.assigneeId ?? "未指派",
      });
    }
    if (fields.title !== undefined || fields.description !== undefined) {
      this.deps.activities.create({
        ticketId: before.id,
        actorId: actor.id,
        type: "updated",
        note: "更新了工单内容",
      });
    }
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
