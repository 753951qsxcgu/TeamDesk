"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain/ticket-status";
import { TICKET_PRIORITIES, TICKET_STATUSES, type PublicUser } from "@/lib/domain/types";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";

export interface TicketBulkBarProps {
  selectedIds: string[];
  users: PublicUser[];
  onFinished: () => void;
}

const SELECT_CLASS = "h-8 rounded-md border border-slate-300 bg-white px-2 text-sm";

/** 选中若干工单后出现的批量操作条：改状态、改优先级、改经办人 */
export function TicketBulkBar({ selectedIds, users, onFinished }: TicketBulkBarProps) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  async function apply() {
    const patch: Record<string, unknown> = {};
    if (status) patch.status = status;
    if (priority) patch.priority = priority;
    if (assigneeId) patch.assigneeId = assigneeId === "none" ? null : assigneeId;
    if (Object.keys(patch).length === 0) {
      setMessage("先选择要修改的字段");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const result = await apiSend<{ updated: number; skipped: { id: string; reason: string }[] }>(
        "/api/tickets/bulk",
        "POST",
        { ids: selectedIds, ...patch },
      );
      setMessage(
        result.skipped.length === 0
          ? `已更新 ${result.updated} 条`
          : `已更新 ${result.updated} 条，跳过 ${result.skipped.length} 条：${
              result.skipped[0]?.reason ?? ""
            }`,
      );
      onFinished();
      router.refresh();
    } catch (error) {
      setMessage(toErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-3">
      <span className="text-sm text-blue-900">已选 {selectedIds.length} 条</span>

      <select value={status} onChange={(event) => setStatus(event.target.value)} className={SELECT_CLASS}>
        <option value="">改状态…</option>
        {TICKET_STATUSES.map((item) => (
          <option key={item} value={item}>
            {STATUS_LABELS[item]}
          </option>
        ))}
      </select>

      <select
        value={priority}
        onChange={(event) => setPriority(event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">改优先级…</option>
        {TICKET_PRIORITIES.map((item) => (
          <option key={item} value={item}>
            {PRIORITY_LABELS[item]}
          </option>
        ))}
      </select>

      <select
        value={assigneeId}
        onChange={(event) => setAssigneeId(event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">改经办人…</option>
        <option value="none">取消指派</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>

      <Button size="sm" disabled={pending} onClick={apply}>
        {pending ? "处理中…" : "应用"}
      </Button>
      <button type="button" onClick={onFinished} className="text-sm text-slate-500 hover:text-slate-700">
        取消选择
      </button>
      {message ? <span className="text-xs text-slate-600">{message}</span> : null}
    </div>
  );
}
