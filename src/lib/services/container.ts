/**
 * 服务容器：把 repository 组装成 service。
 * 接口层只从这里取 service，不直接 new repository，保证分层不退化。
 */
import { getDb, type Db } from "@/lib/db/connection";
import { CommentRepository } from "@/lib/repositories/comment-repository";
import { TagRepository } from "@/lib/repositories/tag-repository";
import { TicketRepository } from "@/lib/repositories/ticket-repository";
import { UserRepository } from "@/lib/repositories/user-repository";
import { TagService } from "./tag-service";
import { TicketService } from "./ticket-service";

export interface Services {
  tickets: TicketService;
  tags: TagService;
  users: UserRepository;
}

export function createServices(db: Db): Services {
  const users = new UserRepository(db);
  const tags = new TagRepository(db);
  const comments = new CommentRepository(db);
  const tickets = new TicketRepository(db);

  return {
    tickets: new TicketService({ tickets, comments, tags, users }),
    tags: new TagService(tags),
    users,
  };
}

/** 复用进程内单例连接 */
export function getServices(): Services {
  return createServices(getDb());
}
