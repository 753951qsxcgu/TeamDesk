/**
 * SLA：不同优先级承诺不同的首次响应时限。
 * 规则放领域层，列表、详情、后续的通知都复用同一份判断，避免各算各的。
 */
import type { TicketPriority } from "./types";

/** 单位：小时 */
export const SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 4,
  high: 8,
  medium: 24,
  low: 72,
};

export interface SlaInput {
  createdAt: string;
  priority: TicketPriority;
  /** 已解决/已关闭的工单停表，按解决时间判断是否超时 */
  resolvedAt?: string | null;
  closedAt?: string | null;
  /** 便于测试注入固定时间 */
  now?: number;
}

export interface SlaState {
  dueAt: string;
  /** 剩余小时数，负数表示已超时 */
  hoursLeft: number;
  overdue: boolean;
}

export function slaDueAt(createdAt: string, priority: TicketPriority): string {
  const due = new Date(createdAt).getTime() + SLA_HOURS[priority] * 3_600_000;
  return new Date(due).toISOString();
}

export function evaluateSla(input: SlaInput): SlaState {
  const dueAt = slaDueAt(input.createdAt, input.priority);
  // 已解决或已关闭就停表，否则按当前时间继续计时
  const stopAt = input.resolvedAt ?? input.closedAt ?? new Date(input.now ?? Date.now()).toISOString();
  const hoursLeft = (new Date(dueAt).getTime() - new Date(stopAt).getTime()) / 3_600_000;

  return {
    dueAt,
    hoursLeft: Math.round(hoursLeft * 10) / 10,
    overdue: hoursLeft < 0,
  };
}
