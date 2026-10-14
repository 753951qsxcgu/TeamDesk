import { describe, expect, it } from "vitest";
import { SLA_HOURS, evaluateSla, slaDueAt } from "@/lib/domain/sla";

const NOW = Date.parse("2026-01-10T12:00:00.000Z");
const HOUR = 3_600_000;

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}

describe("slaDueAt", () => {
  it("按优先级折算截止时间", () => {
    const created = hoursAgo(0);

    expect(slaDueAt(created, "urgent")).toBe(new Date(NOW + 4 * HOUR).toISOString());
    expect(SLA_HOURS.high).toBe(8);
    expect(SLA_HOURS.medium).toBe(24);
    expect(SLA_HOURS.low).toBe(72);
  });
});

describe("evaluateSla", () => {
  it("未超时时给出剩余小时数", () => {
    const state = evaluateSla({
      createdAt: hoursAgo(1),
      priority: "urgent",
      now: NOW,
    });

    expect(state.overdue).toBe(false);
    expect(state.hoursLeft).toBe(3);
  });

  it("超过承诺时限判定为超时，并给出超时小时数", () => {
    const state = evaluateSla({
      createdAt: hoursAgo(6),
      priority: "urgent",
      now: NOW,
    });

    expect(state.overdue).toBe(true);
    expect(state.hoursLeft).toBe(-2);
  });

  it("已解决的工单按解决时间停表，之后拖再久也不算超时", () => {
    const state = evaluateSla({
      createdAt: hoursAgo(30),
      priority: "urgent",
      resolvedAt: hoursAgo(29),
      now: NOW,
    });

    expect(state.overdue).toBe(false);
    expect(state.hoursLeft).toBe(3);
  });

  it("解决时已经超时的，状态仍然记为超时", () => {
    const state = evaluateSla({
      createdAt: hoursAgo(10),
      priority: "urgent",
      resolvedAt: hoursAgo(5),
      now: NOW,
    });

    expect(state.overdue).toBe(true);
    expect(state.hoursLeft).toBe(-1);
  });

  it("低优先级工单时限更长，同样的等待不算超时", () => {
    const created = hoursAgo(48);

    expect(evaluateSla({ createdAt: created, priority: "low", now: NOW }).overdue).toBe(false);
    expect(evaluateSla({ createdAt: created, priority: "medium", now: NOW }).overdue).toBe(true);
  });
});
