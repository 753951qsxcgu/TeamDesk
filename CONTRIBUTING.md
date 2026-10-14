# 贡献指南

## 本地开发

```bash
npm install
cp .env.example .env.local
npm run db:migrate && npm run db:seed
npm run dev
```

## 分支策略

- `main` 始终保持可发布状态，只接受来自 PR 的合并
- 功能分支命名：`feat/<简述>`、`fix/<简述>`、`chore/<简述>`
- 一次 PR 只做一件事，提交历史保持线性可追溯

## 提交信息规范

采用 Conventional Commits：

```
<type>(<scope>): <subject>

<body>
```

`type` 取值：

| type | 场景 |
| --- | --- |
| `feat` | 新增功能 |
| `fix` | 修复缺陷 |
| `refactor` | 不改变行为的重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `docs` | 文档 |
| `chore` | 构建、依赖、脚手架 |
| `ci` | 流水线配置 |

`scope` 使用模块名：`db`、`api`、`web`、`auth`、`domain`、`stats`。

要求：

- subject 用中文或英文均可，但同一仓库内保持一致，结尾不加句号
- body 说明「为什么改」，而不是复述代码
- 破坏性变更在 body 中以 `BREAKING CHANGE:` 开头标注

## 代码分层约定

```
route handler  →  service  →  repository  →  sqlite
```

- `repositories/` 是唯一允许出现 SQL 的目录
- `services/` 负责业务规则编排（状态校验、权限判断、事务边界）
- `app/api/` 只做协议转换：入参校验 → 调用 service → 包装响应
- 上层可调用下层，禁止反向依赖或跨层直连数据库

## 质量要求

- 新增业务逻辑必须有对应测试：`npm test`
- 提交前通过 `npm run typecheck`、`npm run lint`
- 不要提交任何密钥、令牌、真实客户数据或内部地址；配置一律走 `.env.local` 与 `.env.example` 占位值
