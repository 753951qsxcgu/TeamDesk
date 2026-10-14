import { cookies } from "next/headers";
import { handle } from "@/lib/api/response";
import { SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  return handle(async () => {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return { loggedOut: true };
  });
}
