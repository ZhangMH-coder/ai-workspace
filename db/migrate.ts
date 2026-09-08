/**
 * Migration 应用脚本（P4-2a）
 * 用法：npm run db:migrate
 * 职责：应用 drizzle/ 目录下版本化 SQL 到 SQLite；可重复执行（drizzle 内部记录版本）。
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./db";

migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();
console.log("✓ migration applied");
