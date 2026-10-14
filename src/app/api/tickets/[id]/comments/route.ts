import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/current-user";
import { createCommentSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    await requireUser();
    return getServices().tickets.listComments(id);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    const user = await requireUser();
    const payload = parseOrThrow(createCommentSchema, await readJsonBody(request));
    // 评论作者一律取会话身份
    return getServices().tickets.addComment(id, payload, user.id);
  });
}
