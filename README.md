# TeamDesk

轻量级团队工单协作平台。用 Next.js 15 App Router + TypeScript + SQLite 实现的全栈应用，覆盖工单的创建、流转、评论、看板视图与统计看板，并内置用户体系与接口鉴权。

不依赖任何第三方云服务或 API Key，克隆后 `npm install && npm run db:migrate && npm run db:seed && npm run dev` 即可本地运行。

## 功能

- **工单管理**：创建 / 编辑 / 关闭 / 重开工单，含标题、描述、优先级、状态、经办人、标签
- **状态流转**：`open → in_progress → resolved → closed`，非法的状态跃迁会被显式拒绝
- **评论协作**：工单下留言，身份取自登录态
- **看板视图**：按状态分列展示，按优先级权重排序
- **统计看板**：状态与优先级分布、近 7 日新建趋势、平均解决时长、经办人负载
- **用户与鉴权**：注册 / 登录 / 登出，密码使用 scrypt 加盐哈希，会话 Cookie 为 HttpOnly，接口按角色（admin / member）与资源归属鉴权
- **检索**：关键词、状态、优先级、经办人、标签组合筛选，支持排序与服务端分页

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Next.js 15（App Router）、React 19、TypeScript | 服务端组件直读数据，客户端组件负责交互 |
| 样式 | Tailwind CSS v4 | 无 UI 框架依赖，设计 token 集中在 `src/app/globals.css` |
| 后端 | Next.js Route Handlers | 统一响应包装、错误码、zod 入参校验 |
| 数据 | SQLite（better-sqlite3） | 同步驱动，零外部依赖；迁移与种子脚本位于 `scripts/` |
| 测试 | Vitest | 数据层单测、服务层单测、接口集成测试 |
| 工程 | ESLint、Prettier、GitHub Actions | 类型检查、lint、敏感信息自查、测试、构建五道门禁 |

## 目录结构

```
src/
  app/                    # 页面与 Route Handlers
    (dashboard)/          # 需要登录的页面分组（layout 里做登录守卫）
    api/                  # REST 接口
    login/                # 登录 / 注册页
  components/             # 可复用 UI 组件
  lib/
    db/                   # 连接、迁移、种子
    domain/               # 实体类型、状态机、错误模型、入参 schema
    repositories/         # 数据访问层（唯一接触 SQL 的地方）
    services/             # 业务编排层
    auth/                 # 密码哈希、会话令牌、登录态
    api/                  # 响应包装、错误翻译、入参校验
    web/                  # 浏览器侧 API 封装与格式化
tests/
  repositories/           # 数据层单测
  services/               # 服务层单测
  api/                    # 接口集成测试
  domain/ auth/           # 领域规则与密码、会话单测
scripts/
  migrate.ts              # 建表迁移
  seed.ts                 # 演示数据
  check-secrets.ts        # 提交前敏感信息自查
docs/
  architecture.md         # 架构说明与设计决策
  api.md                  # 接口文档
```

分层约定：**repository 只写 SQL，service 只编排业务，route handler 只做协议转换**。上层可以调用下层，禁止反向依赖。

## 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | >= 20.10 | 用到 `node:crypto` 的 scrypt 与 Next 15 的能力 |
| npm | >= 10 | 随 Node 一起安装即可 |
| 磁盘 | 约 300 MB | 含 node_modules |

不需要数据库服务或任何外部 API Key，数据写在本地 SQLite 文件里。

## 快速开始

```bash
npm install
cp .env.example .env.local

npm run db:migrate   # 建表
npm run db:seed      # 写入演示数据（含默认管理员账号）

npm run dev          # http://localhost:3000
```

启动后访问 http://localhost:3000 ，未登录会自动跳到 /login，用下面的演示账号登录即可。
本地验证一条命令跑完：

