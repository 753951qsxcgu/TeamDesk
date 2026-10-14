import Link from "next/link";
import { TicketFilters } from "@/components/tickets/ticket-filters";
import { TicketTable } from "@/components/tickets/ticket-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/domain/types";
import type { TicketPriority, TicketQuery, TicketStatus } from "@/lib/domain/types";
import { evaluateSla } from "@/lib/domain/sla";
import { getServices } from "@/lib/services/container";
import { buildQuery } from "@/lib/web/query";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  searchParams: Promise<SearchParams>;
}

function readParam(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}

function readEnum<T extends string>(params: SearchParams, key: string, allowed: readonly T[]): T | undefined {
  const value = readParam(params, key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** 列表页直接读 service，不绕一圈 HTTP，服务端渲染拿到的就是最终数据 */
export default async function TicketsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const services = getServices();

  const keyword = readParam(params, "keyword");
  const status = readEnum<TicketStatus>(params, "status", TICKET_STATUSES);
  const priority = readEnum<TicketPriority>(params, "priority", TICKET_PRIORITIES);
  const assigneeId = readParam(params, "assigneeId");
  const tagId = readParam(params, "tagId");
  const page = Number(readParam(params, "page") ?? "1");
  const pageSizeRaw = Number(readParam(params, "pageSize") ?? "20");
  // 排序字段与方向走白名单，非法值回落默认，避免直接透传给 SQL
  const sortParam = readParam(params, "sort");
  const sort: TicketQuery["sort"] =
    sortParam === "created_at" || sortParam === "priority" ? sortParam : "updated_at";
  const order: TicketQuery["order"] = readParam(params, "order") === "asc" ? "asc" : "desc";

  const query: TicketQuery = {
    keyword,
    status,
    priority,
    // 约定 "none" 表示筛选未指派的工单
    assigneeId: assigneeId === "none" ? null : assigneeId,
    tagId,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20,
    sort,
    order,
  };

  const result = services.tickets.list(query);
  const users = services.users.list();
  const tags = services.tags.list();

  const slaById = Object.fromEntries(
    result.items.map((ticket) => [
      ticket.id,
      evaluateSla({
        createdAt: ticket.createdAt,
        priority: ticket.priority,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
      }),
    ]),
  );

  // 导出走同一个筛选条件，用户看到什么就导出什么
  const exportHref = `/api/tickets/export${buildQuery({
    keyword,
    status,
    priority,
    assigneeId,
    tagId,
    sort,
    order,
  })}`;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="筛选工单" description="组合条件后点击筛选，条件会写进地址栏便于分享" />
        <CardContent>
          <TicketFilters
            defaultValues={{ keyword, status, priority, assigneeId, tagId, sort, order }}
            users={users}
            tags={tags}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={`工单列表（${result.total}）`}
          action={
            <div className="flex items-center gap-2">
              <a
                href={exportHref}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                导出 CSV
              </a>
              <Link
                href="/tickets/new"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                新建
              </Link>
            </div>
          }
        />
        <TicketTable tickets={result.items} users={users} slaById={slaById} />
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/tickets"
          filters={{ keyword, status, priority, assigneeId, tagId, sort, order, pageSize: String(query.pageSize) }}
        />
      </Card>
    </div>
  );
}
