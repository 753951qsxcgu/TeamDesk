import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody, searchParamsToObject } from "@/lib/api/validate";
import { createTicketSchema, ticketListQuerySchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

// better-sqlite3 是原生模块，只能在 Node 运行时下工作
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(() => {
    const query = parseOrThrow(
      ticketListQuerySchema,
      searchParamsToObject(request.nextUrl.searchParams),
    );
    return getServices().tickets.list({
      ...query,
      // 约定 assigneeId=none 表示「未指派」，与「不筛选」区分开
      assigneeId: query.assigneeId === "none" ? null : query.assigneeId,
    });
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const payload = parseOrThrow(createTicketSchema, await readJsonBody(request));
    return getServices().tickets.create(payload);
  });
}
