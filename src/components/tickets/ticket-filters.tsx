/**
 * 筛选表单：直接用原生 GET 表单提交，把条件写进查询串，
 * 不需要额外的客户端 JS，也能被服务端组件直接读到。
 */
import type { PublicUser, TagRecord } from "@/lib/domain/types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/domain/ticket-status";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/domain/types";

export interface TicketFiltersProps {
  defaultValues: {
    keyword?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    tagId?: string;
  };
  users: PublicUser[];
  tags: TagRecord[];
}

const SELECT_CLASS =
  "h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-blue-500";

export function TicketFilters({ defaultValues, users, tags }: TicketFiltersProps) {
  return (
    <form method="get" action="/tickets" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        关键词
        <input
          type="search"
          name="keyword"
          defaultValue={defaultValues.keyword ?? ""}
          placeholder="标题或描述"
          className="h-9 w-56 rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        状态
        <select name="status" defaultValue={defaultValues.status ?? ""} className={SELECT_CLASS}>
          <option value="">全部</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        优先级
        <select name="priority" defaultValue={defaultValues.priority ?? ""} className={SELECT_CLASS}>
          <option value="">全部</option>
          {TICKET_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        经办人
        <select
          name="assigneeId"
          defaultValue={defaultValues.assigneeId ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">全部</option>
          <option value="none">未指派</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        标签
        <select name="tagId" defaultValue={defaultValues.tagId ?? ""} className={SELECT_CLASS}>
          <option value="">全部</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
      >
        筛选
      </button>
      <a
        href="/tickets"
        className="h-9 rounded-md bg-white px-4 text-sm leading-9 text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
      >
        重置
      </a>
    </form>
  );
}
