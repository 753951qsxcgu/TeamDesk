import { TicketForm } from "@/components/tickets/ticket-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getServices } from "@/lib/services/container";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  const services = getServices();
  const users = services.users.list();
  const tags = services.tags.list();

  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState title="还没有用户" description="先执行 npm run db:seed 写入演示数据" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-500">工单列表 / 新建</div>
      <Card>
        <CardHeader title="新建工单" description="创建后默认进入「待处理」状态" />
        <CardContent>
          <TicketForm users={users} tags={tags} />
        </CardContent>
      </Card>
    </div>
  );
}
