import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { transitionSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 状态流转单独成接口，避免和字段更新混在一起后难以审计 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    const payload = parseOrThrow(transitionSchema, await readJsonBody(request));
    // 鉴权接入前，流转说明默认记在报告人名下
    return getServices().tickets.transition(id, payload);
  });
}
