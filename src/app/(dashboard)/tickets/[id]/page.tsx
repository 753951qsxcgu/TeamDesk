import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/tickets/activity-timeline";
import { CommentPanel } from "@/components/tickets/comment-panel";
import { PriorityBadge, StatusBadge } from "@/components/tickets/badges";
import { TicketActions } from "@/components/tickets/ticket-actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AppError } from "@/lib/domain/errors";
import { allowedNextStatuses } from "@/lib/domain/ticket-status";
import { getServices } from "@/lib/services/container";
import { formatDateTime, formatRelative } from "@/lib/web/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params;
  const services = getServices();

  let ticket;
  let comments;
  let activities;
  try {
    ticket = services.tickets.get(id);
    comments = services.tickets.listComments(id);
    activities = services.tickets.listActivities(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const nextStatuses = allowedNextStatuses(ticket.status);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/tickets" className="hover:text-blue-700">
          工单列表
        </Link>
        <span>/</span>
        <span className="text-slate-700">工单详情</span>
      </div>

      <Card>
        <CardHeader
          title={ticket.title}
          action={
            <Link
              href={`/tickets/${ticket.id}/edit`}
              className="rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              编辑
            </Link>
          }
          description={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span>由 {ticket.reporter?.name ?? "未知用户"} 创建</span>
              <span>·</span>
              <span>{formatRelative(ticket.createdAt)}</span>
            </span>
          }
        />
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {ticket.description || "（暂无描述）"}
          </p>

          <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <dt className="text-xs text-slate-500">经办人</dt>
              <dd className="mt-0.5 text-slate-800">{ticket.assignee?.name ?? "未指派"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">标签</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1">
                {ticket.tags.length === 0 ? (
                  <span className="text-slate-400">—</span>
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
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">解决时间</dt>
              <dd className="mt-0.5 text-slate-800">{formatDateTime(ticket.resolvedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">关闭时间</dt>
              <dd className="mt-0.5 text-slate-800">{formatDateTime(ticket.closedAt)}</dd>
            </div>
          </dl>

          <div className="border-t border-slate-200 pt-4">
            <TicketActions
              ticketId={ticket.id}
              status={ticket.status}
              nextStatuses={nextStatuses}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="操作记录" description="状态、优先级、经办人的变化都会留痕" />
        <CardContent>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={`评论（${comments.length}）`} />
        <CardContent>
          <CommentPanel ticketId={ticket.id} comments={comments} />
        </CardContent>
      </Card>
    </div>
  );
}
