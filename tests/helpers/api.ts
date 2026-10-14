/**
 * 接口集成测试的公共装配：把数据库指向内存库，然后动态加载路由模块，
 * 保证 TEAMDESK_DB_PATH 在 getDb() 首次调用之前生效。
 */
import { NextRequest } from "next/server";
import type { PublicUser, TagRecord } from "@/lib/domain/types";

export interface ApiHarness {
  admin: PublicUser;
  member: PublicUser;
  tag: TagRecord;
  routes: {
    list: typeof import("@/app/api/tickets/route");
    detail: typeof import("@/app/api/tickets/[id]/route");
    transition: typeof import("@/app/api/tickets/[id]/transition/route");
    comments: typeof import("@/app/api/tickets/[id]/comments/route");
    tags: typeof import("@/app/api/tags/route");
  };
}

export async function setupApi(): Promise<ApiHarness> {
  process.env.TEAMDESK_DB_PATH = ":memory:";

  const { getDb } = await import("@/lib/db/connection");
  const { createServices } = await import("@/lib/services/container");
  const services = createServices(getDb());

  const admin = services.users.register({
    email: "admin@teamdesk.test",
    name: "管理员",
    password: "teamdesk-admin",
    role: "admin",
  });
  const member = services.users.register({
    email: "member@teamdesk.test",
    name: "成员",
    password: "teamdesk-member",
  });
  const tag = services.tags.create("登录", "#2563eb");

  return {
    admin,
    member,
    tag,
    routes: {
      list: await import("@/app/api/tickets/route"),
      detail: await import("@/app/api/tickets/[id]/route"),
      transition: await import("@/app/api/tickets/[id]/transition/route"),
      comments: await import("@/app/api/tickets/[id]/comments/route"),
      tags: await import("@/app/api/tags/route"),
    },
  };
}

export function jsonRequest(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
