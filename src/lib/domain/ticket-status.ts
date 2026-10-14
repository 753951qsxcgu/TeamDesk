/**
 * 工单状态机：把「哪些状态之间允许跃迁」收敛到一处，
 * service 与接口层都复用这里的判断，避免规则散落。
 */
import type { TicketPriority, TicketStatus } from "./types";
import { AppError } from "./errors";

const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["resolved", "open"],
  resolved: ["closed", "in_progress"],
  closed: ["open"],
};

export function allowedNextStatuses(from: TicketStatus): readonly TicketStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** 非法跃迁时抛出，由接口层转成 409 INVALID_TRANSITION */
export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (from === to) {
    throw AppError.conflict(`工单已处于 ${STATUS_LABELS[to]} 状态`);
  }
  if (!canTransition(from, to)) {
    throw AppError.invalidTransition(from, to);
  }
}

/**
 * 状态变更时需要同步维护的时间字段。
 * resolvedAt 在进入 resolved 时写入、退回 in_progress 时清空，
 * closedAt 同理，保证统计口径干净。
 */
export function timestampsForTransition(
  from: TicketStatus,
  to: TicketStatus,
  now: string,
): Partial<Record<"resolvedAt" | "closedAt", string | null>> {
  const patch: Partial<Record<"resolvedAt" | "closedAt", string | null>> = {};
  if (to === "resolved") patch.resolvedAt = now;
  if (from === "resolved" && to !== "resolved") patch.resolvedAt = null;
  if (to === "closed") patch.closedAt = now;
  if (from === "closed" && to !== "closed") patch.closedAt = null;
  return patch;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "待处理",
  in_progress: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

/** 排序用：数值越大越紧急 */
export const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};
