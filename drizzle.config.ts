import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit 配置（P4-2）
 * - 数据库：SQLite（better-sqlite3，本地文件 data/ai-workspace.db）
 * - Schema 变更唯一通道：drizzle-kit generate（见 package.json db:generate）
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/ai-workspace.db",
  },
  verbose: true,
  strict: true,
});