```bash
npm run verify       # 类型检查 + lint + 敏感信息自查 + 66 个测试
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
| `npm test` | 运行全部测试（66 个用例） |
| `npm run check:secrets` | 敏感信息自查 |
| `npm run verify` | 类型检查 + lint + 自查 + 测试，提交前跑一遍 |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:seed` | 写入演示数据 |

## 数据模型

```
users        id, email, name, password_hash, role, created_at
tickets      id, title, description, status, priority, assignee_id, reporter_id,
             created_at, updated_at, resolved_at, closed_at
comments     id, ticket_id, author_id, body, created_at
tags         id, name, color
ticket_tags  ticket_id, tag_id
schema_migrations version, name, applied_at
```

## 接口

所有接口前缀 `/api`，统一返回 `{ ok: true, data }` 或 `{ ok: false, error: { code, message } }`。完整说明见 [docs/api.md](./docs/api.md)。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录，写入会话 Cookie |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/tickets` | 工单列表（分页 + 筛选 + 排序） |
| POST | `/api/tickets` | 创建工单，报告人取会话身份 |
| GET | `/api/tickets/:id` | 工单详情 |
| PATCH | `/api/tickets/:id` | 更新字段（限报告人 / 经办人 / 管理员） |
| POST | `/api/tickets/:id/transition` | 状态流转 |
| DELETE | `/api/tickets/:id` | 删除工单（仅管理员） |
| GET | `/api/tickets/:id/comments` | 评论列表 |
| POST | `/api/tickets/:id/comments` | 新增评论 |
| GET | `/api/tags` | 标签列表 |
| GET | `/api/stats/overview` | 统计概览 |

## 部署

```bash
docker build -t teamdesk .
docker run -p 3000:3000 -v teamdesk-data:/app/data teamdesk
```

容器启动时会先执行 `npm run db:migrate`，数据落在 `/app/data` 卷里。
生产环境必须设置 `TEAMDESK_SESSION_SECRET`，否则应用拒绝启动。

## 开发里程碑

仓库的提交历史按真实开发顺序组织，对应以下 7 个里程碑：

1. **工程初始化** — 脚手架、TypeScript、ESLint / Prettier、提交规范、CI 骨架
2. **领域模型与数据层** — 实体与状态机、版本化迁移、Repository、种子数据
3. **后端 API** — 统一响应与错误码、入参校验、工单与评论接口
4. **前端 MVP** — 设计系统、列表、详情、新建与编辑页
5. **用户体系与鉴权** — 会话令牌、登录注册、接口鉴权与资源归属
6. **业务增强** — 看板视图、排序检索、统计看板
7. **质量与交付** — 测试补全、CI 加固、敏感信息自查、Docker 与文档

## 安全说明

- 密码使用 Node 内置 `crypto.scrypt` 加盐哈希，不存储明文
- 会话 Cookie 为 `HttpOnly` + `SameSite=Lax`，生产环境强制 `secure`
- 报告人与评论作者一律取自会话，不信任请求体里的身份字段
- 仓库不含任何真实密钥；`.env.example` 只提供占位值
- `.gitignore` 已排除数据库文件、环境变量与日志
- 提交前可运行 `npm run check:secrets` 做一遍粗筛

## 参与开发

提交前请先读 [CONTRIBUTING.md](./CONTRIBUTING.md)：分支命名、Conventional Commits
提交格式、分层约定与质量要求都写在里面。日常改动的最小闭环是：

```bash
git checkout -b feat/<简述>
# 改动 + 补测试
npm run verify
git commit -m "feat(scope): 一句话说明"
```

提交信息里的 `scope` 使用模块名：`db` / `api` / `web` / `auth` / `domain` / `stats`。
PR 模板里附了自查清单，照着勾完再发。

## 进一步阅读

- [docs/architecture.md](./docs/architecture.md)：分层、设计决策、状态机、测试策略与已知边界
- [docs/api.md](./docs/api.md)：接口契约与响应示例
- [CONTRIBUTING.md](./CONTRIBUTING.md)：分支策略、提交规范与质量要求

## License

[MIT](./LICENSE)
