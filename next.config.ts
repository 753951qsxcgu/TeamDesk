import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // better-sqlite3 是原生模块，不能被打包进 server bundle
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // 让 route handler 默认的缓存策略显式化，避免开发期拿到脏数据
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
