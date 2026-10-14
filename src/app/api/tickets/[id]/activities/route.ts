import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 活动流只读，与评论分开，便于详情页按需渲染 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    await requireUser();
    return getServices().tickets.listActivities(id);
  });
}
