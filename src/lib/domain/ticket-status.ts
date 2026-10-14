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
  // 进入 resolved 时打点；退回处理中/待处理时清空，避免统计到脏的解决时间
  if (to === "resolved") patch.resolvedAt = now;
  if ((to === "open" || to === "in_progress") && from === "resolved") patch.resolvedAt = null;
  // 进入 closed 时打点；重开时清空。resolved → closed 保留已解决时间
  if (to === "closed") patch.closedAt = now;
  if (to !== "closed" && from === "closed") patch.closedAt = null;
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

/**
 * 导入 CSV 时要把用户填的文案还原成枚举值。
 * 导出的文件里写的是中文标签，所以这里中文与英文都要认。
 */
function buildLookup<V extends string>(labels: Record<V, string>): Map<string, V> {
  const lookup = new Map<string, V>();
  for (const [value, label] of Object.entries(labels) as [V, string][]) {
    lookup.set(value.toLowerCase(), value);
    lookup.set(label.toLowerCase(), value);
  }
  return lookup;
}

const STATUS_LOOKUP = buildLookup(STATUS_LABELS);
const PRIORITY_LOOKUP = buildLookup(PRIORITY_LABELS);

export function parseStatus(value: string): TicketStatus | null {
  return STATUS_LOOKUP.get(value.trim().toLowerCase()) ?? null;
}

export function parsePriority(value: string): TicketPriority | null {
  return PRIORITY_LOOKUP.get(value.trim().toLowerCase()) ?? null;
}
