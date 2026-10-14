import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { jsonRequest, setupApi, type ApiHarness } from "../helpers/api";

const BASE = "http://localhost:3000/api";

let harness: ApiHarness;

beforeAll(async () => {
  harness = await setupApi();
});

async function createTicket(title: string, extra: Record<string, unknown> = {}) {
  const response = await harness.routes.list.POST(
    jsonRequest(`${BASE}/tickets`, "POST", {
      title,
      reporterId: harness.admin.id,
      ...extra,
    }),
  );
  return (await response.json()) as {
    ok: boolean;
    data?: { id: string; status: string; title: string; tags: { id: string }[] };
    error?: { code: string; message: string; details?: unknown };
  };
}

describe("GET /api/tickets", () => {
  it("返回分页结构", async () => {
    await createTicket("列表分页工单 A");
    await createTicket("列表分页工单 B");

    const response = await harness.routes.list.GET(
      new NextRequest(`${BASE}/tickets?page=1&pageSize=1`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(2);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.pageSize).toBe(1);
  });

  it("按状态筛选", async () => {
    await createTicket("待筛选的工单");

    const response = await harness.routes.list.GET(new NextRequest(`${BASE}/tickets?status=open`));
    const body = await response.json();

    expect(body.data.items.every((item: { status: string }) => item.status === "open")).toBe(true);
  });

  it("非法状态返回 400", async () => {
    const response = await harness.routes.list.GET(
      new NextRequest(`${BASE}/tickets?status=not-a-status`),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/tickets", () => {
  it("创建成功并带出关联对象", async () => {
    const body = await createTicket("新建工单", {
      description: "接口创建的工单",
      priority: "high",
      assigneeId: harness.member.id,
      tagIds: [harness.tag.id],
    });

    expect(body.ok).toBe(true);
    expect(body.data?.title).toBe("新建工单");
    expect(body.data?.tags.map((tag) => tag.id)).toEqual([harness.tag.id]);
  });

  it("标题为空返回字段级校验错误", async () => {
    const body = await createTicket("   ");

    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(body.error?.details)).toContain("标题不能为空");
  });

  it("报告人不存在返回 400", async () => {
    const body = await createTicket("报告人不存在的工单", { reporterId: "no-such-user" });

    expect(body.ok).toBe(false);
    expect(body.error?.message).toContain("报告人不存在");
  });

  it("请求体不是 JSON 时返回 400", async () => {
    const response = await harness.routes.list.POST(
      new NextRequest(`${BASE}/tickets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("BAD_REQUEST");
  });
});

describe("GET /api/tickets/:id", () => {
  it("工单不存在返回 404", async () => {
    const response = await harness.routes.detail.GET(new NextRequest(`${BASE}/tickets/missing`), {
      params: Promise.resolve({ id: "missing" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("详情带出评论数", async () => {
    const created = await createTicket("带评论的工单");
    const id = created.data!.id;

    await harness.routes.comments.POST(
      jsonRequest(`${BASE}/tickets/${id}/comments`, "POST", {
        body: "接口写入的评论",
        authorId: harness.member.id,
      }),
      { params: Promise.resolve({ id }) },
    );

    const response = await harness.routes.detail.GET(new NextRequest(`${BASE}/tickets/${id}`), {
      params: Promise.resolve({ id }),
    });
    const body = await response.json();

    expect(body.data.commentCount).toBe(1);
  });
});

describe("PATCH /api/tickets/:id", () => {
  it("更新标题与经办人", async () => {
    const created = await createTicket("待更新的工单");
    const id = created.data!.id;

    const response = await harness.routes.detail.PATCH(
      jsonRequest(`${BASE}/tickets/${id}`, "PATCH", {
        title: "已更新的工单",
        assigneeId: harness.member.id,
      }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.title).toBe("已更新的工单");
  });

  it("空更新体被拒绝", async () => {
    const created = await createTicket("空更新工单");
    const id = created.data!.id;

    const response = await harness.routes.detail.PATCH(
      jsonRequest(`${BASE}/tickets/${id}`, "PATCH", {}),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/tickets/:id/transition", () => {
  it("合法流转更新状态并写入 resolvedAt", async () => {
    const created = await createTicket("待流转的工单");
    const id = created.data!.id;

    await harness.routes.transition.POST(
      jsonRequest(`${BASE}/tickets/${id}/transition`, "POST", { to: "in_progress" }),
      { params: Promise.resolve({ id }) },
    );
    const response = await harness.routes.transition.POST(
      jsonRequest(`${BASE}/tickets/${id}/transition`, "POST", {
        to: "resolved",
        comment: "问题已定位",
      }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("resolved");
    expect(body.data.resolvedAt).toBeTruthy();
  });

  it("非法流转返回 409 并带上 from/to", async () => {
    const created = await createTicket("非法流转工单");
    const id = created.data!.id;

    const response = await harness.routes.transition.POST(
      jsonRequest(`${BASE}/tickets/${id}/transition`, "POST", { to: "resolved" }),
      { params: Promise.resolve({ id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("INVALID_TRANSITION");
    expect(body.error.details).toEqual({ from: "open", to: "resolved" });
  });
});

describe("DELETE /api/tickets/:id", () => {
  it("删除后再查询返回 404", async () => {
    const created = await createTicket("待删除的工单");
    const id = created.data!.id;
    const params = Promise.resolve({ id });

    await harness.routes.detail.DELETE(new NextRequest(`${BASE}/tickets/${id}`, { method: "DELETE" }), {
      params,
    });

    const response = await harness.routes.detail.GET(new NextRequest(`${BASE}/tickets/${id}`), {
      params,
    });
    expect(response.status).toBe(404);
  });
});

describe("GET /api/tags", () => {
  it("返回标签列表", async () => {
    const response = await harness.routes.tags.GET();
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.map((tag: { name: string }) => tag.name)).toContain("登录");
  });
});
