import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain/ticket-status";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/domain/types";
import { getServices } from "@/lib/services/container";
import { formatDuration } from "@/lib/web/format";

export const dynamic = "force-dynamic";

const STATUS_BAR_COLOR: Record<string, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  resolved: "bg-emerald-500",
  closed: "bg-slate-400",
};

const PRIORITY_BAR_COLOR: Record<string, string> = {
  low: "bg-slate-300",
  medium: "bg-blue-400",
  high: "bg-amber-500",
  urgent: "bg-red-500",
};

function DistributionBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value} · {percent}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
        <div className={`h-full rounded ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default async function StatsPage() {
  const overview = getServices().stats.overview();
  const weekTotal = overview.trend.reduce((sum, point) => sum + point.total, 0);
  const trendMax = Math.max(1, ...overview.trend.map((point) => point.total));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "工单总数", value: String(overview.total) },
          { label: "未指派", value: String(overview.unassigned) },
          { label: "近 7 日新建", value: String(weekTotal) },
          { label: "平均解决时长", value: formatDuration(overview.averageResolutionHours) },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="py-4">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="状态分布" />
          <CardContent className="space-y-3">
            {TICKET_STATUSES.map((status) => (
              <DistributionBar
                key={status}
                label={STATUS_LABELS[status]}
                value={overview.byStatus[status]}
                total={overview.total}
                color={STATUS_BAR_COLOR[status] ?? "bg-slate-400"}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="优先级分布" />
          <CardContent className="space-y-3">
            {TICKET_PRIORITIES.map((priority) => (
              <DistributionBar
                key={priority}
                label={PRIORITY_LABELS[priority]}
                value={overview.byPriority[priority]}
                total={overview.total}
                color={PRIORITY_BAR_COLOR[priority] ?? "bg-slate-300"}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="近 7 日新建趋势" description="按工单创建时间统计，缺失日期补 0" />
        <CardContent>
          <div className="flex h-40 items-end gap-3">
            {overview.trend.map((point) => (
              <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs text-slate-500">{point.total}</span>
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{ height: `${Math.round((point.total / trendMax) * 100)}%` }}
                />
                <span className="text-xs text-slate-400">{point.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="未关闭工单的经办人负载" description="仅统计待处理与处理中" />
        <CardContent>
          {overview.assigneeLoad.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">暂无已指派且未关闭的工单</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {overview.assigneeLoad.map((row) => (
                <li key={row.userId} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-700">{row.name}</span>
                  <span className="text-slate-500">{row.openCount} 条</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
