/**
 * 统计业务层：负责补齐日期缺口、计算占比与派生指标，
 * 让接口与页面拿到的就是可以直接渲染的结构。
 */
import type { TicketPriority, TicketStatus } from "@/lib/domain/types";
import type { AssigneeLoad, StatsRepository } from "@/lib/repositories/stats-repository";

export interface TrendPoint {
  day: string;
  total: number;
}

export interface StatsOverview {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  unassigned: number;
  /** 近 N 天每日新建量，缺失的日期补 0 */
  trend: TrendPoint[];
  averageResolutionHours: number | null;
  assigneeLoad: AssigneeLoad[];
}

export class StatsService {
  constructor(private readonly stats: StatsRepository) {}

  overview(trendDays = 7): StatsOverview {
    const byStatus = this.stats.countByStatus();
    const byPriority = this.stats.countByPriority();
    const total = Object.values(byStatus).reduce((sum, value) => sum + value, 0);

    const raw = this.stats.countCreatedByDay(this.startOfTrend(trendDays));
    const counts = new Map(raw.map((row) => [row.day, row.total]));

    return {
      total,
      byStatus,
      byPriority,
      unassigned: this.stats.countUnassigned(),
      trend: this.fillTrend(trendDays, counts),
      averageResolutionHours: this.stats.averageResolutionHours(),
      assigneeLoad: this.stats.assigneeLoad(),
    };
  }

  /**
   * 趋势窗口统一按 UTC 计算：created_at 存的是 ISO 串，
   * SQL 里 substr(created_at, 1, 10) 取的也是 UTC 日期，两边口径必须一致。
   */
  private startOfTrend(days: number): string {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return start.toISOString();
  }

  private fillTrend(days: number, counts: Map<string, number>): TrendPoint[] {
    const points: TrendPoint[] = [];
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);
    cursor.setUTCDate(cursor.getUTCDate() - (days - 1));

    for (let index = 0; index < days; index += 1) {
      const day = cursor.toISOString().slice(0, 10);
      points.push({ day, total: counts.get(day) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return points;
  }
}
