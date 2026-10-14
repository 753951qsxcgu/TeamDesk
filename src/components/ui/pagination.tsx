import Link from "next/link";
import { buildQuery } from "@/lib/web/query";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** 除 page 之外的既有查询条件，翻页时保留 */
  filters: Record<string, string | undefined>;
  basePath: string;
}

export function Pagination({ page, pageSize, total, filters, basePath }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const hrefFor = (target: number) => `${basePath}${buildQuery({ ...filters, page: target })}`;

  return (
    <nav className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm">
      <span className="text-slate-500">
        共 {total} 条 · 第 {page} / {totalPages} 页
      </span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            className="rounded-md bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            href={hrefFor(page - 1)}
          >
            上一页
          </Link>
        ) : (
          <span className="rounded-md bg-slate-50 px-3 py-1.5 text-slate-400 ring-1 ring-slate-200">
            上一页
          </span>
        )}
        {page < totalPages ? (
          <Link
            className="rounded-md bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            href={hrefFor(page + 1)}
          >
            下一页
          </Link>
        ) : (
          <span className="rounded-md bg-slate-50 px-3 py-1.5 text-slate-400 ring-1 ring-slate-200">
            下一页
          </span>
        )}
      </div>
    </nav>
  );
}
