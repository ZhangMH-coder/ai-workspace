# syntax=docker/dockerfile:1
# AI Workspace — V1 Release Candidate
# 多阶段构建：deps(全量) → build(Next.js) → runner(生产依赖 + 持久化数据卷)
# 说明：容器内 db 运维脚本（db:init / db:migrate / db:check）经 tsx 运行，tsx 已在 dependencies 中。

# ---------- Stage 1: deps（全量依赖，含构建所需 devDeps） ----------
FROM node:22-slim AS deps
WORKDIR /app
# better-sqlite3 原生模块：优先使用 npm prebuilt binary；缺失时本地编译兜底
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: build ----------
FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期会加载 route handler 引用的 SQLite 连接（db/db.ts），预先创建空数据目录，
# 保证构建不依赖任何本地已有数据库状态。
RUN mkdir -p data && npm run build

# ---------- Stage 3: runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# SQLite 事实源：必须位于持久化卷挂载点（docker-compose 将 ./data 绑定至 /app/data），
# 禁止把数据库写入临时容器层（容器重建即丢失）。
ENV DATABASE_URL=/app/data/ai-workspace.db
RUN mkdir -p /app/data
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/db ./db
COPY --from=build /app/.next ./.next
# 生产依赖（--omit=dev：typescript/eslint/tailwind 等不进运行时镜像；tsx 保留供 db 脚本）
RUN npm ci --omit=dev

EXPOSE 3000
# 启动语义：db:init（幂等 migration + 空库 seed）→ 生产服务。
# 容器重启：migration 幂等、已有数据跳过 seed → 数据正常保留。
CMD ["sh", "-c", "npm run db:init && npm run start"]
