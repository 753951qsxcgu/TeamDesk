import Link from "next/link";
import { redirect } from "next/navigation";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { SlaBadge } from "@/components/tickets/sla-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { evaluateSla } from "@/lib/domain/sla";
import { PRIORITY_LABELS } from "@/lib/domain/ticket-status";
import type { TicketDetail } from "@/lib/domain/types";
import { getServices } from "@/lib/services/container";
import { formatRelative } from "@/lib/web/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

function TicketLines({ tickets, empty }: { tickets: TicketDetail[]; empty: string }) {
  if (tickets.length === 0) {
    return <p className="px-5 py-4 text-sm text-slate-400">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="flex items-center gap-3 px-5 py-3">
          <Link
            href={`/tickets/${ticket.id}`}
            className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-blue-700"
          >
            {ticket.title}
          </Link>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="w-20 text-right text-xs text-slate-400">
            {formatRelative(ticket.updatedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 工作台：登录后第一眼看到与自己相关的待办，而不是全局列表 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const services = getServices();
  const reported = services.tickets.list({ reporterId: user.id, pageSize: PAGE_SIZE }).items;
  const assigned = services.tickets.list({ assigneeId: user.id, pageSize: PAGE_SIZE }).items;

  // 未 closing 的工单才有超时一说；两个状态各查一次再合并
  const active = [
    ...services.tickets.list({ status: "open", pageSize: 100 }).items,
    ...services.tickets.list({ status: "in_progress", pageSize: 100 }).items,
  ];
  const overdue = active
    .map((ticket) => ({
      ticket,
      sla: evaluateSla({
        createdAt: ticket.createdAt,
        priority: ticket.priority,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
      }),
    }))
    .filter((item) => item.sla.overdue)
    .sort((a, b) => a.sla.hoursLeft - b.sla.hoursLeft)
    .slice(0, PAGE_SIZE);

  const overview = services.stats.overview();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "工单总数", value: overview.total },
          { label: "待处理", value: overview.byStatus.open ?? 0 },
          { label: "处理中", value: overview.byStatus.in_progress ?? 0 },
          { label: "已解决", value: overview.byStatus.resolved ?? 0 },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="已超时未处理"
          description={`按优先级承诺的响应时限计算，最多显示 ${PAGE_SIZE} 条`}
        />
        <CardContent className="p-0">
          {overdue.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">没有超时的工单</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overdue.map(({ ticket, sla }) => (
                <li key={ticket.id} className="flex items-center gap-3 px-5 py-3">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-blue-700"
                  >
                    {ticket.title}
                  </Link>
                  <span className="text-xs text-slate-500">{PRIORITY_LABELS[ticket.priority]}</span>
                  <SlaBadge state={sla} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="指派给我的" />
          <CardContent className="p-0">
            <TicketLines tickets={assigned} empty="没有指派给你的工单" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="我创建的" />
          <CardContent className="p-0">
            <TicketLines tickets={reported} empty="你还没有创建过工单" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
