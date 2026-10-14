import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth/current-user";

const NAV_ITEMS = [
  { href: "/tickets", label: "工单列表" },
  { href: "/tickets/new", label: "新建工单" },
];

/**
 * 登录守卫放在这个 layout 里：所有业务页面都在 (dashboard) 分组下，
 * 未登录统一跳登录页。刻意不用 middleware，避免把原生模块带进 Edge 运行时。
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">
            T
          </span>
          <span className="text-base font-semibold text-slate-900">TeamDesk</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-400">
          工单协作 · 本地演示环境
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-sm font-medium text-slate-700">团队工单协作</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/tickets/new"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              新建工单
            </Link>
            <span className="text-sm text-slate-600">
              {user.name}
              <span className="ml-1 text-xs text-slate-400">
                {user.role === "admin" ? "管理员" : "成员"}
              </span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
