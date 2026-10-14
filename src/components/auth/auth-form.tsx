"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiSend, toErrorMessage } from "@/lib/web/api-client";

type Mode = "login" | "register";

export function AuthForm({ nextPath = "/tickets" }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await apiSend("/api/auth/login", "POST", { email, password });
      } else {
        await apiSend("/api/auth/register", "POST", { email, name, password });
        // 注册后自动登录，避免让用户再输一次
        await apiSend("/api/auth/login", "POST", { email, password });
      }
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(toErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md bg-slate-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded px-3 py-1.5 ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded px-3 py-1.5 ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          注册
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">邮箱</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
        />
      </label>

      {mode === "register" ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">姓名</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
          />
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-700">密码</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500"
        />
        {mode === "register" ? (
          <span className="text-xs text-slate-400">至少 8 位</span>
        ) : null}
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button className="w-full" disabled={submitting} onClick={submit}>
        {submitting ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
      </Button>
    </div>
  );
}
