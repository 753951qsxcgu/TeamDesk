# 语法：node:20-bookworm-slim
#
# 三个阶段：装依赖 → 构建 → 运行。better-sqlite3 是原生模块，
# deps 阶段备好编译工具，防止目标平台没有预编译产物时直接失败。

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TEAMDESK_DB_PATH=/app/data/teamdesk.db

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# 数据库落在挂载卷里，避免容器重建丢数据
VOLUME ["/app/data"]
EXPOSE 3000

# 启动前先跑迁移，保证镜像升级后结构也是最新的
CMD ["sh", "-c", "npm run db:migrate && npm start"]
