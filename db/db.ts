/**
 * SQLite 连接（P4-2a）
 *
 * Adapter 边界：better-sqlite3 为唯一实际实现；
 * 未来切换 node:sqlite / libsql 时，仅本文件驱动行变化，Repository/Service 零改动。
 * 驱动判断不散落到任何业务层。
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL ?? path.join(dataDir, "ai-workspace.db");

/** 关键 pragma：外键约束默认关闭，必须显式开启（否则 CASCADE/RESTRICT 不生效） */
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
