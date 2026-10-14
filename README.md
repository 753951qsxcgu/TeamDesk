# TeamDesk

轻量级团队工单协作平台。用 Next.js 15 App Router + TypeScript + SQLite 实现的全栈应用，覆盖工单的创建、流转、评论、看板视图与统计看板，并内置用户体系与接口鉴权。

不依赖任何第三方云服务或 API Key，克隆后 `npm install && npm run db:migrate && npm run db:seed && npm run dev` 即可本地运行。

## 功能

- **工单管理**：创建 / 编辑 / 关闭 / 重开工单，含标题、描述、优先级、状态、经办人、标签
- **状态流转**：`open → in_progress → resolved → closed`，非法的状态跃迁会被显式拒绝
- **评论协作**：工单下留言，记录操作人与时间
- **看板视图**：按状态分列拖拽语义的分组展示
- **统计看板**：状态分布、优先级分布、近 7 日新建趋势、平均解决时长
- **用户与鉴权**：注册 / 登录 / 登出，密码使用 scrypt 加盐哈希，会话 Cookie 为 HttpOnly，接口按角色（admin / member）与资源归属鉴权
- **检索**：按关键词、状态、优先级、经办人组合筛选，服务端分页

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Next.js 15（App Router）、React 19、TypeScript | 服务端组件直读数据，客户端组件负责交互 |
| 样式 | Tailwind CSS v4 | 无 UI 框架依赖，设计 token 集中在 `src/app/globals.css` |
| 后端 | Next.js Route Handlers | 统一响应包装、错误码、zod 入参校验 |
| 数据 | SQLite（better-sqlite3） | 同步驱动，零外部依赖；迁移与种子脚本位于 `scripts/` |
| 测试 | Vitest | 数据层单测 + API 集成测试 |
| 工程 | ESLint、Prettier、GitHub Actions | 类型检查、 lint、测试三条 CI 流水线 |

## 目录结构

```
src/
  app/                    # 页面与 Route Handlers
    (dashboard)/          # 需要登录的页面分组
    api/                  # REST 接口
    login/                # 登录 / 注册页
  components/             # 可复用 UI 组件
  lib/
    db/                   # 连接、迁移、种子
    domain/               # 领域模型、状态机、校验 schema
    repositories/         # 数据访问层（唯一接触 SQL 的地方）
    services/             # 业务编排层
    auth/                 # 密码哈希、会话、权限守卫
    api/                  # 响应包装、错误码、分页
tests/
  repositories/           # 数据层单测
  api/                    # 接口集成测试
  domain/                 # 纯函数单测
scripts/
  migrate.ts              # 建表迁移
  seed.ts                 # 演示数据
```

分层约定：**repository 只写 SQL，service 只编排业务，route handler 只做协议转换**。上层可以调用下层，禁止反向依赖。

## 快速开始

```bash
npm install
cp .env.example .env.local

npm run db:migrate   # 建表
npm run db:seed      # 写入演示数据（含默认管理员账号）

npm run dev          # http://localhost:3000
```

种子数据创建的默认账号：

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| admin@teamdesk.dev | teamdesk-admin | admin |
| lily@teamdesk.dev | teamdesk-member | member |

> 仅用于本地演示，请勿在任何真实环境使用这些凭据。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm start` | 生产构建与启动 |
| `npm run typecheck` | TypeScript 全量类型检查 |
| `npm run lint` | ESLint |
| `npm test` | 运行全部测试 |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:seed` | 写入演示数据 |

## 数据模型

```
users      id, email, name, password_hash, role, created_at
tickets    id, title, description, status, priority, assignee_id, reporter_id,
           created_at, updated_at, resolved_at, closed_at
comments   id, ticket_id, author_id, body, created_at
tags       id, name, color
ticket_tags ticket_id, tag_id
```

## 接口

所有接口前缀 `/api`，统一返回 `{ ok: true, data }` 或 `{ ok: false, error: { code, message } }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/tickets` | 工单列表（分页 + 筛选） |
| POST | `/api/tickets` | 创建工单 |
| GET | `/api/tickets/:id` | 工单详情 |
| PATCH | `/api/tickets/:id` | 更新字段 |
| POST | `/api/tickets/:id/transition` | 状态流转 |
| DELETE | `/api/tickets/:id` | 删除工单（admin） |
| GET | `/api/tickets/:id/comments` | 评论列表 |
| POST | `/api/tickets/:id/comments` | 新增评论 |
| GET | `/api/stats/overview` | 统计概览 |
| GET | `/api/tags` | 标签列表 |

## 开发里程碑

仓库的提交历史按真实开发顺序组织，对应以下 7 个里程碑：

1. **工程初始化** — 脚手架、TypeScript、代码规范、CI 骨架
2. **领域模型与数据层** — 建表迁移、Repository、种子数据
3. **后端 API** — 响应包装、错误码、工单与评论接口
4. **前端 MVP** — 布局、列表、详情、创建与编辑
5. **用户体系与鉴权** — 会话、登录页、接口鉴权与资源归属
6. **业务增强** — 看板视图、筛选检索、统计看板
7. **质量与交付** — 测试补全、CI 加固、部署与文档

## 安全说明

- 密码使用 Node 内置 `crypto.scrypt` 加盐哈希，不存储明文
- 会话 Cookie 为 `HttpOnly` + `SameSite=Lax`，服务端校验签名
- 仓库不含任何真实密钥；`.env.example` 只提供占位值
- `.gitignore` 已排除数据库文件、环境变量与日志

## License

[MIT](./LICENSE)
