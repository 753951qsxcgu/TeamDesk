/**
 * 演示数据：让空库也能直接看到列表、看板与统计效果。
 * 数据在本地生成，不含任何真实业务信息。
 */
import { hashPassword } from "@/lib/auth/password";
import type { Db } from "@/lib/db/connection";
import type { TicketPriority, TicketStatus } from "@/lib/domain/types";
import { CommentRepository } from "@/lib/repositories/comment-repository";
import { TagRepository } from "@/lib/repositories/tag-repository";
import { TicketRepository } from "@/lib/repositories/ticket-repository";
import { UserRepository } from "@/lib/repositories/user-repository";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: "admin" | "member";
}

const SEED_USERS: SeedUser[] = [
  { email: "admin@teamdesk.dev", name: "周维", password: "teamdesk-admin", role: "admin" },
  { email: "lily@teamdesk.dev", name: "李莉", password: "teamdesk-member", role: "member" },
  { email: "chenhao@teamdesk.dev", name: "陈昊", password: "teamdesk-member", role: "member" },
  { email: "wangmin@teamdesk.dev", name: "王敏", password: "teamdesk-member", role: "member" },
];

const SEED_TAGS: { name: string; color: string }[] = [
  { name: "登录", color: "#2563eb" },
  { name: "支付", color: "#dc2626" },
  { name: "性能", color: "#f59e0b" },
  { name: "UI", color: "#7c3aed" },
  { name: "数据", color: "#059669" },
];

interface SeedTicket {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  reporter: string;
  assignee: string | null;
  tags: string[];
  /** 距今多少小时前创建 */
  hoursAgo: number;
  comments?: string[];
}

const SEED_TICKETS: SeedTicket[] = [
  {
    title: "登录页在 Safari 上验证码图片不刷新",
    description: "Safari 17 下点击验证码不会重新请求，疑似缓存头导致的条件请求命中。",
    status: "open",
    priority: "high",
    reporter: "lily@teamdesk.dev",
    assignee: null,
    tags: ["登录", "UI"],
    hoursAgo: 3,
  },
  {
    title: "支付回调偶发超时，订单状态未更新",
    description: "第三方回调平均 8s 才返回，网关 5s 即断开，需要改异步落库 + 补偿查询。",
    status: "in_progress",
    priority: "urgent",
    reporter: "chenhao@teamdesk.dev",
    assignee: "wangmin@teamdesk.dev",
    tags: ["支付", "数据"],
    hoursAgo: 9,
    comments: ["已联系支付网关确认超时阈值，先按异步方案改。", "补偿任务需要考虑幂等，用订单号去重。"],
  },
  {
    title: "工单列表在 5000 条数据下首屏超过 3 秒",
    description: "缺少分页与索引，全表扫描。需要加 created_at 索引并改服务端分页。",
    status: "resolved",
    priority: "high",
    reporter: "wangmin@teamdesk.dev",
    assignee: "chenhao@teamdesk.dev",
    tags: ["性能", "数据"],
    hoursAgo: 30,
    comments: ["加索引后压测降到 420ms。"],
  },
  {
    title: "移动端详情按钮点击区域过小",
    description: "按钮高度只有 28px，低于 44px 的可点击区域建议值。",
    status: "closed",
    priority: "medium",
    reporter: "lily@teamdesk.dev",
    assignee: "wangmin@teamdesk.dev",
    tags: ["UI"],
    hoursAgo: 52,
  },
  {
    title: "导出报表时中文列名乱码",
    description: "CSV 缺少 UTF-8 BOM，Excel 打开后列名乱码。",
    status: "closed",
    priority: "low",
    reporter: "chenhao@teamdesk.dev",
    assignee: "lily@teamdesk.dev",
    tags: ["数据"],
    hoursAgo: 74,
    comments: ["统一在导出前写入 BOM。"],
  },
  {
    title: "新增工单时未校验标题长度",
    description: "前端只做了 required，后端缺少长度上限，超长标题会撑破列表布局。",
    status: "open",
    priority: "medium",
    reporter: "wangmin@teamdesk.dev",
    assignee: null,
    tags: ["UI", "数据"],
    hoursAgo: 12,
  },
  {
    title: "数据统计口径与运营后台不一致",
    description: "我们按创建时间统计，运营按支付时间，需要对齐口径并出一份说明。",
    status: "in_progress",
    priority: "medium",
    reporter: "chenhao@teamdesk.dev",
    assignee: "chenhao@teamdesk.dev",
    tags: ["数据"],
    hoursAgo: 20,
  },
  {
    title: "密码重置链接 30 分钟过期太短",
    description: "邮件到达慢的用户来不及点，建议延长到 2 小时并在页面上显示剩余时间。",
    status: "open",
    priority: "low",
    reporter: "lily@teamdesk.dev",
    assignee: null,
    tags: ["登录"],
    hoursAgo: 6,
  },
  {
    title: "工单详情页评论未做防抖，连续提交会产生重复记录",
    description: "快速双击提交按钮会写入两条相同评论。",
    status: "resolved",
    priority: "high",
    reporter: "admin@teamdesk.dev",
    assignee: "wangmin@teamdesk.dev",
    tags: ["UI", "性能"],
    hoursAgo: 44,
    comments: ["提交期间禁用按钮 + 请求去重。"],
  },
  {
    title: "批量导入用户时重复邮箱未提示",
    description: "导入结果只显示成功条数，失败行被静默丢弃。",
    status: "in_progress",
    priority: "medium",
    reporter: "admin@teamdesk.dev",
    assignee: "lily@teamdesk.dev",
    tags: ["数据"],
    hoursAgo: 16,
  },
  {
    title: "接口 500 时前端展示为空列表",
    description: "错误被吞掉，用户以为真的没有数据，需要显式错误态。",
    status: "closed",
    priority: "urgent",
    reporter: "chenhao@teamdesk.dev",
    assignee: "chenhao@teamdesk.dev",
    tags: ["UI"],
    hoursAgo: 90,
    comments: ["统一错误边界 + Toast 提示。"],
  },
  {
    title: "搜索框输入特殊字符报错",
    description: "输入 % 触发 LIKE 通配匹配，返回了全部数据，需要转义。",
    status: "open",
    priority: "high",
    reporter: "wangmin@teamdesk.dev",
    assignee: null,
    tags: ["数据", "性能"],
    hoursAgo: 2,
  },
];

