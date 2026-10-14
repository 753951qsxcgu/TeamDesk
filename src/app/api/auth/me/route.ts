import { handle } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AppError } from "@/lib/domain/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw AppError.unauthorized();
    return user;
  });
}
