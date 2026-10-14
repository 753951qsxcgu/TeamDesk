import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain/ticket-status";
import type { TicketActivityWithActor, TicketPriority, TicketStatus } from "@/lib/domain/types";
import { formatRelative } from "@/lib/web/format";

const TYPE_LABEL: Record<TicketActivityWithActor["type"], string> = {
  created: "创建",
  status_changed: "状态",
  priority_changed: "优先级",
  assignee_changed: "经办人",
  commented: "评论",
  updated: "编辑",
};

function describe(activity: TicketActivityWithActor): string {
  switch (activity.type) {
    case "created":
      return "创建了这条工单";
    case "status_changed":
      return `${STATUS_LABELS[activity.fromValue as TicketStatus] ?? activity.fromValue} → ${
        STATUS_LABELS[activity.toValue as TicketStatus] ?? activity.toValue
      }`;
    case "priority_changed":
      return `${PRIORITY_LABELS[activity.fromValue as TicketPriority] ?? activity.fromValue} → ${
        PRIORITY_LABELS[activity.toValue as TicketPriority] ?? activity.toValue
      }`;
    case "assignee_changed":
      return `${activity.fromValue ?? "未指派"} → ${activity.toValue ?? "未指派"}`;
    case "commented":
      return activity.note ? `评论：${activity.note}` : "发表了评论";
    case "updated":
      return activity.note ?? "更新了工单内容";
  }
}

export function ActivityTimeline({ activities }: { activities: TicketActivityWithActor[] }) {
  if (activities.length === 0) {
    return <p className="py-4 text-sm text-slate-400">还没有操作记录。</p>;
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity) => (
        <li key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="mt-1 w-px flex-1 bg-slate-200" />
          </div>
          <div className="flex-1 pb-1">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">
                {activity.actor?.name ?? "系统"}
              </span>
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {TYPE_LABEL[activity.type]}
              </span>
              <span className="ml-2">{describe(activity)}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{formatRelative(activity.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
