import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { EmptyState } from "@/components/ui/empty-state";
import type { TicketDetail } from "@/lib/domain/types";
import { formatRelative } from "@/lib/web/format";

export function TicketTable({ tickets }: { tickets: TicketDetail[] }) {
  if (tickets.length === 0) {
    return <EmptyState title="没有符合条件的工单" description="换个筛选条件，或新建一条工单试试" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-2 font-medium">标题</th>
            <th className="px-3 py-2 font-medium">状态</th>
            <th className="px-3 py-2 font-medium">优先级</th>
            <th className="px-3 py-2 font-medium">经办人</th>
            <th className="px-3 py-2 font-medium">标签</th>
            <th className="px-3 py-2 font-medium">评论</th>
            <th className="px-5 py-2 font-medium">更新</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-slate-50">
              <td className="max-w-md px-5 py-3">
                <Link href={`/tickets/${ticket.id}`} className="font-medium text-slate-900 hover:text-blue-700">
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
              <td className="px-5 py-3 text-slate-500">{formatRelative(ticket.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
