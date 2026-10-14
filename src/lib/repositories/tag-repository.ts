import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/connection";
import type { TagRecord } from "@/lib/domain/types";
import { mapTag, type TagRow } from "./mappers";

export interface CreateTagInput {
  name: string;
  color?: string;
}

const DEFAULT_COLOR = "#64748b";

export class TagRepository {
  constructor(private readonly db: Db) {}

  create(input: CreateTagInput): TagRecord {
    const record: TagRecord = {
      id: randomUUID(),
      name: input.name.trim(),
      color: input.color ?? DEFAULT_COLOR,
    };
    this.db
      .prepare("INSERT INTO tags (id, name, color) VALUES (@id, @name, @color)")
      .run(record);
    return record;
  }

  /** 幂等地取回标签：已存在则复用，避免重复标签刷屏 */
  ensure(name: string, color?: string): TagRecord {
    const found = this.findByName(name);
    return found ?? this.create({ name, color });
  }

  findById(id: string): TagRecord | null {
    const row = this.db.prepare("SELECT * FROM tags WHERE id = ?").get(id) as TagRow | undefined;
    return row ? mapTag(row) : null;
  }

  findByName(name: string): TagRecord | null {
    const row = this.db
      .prepare("SELECT * FROM tags WHERE name = ?")
      .get(name.trim()) as TagRow | undefined;
    return row ? mapTag(row) : null;
  }

  list(): TagRecord[] {
    const rows = this.db.prepare("SELECT * FROM tags ORDER BY name ASC").all() as TagRow[];
    return rows.map(mapTag);
  }

  listByTicketIds(ticketIds: string[]): Map<string, TagRecord[]> {
    const result = new Map<string, TagRecord[]>();
    if (ticketIds.length === 0) return result;

    const placeholders = ticketIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(
        `SELECT tt.ticket_id AS ticketId, t.id, t.name, t.color
           FROM ticket_tags tt
           JOIN tags t ON t.id = tt.tag_id
          WHERE tt.ticket_id IN (${placeholders})
          ORDER BY t.name ASC`,
      )
      .all(...ticketIds) as (TagRow & { ticketId: string })[];

    for (const row of rows) {
      const list = result.get(row.ticketId) ?? [];
      list.push(mapTag(row));
      result.set(row.ticketId, list);
    }
    return result;
  }

  /** 全量覆盖工单的标签集合，先清后插，保持幂等 */
  setTicketTags(ticketId: string, tagIds: string[]): void {
    const replace = this.db.transaction((ids: string[]) => {
      this.db.prepare("DELETE FROM ticket_tags WHERE ticket_id = ?").run(ticketId);
      const insert = this.db.prepare(
        "INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)",
      );
      for (const id of ids) {
        insert.run(ticketId, id);
      }
    });
    replace(tagIds);
  }
}
