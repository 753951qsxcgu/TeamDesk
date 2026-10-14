import { handle } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireUser();
    return getServices().stats.overview();
  });
}
