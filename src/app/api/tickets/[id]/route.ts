import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { updateTicketSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(() => getServices().tickets.get(id));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(async () => {
    const payload = parseOrThrow(updateTicketSchema, await readJsonBody(request));
    return getServices().tickets.update(id, payload);
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handle(() => getServices().tickets.remove(id));
}
