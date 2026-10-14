"use client";

import Link from "next/link";
import { useState } from "react";
import { TicketBulkBar } from "@/components/tickets/ticket-bulk-bar";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { SlaBadge } from "@/components/tickets/sla-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { PublicUser, TicketDetail } from "@/lib/domain/types";
import type { SlaState } from "@/lib/domain/sla";
import { formatRelative } from "@/lib/web/format";

export interface TicketTableProps {
  tickets: TicketDetail[];
  /** 批量指派时可选的经办人 */
  users: PublicUser[];
  /**
   * SLA 由服务端算好再传进来：表格是客户端组件，
   * 在客户端用 Date.now() 重算会和 SSR 结果不一致，导致 hydration 不匹配。
   */
  slaById: Record<string, SlaState>;
}

export function TicketTable({ tickets, users, slaById }: TicketTableProps) {
  const [selected, setSelected] = useState<string[]>([]);

  if (tickets.length === 0) {
    return <EmptyState title="没有符合条件的工单" description="换个筛选条件，或新建一条工单试试" />;
  }

  const allSelected = selected.length === tickets.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : tickets.map((ticket) => ticket.id));
  }

  return (
    <div>
      <TicketBulkBar selectedIds={selected} users={users} onFinished={() => setSelected([])} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="全选当前页工单"
                />
              </th>
              <th className="px-3 py-2 font-medium">标题</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium">优先级</th>
              <th className="px-3 py-2 font-medium">经办人</th>
              <th className="px-3 py-2 font-medium">标签</th>
              <th className="px-3 py-2 font-medium">评论</th>
              <th className="px-3 py-2 font-medium">SLA</th>
              <th className="px-5 py-2 font-medium">更新</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className={
                  selected.includes(ticket.id) ? "bg-blue-50/60" : "hover:bg-slate-50"
                }
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(ticket.id)}
                    onChange={() => toggle(ticket.id)}
                    aria-label={`选择工单：${ticket.title}`}
                  />
                </td>
                <td className="max-w-md px-3 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="font-medium text-slate-900 hover:text-blue-700"
                  >
                    {ticket.title}
                  </Link>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{ticket.description}</p>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-3 py-3 text-slate-600">{ticket.assignee?.name ?? "未指派"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.length === 0 ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      ticket.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded px-1.5 py-0.5 text-xs text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-500">{ticket.commentCount}</td>
                <td className="px-3 py-3">
                  {slaById[ticket.id] ? (
                    <SlaBadge
                      state={slaById[ticket.id]!}
                      settled={Boolean(ticket.resolvedAt ?? ticket.closedAt)}
                    />
                  ) : null}
                </td>
                <td className="px-5 py-3 text-slate-500">{formatRelative(ticket.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
