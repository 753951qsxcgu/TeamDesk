/**
 * 接口的入参契约。所有外部输入都必须先过这里的 schema，
 * 业务层拿到的就是已经收敛过类型的对象。
 */
import { z } from "zod";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "./types";

const optionalId = z.string().min(1).max(64).nullable().optional();

export const createTicketSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(120, "标题不能超过 120 个字"),
  // 用 default 而非 optional：输入可缺省，但校验后的输出一定是有值的
  description: z.string().trim().max(5000, "描述不能超过 5000 个字").default(""),
  priority: z.enum(TICKET_PRIORITIES).default("medium"),
  assigneeId: optionalId,
  // 鉴权接入后由接口层用会话身份覆盖，这里保留是为了兼容早期的显式传参
  reporterId: z.string().min(1).max(64).optional(),
  tagIds: z.array(z.string().min(1).max(64)).max(10, "最多 10 个标签").optional(),
});

export type CreateTicketPayload = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assigneeId: optionalId,
    tagIds: z.array(z.string().min(1).max(64)).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "没有需要更新的字段" });

export type UpdateTicketPayload = z.infer<typeof updateTicketSchema>;

export const transitionSchema = z.object({
  to: z.enum(TICKET_STATUSES),
  comment: z.string().trim().max(2000).optional(),
});

export type TransitionPayload = z.infer<typeof transitionSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "评论内容不能为空").max(2000, "评论不能超过 2000 个字"),
  // 同 reporterId：接入鉴权后由会话身份决定
  authorId: z.string().min(1).max(64).optional(),
});

export type CreateCommentPayload = z.infer<typeof createCommentSchema>;

export const ticketListQuerySchema = z.object({
  keyword: z.string().trim().max(120).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  /** "none" 表示筛选未指派的工单 */
  assigneeId: z.string().max(64).optional(),
  reporterId: z.string().max(64).optional(),
  tagId: z.string().max(64).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).optional(),
  sort: z.enum(["created_at", "updated_at", "priority"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export type TicketListQueryPayload = z.infer<typeof ticketListQuerySchema>;

export const bulkUpdateSchema = z
  .object({
    ids: z.array(z.string().min(1).max(64)).min(1, "至少选择一条工单").max(50, "一次最多 50 条"),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assigneeId: z.string().max(64).nullable().optional(),
  })
  .refine((value) => value.status || value.priority || value.assigneeId !== undefined, {
    message: "没有需要更新的字段",
  });

export type BulkUpdatePayload = z.infer<typeof bulkUpdateSchema>;

/** 导入直接收整段 CSV 文本，解析与列映射交给 service，接口层不做业务判断 */
export const ticketImportSchema = z.object({
  csv: z.string().min(1, "CSV 内容为空").max(2_000_000, "导入文件过大"),
  // 试跑只校验不落库，先在页面上把问题行暴露出来
  dryRun: z.boolean().default(false),
});

export type TicketImportPayload = z.infer<typeof ticketImportSchema>;

export const registerSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(120),
  name: z.string().trim().min(1, "姓名不能为空").max(40),
  password: z.string().min(8, "密码至少 8 位").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(120),
  password: z.string().min(1, "请输入密码").max(72),
});
