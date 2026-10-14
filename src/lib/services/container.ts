import { getDb, type Db } from "@/lib/db/connection";
import { CommentRepository } from "@/lib/repositories/comment-repository";
import { StatsRepository } from "@/lib/repositories/stats-repository";
import { TagRepository } from "@/lib/repositories/tag-repository";
import { TicketRepository } from "@/lib/repositories/ticket-repository";
import { UserRepository } from "@/lib/repositories/user-repository";
import { StatsService } from "./stats-service";
import { TagService } from "./tag-service";
import { TicketService } from "./ticket-service";
import { UserService } from "./user-service";

export interface Services {
  tickets: TicketService;
  tags: TagService;
  users: UserService;
  stats: StatsService;
}

export function createServices(db: Db): Services {
  const users = new UserService(new UserRepository(db));
  const tags = new TagRepository(db);
  const comments = new CommentRepository(db);
  const tickets = new TicketRepository(db);

  return {
    tickets: new TicketService({ tickets, comments, tags, users }),
    tags: new TagService(tags),
    users,
    stats: new StatsService(new StatsRepository(db)),
  };
}

/** 复用进程内数据库单例 */
export function getServices(): Services {
  return createServices(getDb());
}