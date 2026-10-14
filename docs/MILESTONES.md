# 里程碑划分（提交区间对照）

仓库按「业务开发顺序」划分为 10 个里程碑，覆盖除本文件自身提交外的全部提交。
下表可直接照抄到平台的 Milestone 表单里：起始 Commit 与结束 Commit 填短哈希
（或完整哈希），标题与说明按行复制。

> 提交哈希以本地仓库为准；推送到 GitHub 后哈希不变。

## M1 工程初始化与规范

- **Commit 区间**：`40cf6d3` → `1ea6ba7`（3 个提交）
- **标题**：工程初始化：脚手架、TypeScript 严格模式与代码规范
- **说明**：
  搭建 Next.js 15 + TypeScript + Tailwind v4 的工程骨架，定下后续所有开发的地基：
  package.json 定义 dev/build/lint/typecheck/test 与数据库脚本；tsconfig 开启
  strict 与 noUncheckedIndexedAccess 并配置 @/ 路径别名；next.config 把
  better-sqlite3 声明为外部原生依赖。工程规范方面接入 ESLint flat config
  （js/ts 推荐规则 + react-hooks + Next 规则）、Prettier 与 Conventional Commits
  提交规范，编写 CONTRIBUTING 与 PR 模板；.gitignore 排除构建产物、数据库文件与
  环境变量，.env.example 只保留占位值避免密钥入库；同时搭好 GitHub Actions 骨架，
  先把类型检查与 lint 纳入门禁。

## M2 领域模型与数据层

- **Commit 区间**：`74cd0b4` → `65c8a32`（7 个提交）
- **标题**：领域模型与数据访问层：状态机、版本化迁移、Repository 与种子数据
- **说明**：
  先把业务概念固定下来：定义工单/用户/评论/标签的实体类型，状态与优先级用字面量
  联合类型约束；工单状态机收敛为一张跃迁表，非法跃迁抛 INVALID_TRANSITION，并给出
  resolvedAt/closedAt 的维护规则；统一 AppError 与错误码映射。数据层建立 SQLite
  连接（外键约束 + WAL），迁移以「版本 + SQL」数组维护并记录在 schema_migrations
  里，单迁移单事务、失败回滚、重复执行幂等。Repository 是唯一允许写 SQL 的目录：
  工单支持关键词（转义 LIKE 通配符）、状态、优先级、经办人（含未指派）、标签组合
  筛选与服务端分页，排序字段走白名单，hydrate 用三次批量查询补齐关联避免 N+1。
  配套 scrypt 密码哈希工具与演示数据种子脚本，并补齐 30 个数据层与领域单测。

## M3 后端 API

- **Commit 区间**：`683014d` → `01e0583`（4 个提交）
- **标题**：后端 API：统一响应与错误码、入参校验、工单与评论接口
- **说明**：
  接口的「协议外壳」先定下来：成功统一 { ok, data }，失败统一
  { ok, error: { code, message, details } }，AppError 按错误码映射状态码，非预期
  异常只回 INTERNAL 不泄漏堆栈；zod 校验失败转 VALIDATION_ERROR 并带字段级明细。
  业务编排单独收一层 service：创建/更新时校验报告人、经办人与标签是否存在，状态
  流转先过状态机再写时间戳，可选把流转说明记成评论；接口层只做协议转换。对外提供
  工单列表（筛选+分页）、创建、详情、更新、删除、状态流转（单独成接口便于审计）、
  评论读写与标签列表；所有声明 runtime=nodejs 与 force-dynamic。最后补 15 个接口
  集成测试，直接调用 Route Handler 覆盖协议层到业务层的完整链路。

## M4 前端 MVP

