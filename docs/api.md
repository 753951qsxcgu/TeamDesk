# 接口文档

所有接口前缀 `/api`，统一响应结构：

```jsonc
// 成功
{ "ok": true, "data": { } }

// 失败
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "参数校验失败", "details": { } } }
```

除 `/api/auth/register` 与 `/api/auth/login` 外，其余接口都需要登录态（Cookie）。
未登录返回 `401 UNAUTHORIZED`。

## 鉴权

### POST /api/auth/register

```jsonc
// 请求
{ "email": "lily@teamdesk.dev", "name": "李莉", "password": "至少8位" }

// 响应 200
{ "ok": true, "data": { "id": "...", "email": "...", "name": "李莉", "role": "member", "createdAt": "..." } }
```

邮箱已注册返回 `409 CONFLICT`。

### POST /api/auth/login

登录成功后写入 `HttpOnly` Cookie `teamdesk_session`（7 天有效），响应体不含密码哈希。
邮箱不存在与密码错误返回同一句提示，避免账号枚举。

### POST /api/auth/logout

清除会话 Cookie。

### GET /api/auth/me

返回当前登录用户；未登录返回 `401`。

## 工单

### GET /api/tickets

| 参数 | 说明 |
| --- | --- |
| `keyword` | 标题或描述模糊匹配，已转义 LIKE 通配符 |
| `status` | `open` / `in_progress` / `resolved` / `closed` |
| `priority` | `low` / `medium` / `high` / `urgent` |
| `assigneeId` | 用户 id，传 `none` 表示筛选未指派 |
| `reporterId` | 报告人 id |
| `tagId` | 标签 id |
| `page` / `pageSize` | 分页，默认 1 / 20，上限 100 |
| `sort` | `created_at` / `updated_at` / `priority` |
| `order` | `asc` / `desc` |

```jsonc
{
  "ok": true,
  "data": {
    "items": [{ "id": "...", "title": "...", "status": "open", "tags": [], "commentCount": 0 }],
    "total": 12, "page": 1, "pageSize": 20
  }
}
```

### POST /api/tickets

```jsonc
// 请求
{ "title": "登录页验证码不刷新", "description": "…", "priority": "high", "assigneeId": null, "tagIds": ["…"] }

// 说明：报告人取会话身份，请求体里的 reporterId 会被忽略
```

### GET /api/tickets/:id

返回工单详情，含 `reporter`、`assignee`、`tags`、`commentCount`。不存在返回 `404`。

### PATCH /api/tickets/:id

可改 `title` / `description` / `priority` / `assigneeId` / `tagIds`。
管理员放行；普通成员只能改自己是报告人或经办人的工单，否则 `403 FORBIDDEN`。

### DELETE /api/tickets/:id

仅管理员可执行，其余返回 `403`。

### POST /api/tickets/:id/transition

```jsonc
// 请求
{ "to": "resolved", "comment": "问题已定位" }
```

非法跃迁返回 `409 INVALID_TRANSITION`，`details` 带 `{ from, to }`。
`comment` 可选，会以当前登录用户的身份记成一条评论。

### GET /api/tickets/:id/comments

按时间升序返回评论，带作者信息。

### POST /api/tickets/:id/comments

```jsonc
// 请求
{ "body": "补充进展" }

// 说明：作者取会话身份
```

## 标签与统计

### GET /api/tags

返回全部标签。

### GET /api/stats/overview

```jsonc
{
  "ok": true,
  "data": {
    "total": 12,
    "byStatus": { "open": 4, "in_progress": 3, "resolved": 2, "closed": 3 },
    "byPriority": { "low": 1, "medium": 5, "high": 4, "urgent": 2 },
    "unassigned": 3,
    "trend": [{ "day": "2026-10-08", "total": 1 }],
    "averageResolutionHours": 18.4,
    "assigneeLoad": [{ "userId": "...", "name": "王敏", "openCount": 3 }]
  }
}
```

`trend` 固定 7 天、按日期升序、缺失日期补 0，口径统一按 UTC。
`averageResolutionHours` 在没有已解决工单时为 `null`。
