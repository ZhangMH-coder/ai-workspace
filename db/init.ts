/**
 * 从零初始化脚本（P4-4 交付增强）
 *
 * 本地开发与 Docker 容器共用的「干净环境初始化」入口：
 *   1) 应用 drizzle/ 目录下的版本化 migration（幂等，drizzle 内部记录版本）
 *   2) 若业务表为空则幂等 seed（upsert 演示数据）；已有数据则跳过，绝不覆盖
 *
 * 用法：npm run db:init
 * 数据文件：默认 data/ai-workspace.db（或 DATABASE_URL 覆盖，容器内指向持久化卷）
 */
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./db";
import { runSeed } from "./seed";

migrate(db, { migrationsFolder: "./drizzle" });

const row = sqlite.prepare("SELECT COUNT(*) AS n FROM agent").get() as {
  n: number;
};

if (row.n === 0) {
  const counts = runSeed();
  console.log("✓ db initialized (migrate + seed):", JSON.stringify(counts));
} else {
  console.log("✓ db initialized (migrate only; data present, seed skipped)");
}

sqlite.close();
