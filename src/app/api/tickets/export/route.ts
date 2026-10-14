import type { NextRequest } from "next/server";
import { fail } from "@/lib/api/response";
import { parseOrThrow, searchParamsToObject } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/current-user";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/domain/ticket-status";
import { ticketListQuerySchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_LIMIT = 1000;

/**
 * 导出当前筛选条件下的工单为 CSV。
 * 走独立接口而不是复用列表接口的 JSON，便于直接给浏览器下载。
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const query = parseOrThrow(
      ticketListQuerySchema,
      searchParamsToObject(request.nextUrl.searchParams),
    );

    const { items } = getServices().tickets.list({
      ...query,
      assigneeId: query.assigneeId === "none" ? null : query.assigneeId,
      page: 1,
      pageSize: EXPORT_LIMIT,
    });

    const csv = toCsv(
      ["标题", "状态", "优先级", "报告人", "经办人", "标签", "评论数", "创建时间", "更新时间"],
      items.map((ticket) => [
        ticket.title,
        STATUS_LABELS[ticket.status],
        PRIORITY_LABELS[ticket.priority],
        ticket.reporter?.name ?? "",
        ticket.assignee?.name ?? "未指派",
        ticket.tags.map((tag) => tag.name).join(" / "),
        ticket.commentCount,
        ticket.createdAt,
        ticket.updatedAt,
      ]),
    );

    const filename = `teamdesk-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
