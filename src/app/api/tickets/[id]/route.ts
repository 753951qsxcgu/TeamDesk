import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/current-user";
import { updateTicketSchema } from "@/lib/domain/validation";
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
    return getServices().tickets.get(id);
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    const user = await requireUser();
    const payload = parseOrThrow(updateTicketSchema, await readJsonBody(request));
    return getServices().tickets.update(id, payload, { id: user.id, role: user.role });
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    const user = await requireUser();
    return getServices().tickets.remove(id, { id: user.id, role: user.role });
  });
}
