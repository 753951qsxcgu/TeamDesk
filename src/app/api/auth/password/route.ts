import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/current-user";
import { changePasswordSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 修改当前登录用户的密码。只认会话身份，不接受任何用户 id 参数，
 * 避免出现「改别人密码」的接口。
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    const payload = parseOrThrow(changePasswordSchema, await readJsonBody(request));
    getServices().users.changePassword(user.id, payload.currentPassword, payload.newPassword);
    return { id: user.id };
  });
}
