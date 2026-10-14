/**
 * 数据库结构定义。
 * 迁移以「版本 + SQL」数组的形式维护，新增结构变更时往数组尾部追加即可，
 * 已执行过的版本不会重复执行。
 */

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: "init_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'member',
        created_at    TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status      TEXT NOT NULL DEFAULT 'open',
        priority    TEXT NOT NULL DEFAULT 'medium',
        reporter_id TEXT NOT NULL,
        assignee_id TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        resolved_at TEXT,
        closed_at   TEXT,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_status    ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_assignee  ON tickets(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_created   ON tickets(created_at DESC);

      CREATE TABLE IF NOT EXISTS comments (
        id         TEXT PRIMARY KEY,
        ticket_id  TEXT NOT NULL,
        author_id  TEXT NOT NULL,
        body       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id, created_at);

      CREATE TABLE IF NOT EXISTS tags (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#64748b'
      );

      CREATE TABLE IF NOT EXISTS ticket_tags (
        ticket_id TEXT NOT NULL,
        tag_id    TEXT NOT NULL,
        PRIMARY KEY (ticket_id, tag_id),
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag ON ticket_tags(tag_id);
    `,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