- **Commit 区间**：`f9512ca` → `fd5acf8`（4 个提交）
- **标题**：前端 MVP：设计系统、列表、详情、新建与编辑页
- **说明**：
  搭建页面外壳与可复用组件：中文优先字体栈、浅色主题、统一焦点环，侧边导航 + 顶栏
  的后台布局（路由分组不影响 URL），Badge/Button/Card/EmptyState/Pagination 五个
  基础件，状态与优先级的中文标签统一样式，以及浏览器侧的 API 封装。业务页方面：
  列表页由服务端组件直连 service 取数不绕 HTTP，筛选表单用原生 GET 提交、条件写进
  地址栏可分享；详情页展示描述、经办人、标签与解决/关闭时间，流转按钮由状态机的
  allowedNextStatuses 决定（前端不重复实现规则），成功后 router.refresh() 让服务端
  组件重新取数；新建与编辑共用同一个表单组件，编辑走 PATCH，标签用可切换 chip。
  期间修掉首次 next build 暴露的三个问题：PostCSS 配置结构错误导致 Tailwind 不
  生效、ESLint 缺 Next 规则、页面内链应改用 next/link。

## M5 用户体系与鉴权

- **Commit 区间**：`beda195` → `7695186`（4 个提交）
- **标题**：用户体系与鉴权：会话令牌、登录注册、接口鉴权与资源归属
- **说明**：
  会话采用自签令牌：userId + 过期时间 + HMAC-SHA256 签名，校验用 timingSafeEqual
  做定长比较，Cookie 固定 HttpOnly + SameSite=Lax，生产环境强制 secure；未配置
  TEAMDESK_SESSION_SECRET 时生产环境直接启动失败、开发环境告警后用本地默认密钥。
  登录守卫刻意不用 middleware（Edge 运行时加载不了原生模块），放在 (dashboard) 分组
  的 layout 里统一跳转。用户服务负责注册（邮箱去重报 CONFLICT）与登录（邮箱不存在与
  密码错误返回同一句提示，避免账号枚举），toPublic 一律剥除密码哈希。接口侧：所有
  工单接口先 requireUser，创建工单的报告人与评论作者一律取会话身份、不信任请求体；
  更新工单校验归属（管理员放行，否则限报告人或经办人，越权 403），删除限管理员。
  前端去掉演示身份下拉改为登录态。配套会话、用户服务与权限测试，共 59 个用例。

## M6 业务增强

- **Commit 区间**：`22665c7` → `b21fc06`（5 个提交）
- **标题**：业务增强：看板视图、排序检索与统计看板
- **说明**：
  看板视图按状态分四列展示工单卡片、按优先级权重降序，一次取 100 条不做分页以
  避免分组视图被割裂，空列与空库都有空态提示。统计能力新增 StatsRepository
  （状态/优先级分布、按天新建量、平均解决时长、未指派数、经办人负载）与
  StatsService（补齐缺失日期生成连续 7 天趋势、汇总派生指标），对外提供
  GET /api/stats/overview；统计看板页用纯 CSS 条实现分布图与趋势柱状图，不引图表
  库。列表页补上排序字段、升降序与每页条数，非法值走白名单回落默认，翻页时保留
  全部筛选条件。期间修正一处统计口径问题：趋势窗口原本按本地时区计算，而 SQL 分组
  取的是 ISO 串里的 UTC 日期，导致当天新建的工单算不进趋势，现已统一按 UTC。

## M7 质量与交付

- **Commit 区间**：`ce18f3b` → `67f24ae`（6 个提交）
- **标题**：质量与交付：测试补全、CI 加固、敏感信息自查、Docker 与文档
- **说明**：
  CI 从「只跑类型检查与 lint」扩展为三个 job：quality（typecheck + lint +
  敏感信息自查）、test（M7 收尾时为 66 个用例，现已增至 98 个）、build（生产构建后跑 db:migrate 与 db:seed
  冒烟，确认干净环境可用）。新增 scripts/check-secrets.ts 做提交前敏感信息粗筛，
  命中 API Key、AWS Key、GitHub Token、私钥头、带密码连接串、硬编码口令即非零
  退出，并串进 npm run verify。补上架构说明与接口文档两篇文档，说明分层职责、六条
  关键设计决策、状态机、错误码映射、测试策略与已知边界；README 同步到当前实现。
  交付形态补 Dockerfile（deps/builder/runner 三段式，deps 阶段备好编译工具防止
  better-sqlite3 无预编译产物时失败）与 .dockerignore，容器启动时先迁移，数据落卷。

## M8 活动流与批量操作

