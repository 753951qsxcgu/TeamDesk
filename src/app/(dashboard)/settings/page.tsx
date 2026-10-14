import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getServices } from "@/lib/services/container";
import { formatDateTime } from "@/lib/web/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const created = getServices().users.list().find((item) => item.id === user.id);

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader title="账号信息" description="姓名与角色由管理员维护，暂不支持自行修改" />
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">姓名</dt>
              <dd className="text-slate-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">邮箱</dt>
              <dd className="text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">角色</dt>
              <dd className="text-slate-900">{user.role === "admin" ? "管理员" : "成员"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">注册时间</dt>
              <dd className="text-slate-900">
                {created ? formatDateTime(created.createdAt) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="修改密码" description="需要先输入当前密码，防止会话被盗后直接改密" />
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
