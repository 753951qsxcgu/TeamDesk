import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/current-user";
import { ticketImportSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 批量导入：接收 CSV 文本，逐行建工单，导入人一律是会话身份。
 * dryRun=true 时只做校验，用来在页面上先预览会跳过哪些行。
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const payload = parseOrThrow(ticketImportSchema, await readJsonBody(request));
    return getServices().tickets.importTickets(payload, { id: user.id, role: user.role });
  });
}
