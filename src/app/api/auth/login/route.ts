import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { handle } from "@/lib/api/response";
import { parseOrThrow, readJsonBody } from "@/lib/api/validate";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/domain/validation";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const payload = parseOrThrow(loginSchema, await readJsonBody(request));
    const user = getServices().users.authenticate(payload.email, payload.password);

    const store = await cookies();
    store.set(SESSION_COOKIE, signSession(user.id), SESSION_COOKIE_OPTIONS);

    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  });
}
