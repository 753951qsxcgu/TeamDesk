import { AppError } from "@/lib/domain/errors";
import type { TagRecord } from "@/lib/domain/types";
import type { TagRepository } from "@/lib/repositories/tag-repository";

export class TagService {
  constructor(private readonly tags: TagRepository) {}

  list(): TagRecord[] {
    return this.tags.list();
  }

  create(name: string, color?: string): TagRecord {
    const trimmed = name.trim();
    if (!trimmed) throw AppError.badRequest("标签名不能为空");
    if (this.tags.findByName(trimmed)) {
      throw AppError.conflict(`标签「${trimmed}」已存在`);
    }
    return this.tags.create({ name: trimmed, color });
  }
}
