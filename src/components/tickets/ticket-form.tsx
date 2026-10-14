"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TICKET_PRIORITIES, type PublicUser, type TagRecord, type TicketPriority } from "@/lib/domain/types";
import { PRIORITY_LABELS } from "@/lib/domain/ticket-status";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";

export interface TicketFormValues {
  title: string;
  description: string;
  priority: TicketPriority;
  assigneeId: string;
  tagIds: string[];
}

export interface TicketFormProps {
  users: PublicUser[];
  tags: TagRecord[];
  /** 传入则为编辑模式 */
  ticketId?: string;
  initialValues?: Partial<TicketFormValues>;
}

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500";

export function TicketForm({ users, tags, ticketId, initialValues }: TicketFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<TicketFormValues>({
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    priority: initialValues?.priority ?? "medium",
    assigneeId: initialValues?.assigneeId ?? "",
    tagIds: initialValues?.tagIds ?? [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleTag(tagId: string) {
    setValues((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId)
        ? current.tagIds.filter((id) => id !== tagId)
        : [...current.tagIds, tagId],
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // 报告人与评论作者由服务端从会话里取，不在这里传
      const payload = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        assigneeId: values.assigneeId === "" ? null : values.assigneeId,
        tagIds: values.tagIds,
      };

      if (ticketId) {
        await apiSend(`/api/tickets/${ticketId}`, "PATCH", payload);
        router.push(`/tickets/${ticketId}`);
      } else {
        const created = await apiSend<{ id: string }>("/api/tickets", "POST", payload);
        router.push(`/tickets/${created.id}`);
      }
      router.refresh();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">标题</span>
        <input
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          maxLength={120}
          placeholder="一句话描述问题"
          className={INPUT_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">描述</span>
        <textarea
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="复现步骤、影响范围、期望结果…"
          className={INPUT_CLASS}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">优先级</span>
          <select
            value={values.priority}
            onChange={(event) => update("priority", event.target.value as TicketPriority)}
            className={INPUT_CLASS}
          >
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">经办人</span>
          <select
            value={values.assigneeId}
            onChange={(event) => update("assigneeId", event.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">暂不指派</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">标签</legend>
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <span className="text-sm text-slate-400">还没有标签</span>
          ) : (
            tags.map((tag) => {
              const active = values.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
                    active ? "text-white" : "bg-white text-slate-600 ring-slate-300"
                  }`}
                  style={active ? { backgroundColor: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              );
            })
          )}
        </div>
      </fieldset>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center gap-2">
        <Button disabled={submitting} onClick={submit}>
          {submitting ? "提交中…" : ticketId ? "保存修改" : "创建工单"}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </div>
  );
}
