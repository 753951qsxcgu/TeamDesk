import Link from "next/link";
import { PriorityBadge } from "@/components/tickets/badges";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_LABELS } from "@/lib/domain/ticket-status";
import { TICKET_STATUSES, type TicketDetail, type TicketStatus } from "@/lib/domain/types";
import { getServices } from "@/lib/services/container";
import { formatRelative } from "@/lib/web/format";

export const dynamic = "force-dynamic";

const COLUMN_ACCENT: Record<TicketStatus, string> = {
  open: "border-t-blue-500",
  in_progress: "border-t-amber-500",
  resolved: "border-t-emerald-500",
  closed: "border-t-slate-400",
};

/** 看板一次取全量（上限 100 条）后按状态分组，不做分页，避免拖拽语义被分页割裂 */
export default async function BoardPage() {
  const { items } = getServices().tickets.list({ pageSize: 100, sort: "priority", order: "desc" });

  const grouped = new Map<TicketStatus, TicketDetail[]>(TICKET_STATUSES.map((s) => [s, []]));
  for (const ticket of items) {
    grouped.get(ticket.status)?.push(ticket);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">按状态分组查看当前工单，最多展示 100 条</div>
        <Link
          href="/tickets"
          className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          切换到列表
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TICKET_STATUSES.map((status) => {
          const tickets = grouped.get(status) ?? [];
          return (
            <Card key={status} className={`border-t-4 ${COLUMN_ACCENT[status]}`}>
              <CardHeader
                title={
                  <span className="flex items-center justify-between">
                    {STATUS_LABELS[status]}
                    <span className="text-xs font-normal text-slate-500">{tickets.length}</span>
                  </span>
                }
              />
              <CardContent className="space-y-3">
                {tickets.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">暂无工单</p>
                ) : (
                  tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/tickets/${ticket.id}`}
                      className="block rounded-md border border-slate-200 p-3 transition-colors hover:border-blue-300 hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{ticket.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <PriorityBadge priority={ticket.priority} />
                        <span className="text-xs text-slate-400">
                          {ticket.assignee?.name ?? "未指派"}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <span>{formatRelative(ticket.updatedAt)}</span>
                        {ticket.commentCount > 0 ? <span>· {ticket.commentCount} 条评论</span> : null}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="还没有任何工单" description="先创建一条工单，看板会自动分列" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
