import type { TicketPriority, TicketStatus } from "@/lib/domain/types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain/ticket-status";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT = {
  open: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "muted",
} as const;

const PRIORITY_VARIANT = {
  low: "muted",
  medium: "default",
  high: "warning",
  urgent: "danger",
} as const;

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
