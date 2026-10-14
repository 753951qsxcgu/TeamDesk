import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TeamDesk · 团队工单协作",
    template: "%s · TeamDesk",
  },
  description: "轻量级团队工单协作平台：工单流转、评论协作、看板视图与统计看板",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
