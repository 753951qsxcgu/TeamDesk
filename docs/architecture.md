# 架构说明

## 分层

```
浏览器 / curl
    │
    ▼
Route Handler（src/app/api/**）   ── 协议转换：入参校验 → 调 service → 包装响应
    │
    ▼
Service（src/lib/services/**）    ── 业务规则：状态机、权限、事务边界、派生计算
    │
    ▼
Repository（src/lib/repositories/**） ── 唯一允许写 SQL 的地方
    │
    ▼
SQLite
```

服务端组件（页面）不走 HTTP，直接调 Service，省掉一次网络往返。

依赖方向只允许自上而下：上层可以调用下层，下层不得反向引用。类型定义放在
`src/lib/domain`，被所有层共享。

## 目录职责

| 目录 | 职责 | 约束 |
| --- | --- | --- |
| `src/app/(dashboard)` | 需要登录的业务页面 | layout 里做登录守卫 |
| `src/app/api` | REST 接口 | 只做协议转换，不写业务规则 |
| `src/lib/domain` | 实体类型、状态机、错误模型、入参 schema | 不依赖存储与 HTTP |
| `src/lib/db` | 连接、迁移、种子 | 迁移按版本数组维护，幂等 |
| `src/lib/repositories` | 数据访问 | 只有这里出现 SQL |
| `src/lib/services` | 业务编排 | 不感知 HTTP 与 Cookie |
| `src/lib/auth` | 密码哈希、会话令牌、登录态 | 密钥一律来自环境变量 |
| `src/components` | UI 组件 | 客户端组件才加 `"use client"` |
| `tests` | 数据层、领域、服务、接口 | 数据层用内存库，接口用登录态替身 |

## 关键设计决策

**为什么用 SQLite + better-sqlite3**：目标是零外部依赖、克隆即可跑。同步 API 与
服务端组件的渲染模型契合，也不需要连接池。已在 `next.config.ts` 声明为外部原生依赖。

**为什么迁移写成版本数组而不是 .sql 文件**：Next 的打包器不会搬运运行时读取的
静态文件，把 SQL 放进 TS 常量最省事；同时版本号记录在 `schema_migrations` 里，
重复执行幂等。

**为什么不用 middleware 做登录守卫**：middleware 跑在 Edge 运行时，加载不了
better-sqlite3。守卫放在 `(dashboard)/layout.tsx`，所有业务页共用一次判断。

**为什么报告人与评论作者不信任请求体**：由 `requireUser()` 从会话取，避免调用方
伪造身份。创建工单时即使传了 `reporterId` 也会被覆盖。

**会话为什么不引第三方库**：只需要「签发 + 校验」两件事，HMAC-SHA256 签名足够。
Cookie 固定 `HttpOnly` + `SameSite=Lax`，生产环境强制 `secure`；未配置
`TEAMDESK_SESSION_SECRET` 时生产环境直接启动失败。

## 状态机

```
open ──▶ in_progress ──▶ resolved ──▶ closed
  │            │             │            │
  └────────────┴─────────────┴────────────┘
         退回（closed 只能重开回 open）
```

- 非法跃迁返回 `409 INVALID_TRANSITION`，响应体带 `from / to`
- 进入 `resolved` 写 `resolvedAt`，退回 `open` / `in_progress` 清空
- 进入 `closed` 写 `closedAt`，重开清空；`resolved → closed` 保留 `resolvedAt`

## 错误处理

业务层只抛 `AppError`，错误码到状态码的映射集中在 `src/lib/domain/errors.ts`：

| 错误码 | 状态码 |
| --- | --- |
| BAD_REQUEST / VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| CONFLICT / INVALID_TRANSITION | 409 |
| INTERNAL | 500 |

非预期异常统一回 `INTERNAL`，不把堆栈带出去，只在服务端日志留痕。

## 测试策略

| 层 | 手段 |
| --- | --- |
| 领域规则 | 纯函数单测（状态机、时间字段维护） |
| 数据层 | 每个用例一个内存 SQLite 库 |
| 服务层 | 内存库 + 真实 repository |
| 接口层 | 直接调用 Route Handler，用替身注入登录态 |

接口测试不启 HTTP 服务，因此跑得快也不依赖端口；数据库指向 `:memory:`，
通过环境变量在动态导入路由模块之前生效。

## 已知边界

- SQLite 单机写入，不适合多实例部署；上量后需要换 Postgres 并替换 repository 层
- 看板一次取 100 条，数据量大时需要改成按状态分页
- 统计查询全表聚合，数据量大时需要物化或定时汇总
