"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CommentWithAuthor } from "@/lib/repositories/comment-repository";
import type { PublicUser } from "@/lib/domain/types";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";
import { formatRelative } from "@/lib/web/format";

export interface CommentPanelProps {
  ticketId: string;
  comments: CommentWithAuthor[];
  /** 演示阶段的身份选择，M5 接入会话后改为从登录态取 */
  users: PublicUser[];
  defaultAuthorId: string;
}

export function CommentPanel({ ticketId, comments, users, defaultAuthorId }: CommentPanelProps) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState(defaultAuthorId);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) {
      setError("评论内容不能为空");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiSend(`/api/tickets/${ticketId}/comments`, "POST", { body, authorId });
      setBody("");
      router.refresh();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {comments.length === 0 ? (
          <li className="text-sm text-slate-400">还没有评论，来写第一条。</li>
        ) : (
          comments.map((comment) => (
            <li key={comment.id} className="rounded-md bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{comment.author?.name ?? "未知用户"}</span>
                <span>{formatRelative(comment.createdAt)}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
            </li>
          ))
        )}
      </ul>

      <div className="space-y-2 border-t border-slate-200 pt-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="补充进展、定位结论或交接说明…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            以身份
            <select
              value={authorId}
              onChange={(event) => setAuthorId(event.target.value)}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" disabled={submitting} onClick={submit}>
            {submitting ? "提交中…" : "发表评论"}
          </Button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
