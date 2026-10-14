import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // 已登录就不再展示登录页
  if (await getCurrentUser()) {
    redirect("/tickets");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            T
          </span>
          <span className="text-lg font-semibold text-slate-900">TeamDesk</span>
        </div>

        <Card>
          <CardHeader title="登录 TeamDesk" description="使用邮箱登录，或注册一个新账号" />
          <CardContent>
            <AuthForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          本地演示账号：admin@teamdesk.dev / teamdesk-admin（执行 npm run db:seed 后可用）
        </p>
      </div>
    </div>
  );
}
