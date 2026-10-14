import type { SlaState } from "@/lib/domain/sla";

export interface SlaBadgeProps {
  state: SlaState;
  /** 已解决/已关闭：此时不再倒计时，展示结论而不是剩余时间 */
  settled?: boolean;
}

const BASE = "rounded px-1.5 py-0.5 text-xs ring-1";

export function SlaBadge({ state, settled = false }: SlaBadgeProps) {
  if (state.overdue) {
    return (
      <span className={`${BASE} bg-red-50 text-red-700 ring-red-200`}>
        超时 {Math.abs(state.hoursLeft)}h
      </span>
    );
  }
  if (settled) {
    return <span className={`${BASE} bg-green-50 text-green-700 ring-green-200`}>按时完成</span>;
  }
  return <span className={`${BASE} bg-slate-50 text-slate-600 ring-slate-200`}>剩 {state.hoursLeft}h</span>;
}
