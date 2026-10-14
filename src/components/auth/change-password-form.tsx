"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";

/** 修改密码：提交后清空输入框，避免旧密码留在 DOM 里 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function submit() {
    setPending(true);
    setMessage(null);
    try {
      await apiSend("/api/auth/password", "POST", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ type: "ok", text: "密码已更新，下次登录请使用新密码" });
    } catch (error) {
      setMessage({ type: "error", text: toErrorMessage(error) });
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "h-9 w-full max-w-xs rounded-md border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1">
        <label className="block text-sm text-slate-700" htmlFor="current-password">
          当前密码
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-slate-700" htmlFor="new-password">
          新密码（至少 8 位）
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "提交中…" : "修改密码"}
        </Button>
        {message ? (
          <span className={message.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
            {message.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}