export interface SeedResult {
  users: number;
  tags: number;
  tickets: number;
  comments: number;
}

const HOUR = 60 * 60 * 1000;

export function seedDatabase(db: Db): SeedResult {
  const users = new UserRepository(db);
  const tags = new TagRepository(db);
  const tickets = new TicketRepository(db);
  const comments = new CommentRepository(db);

  const userIdByEmail = new Map<string, string>();
  let userCount = 0;
  for (const seedUser of SEED_USERS) {
    const existing = users.findByEmail(seedUser.email);
    const record =
      existing ??
      users.create({
        email: seedUser.email,
        name: seedUser.name,
        passwordHash: hashPassword(seedUser.password),
        role: seedUser.role,
      });
    userIdByEmail.set(seedUser.email, record.id);
    if (!existing) userCount += 1;
  }

  let tagCount = 0;
  const tagIdByName = new Map<string, string>();
  for (const tag of SEED_TAGS) {
    const existing = tags.findByName(tag.name);
    const record = existing ?? tags.create(tag);
    tagIdByName.set(tag.name, record.id);
    if (!existing) tagCount += 1;
  }

  const now = Date.now();
  let ticketCount = 0;
  let commentCount = 0;

  for (const seed of SEED_TICKETS) {
    const reporterId = userIdByEmail.get(seed.reporter);
    if (!reporterId) continue;

    const createdAt = new Date(now - seed.hoursAgo * HOUR).toISOString();
    const updatedAt = new Date(now - Math.max(1, seed.hoursAgo - 1) * HOUR).toISOString();
    const ticket = tickets.create({
      title: seed.title,
      description: seed.description,
      priority: seed.priority,
      status: seed.status,
      reporterId,
      assigneeId: seed.assignee ? userIdByEmail.get(seed.assignee) ?? null : null,
      createdAt,
      updatedAt,
    });

    tags.setTicketTags(
      ticket.id,
      seed.tags.map((name) => tagIdByName.get(name)).filter((id): id is string => Boolean(id)),
    );

    for (const body of seed.comments ?? []) {
      const authorId = (seed.assignee ? userIdByEmail.get(seed.assignee) : null) ?? reporterId;
      comments.create({ ticketId: ticket.id, authorId, body, createdAt: updatedAt });
      commentCount += 1;
    }

    ticketCount += 1;
  }

  return { users: userCount, tags: tagCount, tickets: ticketCount, comments: commentCount };
}
