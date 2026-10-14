"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSend } from "@/lib/web/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await apiSend("/api/auth/logout", "POST");
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="rounded-md px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "退出中…" : "退出登录"}
    </button>
  );
}
