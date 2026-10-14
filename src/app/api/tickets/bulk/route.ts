import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/current-user";
import { bulkUpdateSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 批量更新：一次改多条工单的状态 / 优先级 / 经办人。
 * 逐条鉴权与状态机校验，部分失败返回 skipped 明细，不做整体回滚。
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const payload = parseOrThrow(bulkUpdateSchema, await readJsonBody(request));
    return getServices().tickets.bulkUpdate(payload.ids, payload, { id: user.id, role: user.role });
  });
}