- **Commit 区间**：`4e9a677` → `f5aa2c9`（7 个提交）
- **标题**：活动流与批量操作：操作留痕、活动流接口、列表多选与批量更新
- **说明**：
  先补数据底座：迁移新增 v2（ticket_activities 表，记录操作人、类型、
  from/to 值与备注，外键级联删除）与 v3（工单列表的两条复合索引，覆盖
  「状态 + 更新时间」排序与按报告人筛选），迁移继续走版本数组且幂等，配套
  ActivityRepository 与 mapper。业务层在创建、流转、更新、评论、批量更新各处
  统一写活动流：优先级与经办人变化分别记 priority_changed / assignee_changed，
  标题描述变化记一条 updated。对外提供 GET /api/tickets/:id/activities 只读接口，
  详情页新增「操作记录」时间线组件。批量能力分三步落地：先有
  POST /api/tickets/bulk（一次最多 50 条，逐条鉴权与状态机校验，部分失败进
  skipped 而不整体回滚），再有批量操作条组件（改状态 / 优先级 / 经办人），
  最后让表格支持多选（全选当前页、选中行高亮）。

## M9 导入导出与账号设置

- **Commit 区间**：`bf22584` → `9346b06`（6 个提交）
- **标题**：导入导出与账号设置：CSV 导出与解析、批量导入试跑、修改密码
- **说明**：
  导出先落地：GET /api/tickets/export 沿用列表接口的全部筛选条件，最多 1000 条，
  输出带 UTF-8 BOM 的 CSV 附件，表头用中文；CSV 生成器按 RFC 4180 转义逗号、
  引号与换行，避免 Excel 打开中文乱码或列对不齐，列表页加上导出入口（原生 a 标签，
  不走客户端路由）。导入是导出的逆过程：解析器剥 BOM、还原转义的双引号与引号内
  换行，CRLF 与 LF 都算一次换行、末尾空行不产生空记录，CSV 模块因此从 web 层
  上移到 src/lib 供两端共用。POST /api/tickets/import 按表头名定位列（中英文
  都认、列顺序任意），逐行校验：非法优先级、不存在的经办人邮箱、超长标题都单独
  跳过并给出行号；缺失的标签自动创建；dryRun 只校验不落库，页面据此先跑一遍
  「试跑校验」把问题行列出来再正式导入。账号侧补上 POST /api/auth/password：
  只认会话身份、改密前必须校验旧密码，仓储层新增按 id 更新哈希的方法，盐每次
  重新生成；前端提供个人设置页展示账号信息并改密。

## M10 SLA 与工作台

- **Commit 区间**：`cd6316a` → `9675e8d`（3 个提交）
- **标题**：SLA 与工作台：响应时限、超时标记与登录后首页
- **说明**：
  SLA 规则放进领域层（src/lib/domain/sla.ts）：紧急 4h、高 8h、中 24h、低 72h，
  已解决或已关闭的工单停表、按解决时间判断是否超时，避免「先放着再补」刷不出
  真问题。列表新增 SLA 列、详情给出响应时限时间点；SLA 在服务端算好后传给客户端
  表格，避免 Date.now() 两端不一致触发 hydration 报错。最后把登录后首页从全局
  列表换成「我的工作台」：概览计数 + 已超时未处理 + 指派给我的 + 我创建的四组
  数据，第一屏就能决定先做什么。

---

## 提交前检查清单

- [x] 提交历史为连续真实开发过程，非事后拼装（按里程碑顺序推进）
- [x] 不含「仅更新 package-lock.json」的自动生成提交：锁文件变更已并入 README 收尾提交
- [x] 无密钥 / 令牌 / 真实客户数据 / 内部地址：`.env.example` 仅占位，数据库文件与日志已被 .gitignore 排除
- [x] `npm run typecheck` 通过
- [x] `npm run lint` 通过（0 error）
- [x] `npm test` 通过（12 个测试文件 / 98 个用例）
- [x] `npm run build` 通过（27 条路由）
- [x] `npm run db:migrate` 与 `npm run db:seed` 在干净库上可跑通且幂等
- [ ] 推送 GitHub 前再跑一次 `npm run check:secrets`
- [ ] 确认远端仓库为公开或已授权访问，平台需要读取提交历史
