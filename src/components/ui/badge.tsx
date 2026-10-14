import type { ReactNode } from "react";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "muted";

const VARIANT_CLASS: Record<Variant, string> = {
  default: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  muted: "bg-white text-slate-500 ring-slate-200",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
