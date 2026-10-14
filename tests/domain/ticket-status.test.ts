import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/domain/errors";
import {
  assertTransition,
  canTransition,
  timestampsForTransition,
} from "@/lib/domain/ticket-status";

describe("工单状态机", () => {
  it("允许的跃迁", () => {
    expect(canTransition("open", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "resolved")).toBe(true);
    expect(canTransition("resolved", "closed")).toBe(true);
    expect(canTransition("closed", "open")).toBe(true);
  });

  it("禁止的跃迁：open 不能直接到 resolved", () => {
    expect(canTransition("open", "resolved")).toBe(false);
    expect(() => assertTransition("open", "resolved")).toThrow(AppError);
  });

  it("同状态重复提交会被判为冲突", () => {
    expect(() => assertTransition("open", "open")).toThrow(/已处于/);
  });

  it("非法跃迁带上 from / to 明细", () => {
    try {
      assertTransition("closed", "resolved");
      expect.unreachable("应当抛出错误");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_TRANSITION");
      expect((error as AppError).details).toEqual({ from: "closed", to: "resolved" });
    }
  });

  it("状态变更同步维护 resolvedAt / closedAt", () => {
    const now = "2026-10-14T00:00:00.000Z";

    expect(timestampsForTransition("open", "resolved", now)).toEqual({ resolvedAt: now });
    expect(timestampsForTransition("resolved", "closed", now)).toEqual({ closedAt: now });
    expect(timestampsForTransition("resolved", "in_progress", now)).toEqual({ resolvedAt: null });
    expect(timestampsForTransition("closed", "open", now)).toEqual({ closedAt: null });
  });
});
