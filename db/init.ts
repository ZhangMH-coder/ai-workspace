/**
 * 从零初始化脚本（P4-4 → 方向调整 S0）
 *   1) 应用 drizzle migration
 *   2) 不再种任何演示数据（早期 seed 已废弃）
 * 用法：npm run db:init
 * 数据文件：默认 data/ai-workspace.db（或 DATABASE_URL 覆盖，容器内指向持久化卷）
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./db";

migrate(db, { migrationsFolder: "./drizzle" });
console.log("✓ db initialized (migrate; 演示 seed 已废弃，不种假数据)");
sqlite.close();
