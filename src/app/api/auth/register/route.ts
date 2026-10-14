import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { registerSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const payload = parseOrThrow(registerSchema, await readJsonBody(request));
    return getServices().users.register(payload);
  });
}
