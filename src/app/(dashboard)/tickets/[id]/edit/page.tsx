import { notFound } from "next/navigation";
import { TicketForm } from "@/components/tickets/ticket-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AppError } from "@/lib/domain/errors";
import { getServices } from "@/lib/services/container";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTicketPage({ params }: PageProps) {
  const { id } = await params;
  const services = getServices();

  let ticket;
  try {
    ticket = services.tickets.get(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-5">
      <div className="text-sm text-slate-500">工单列表 / 编辑</div>
      <Card>
        <CardHeader title="编辑工单" description="状态变更请回到详情页走流转按钮，便于留痕" />
        <CardContent>
          <TicketForm
            users={services.users.list()}
            tags={services.tags.list()}
            ticketId={ticket.id}
            initialValues={{
              title: ticket.title,
              description: ticket.description,
              priority: ticket.priority,
              assigneeId: ticket.assigneeId ?? "",
              tagIds: ticket.tags.map((tag) => tag.id),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
