"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/lib/domain/ticket-status";
import type { TicketStatus } from "@/lib/domain/types";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";

export interface TicketActionsProps {
  ticketId: string;
  status: TicketStatus;
  /** 当前状态允许的下一跳，由状态机给出，前端不重复实现规则 */
  nextStatuses: readonly TicketStatus[];
}

export function TicketActions({ ticketId, status, nextStatuses }: TicketActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transition(to: TicketStatus) {
    setPending(to);
    setError(null);
    try {
      await apiSend(`/api/tickets/${ticketId}/transition`, "POST", { to });
      // 服务端组件重新取数，列表与详情保持一致
      router.refresh();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (!window.confirm("确认删除这条工单？该操作不可撤销。")) return;
    setPending("delete");
    setError(null);
    try {
      await apiSend(`/api/tickets/${ticketId}`, "DELETE");
      router.push("/tickets");
      router.refresh();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">流转到</span>
      {nextStatuses.length === 0 ? (
        <span className="text-xs text-slate-400">当前状态没有可流转的下一跳</span>
      ) : (
        nextStatuses.map((next) => (
          <Button
            key={next}
            variant={next === "closed" ? "secondary" : "primary"}
            size="sm"
            disabled={pending !== null}
            onClick={() => transition(next)}
          >
            {pending === next ? "处理中…" : STATUS_LABELS[next]}
          </Button>
        ))
      )}
      {status === "closed" ? (
        <Button variant="ghost" size="sm" disabled={pending !== null} onClick={remove}>
          删除工单
        </Button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
