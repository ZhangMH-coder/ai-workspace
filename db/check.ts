/**
 * Schema 一致性检查（P4-2a）：migrate 后运行，确保 schema 与已应用 migration 一致。
 * 用法：npm run db:check
 * 职责：防「seed/migration 漂移」——若 schema 有未生成 migration 的变更会报错。
 */
import { execSync } from "node:child_process";
import { sqlite } from "./db";

// 1) 检查 migration 已应用（drizzle 版本表非空 = 已 migrate）
const applied = sqlite
  .prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations")
  .get() as { n: number };
if (applied.n === 0) {
  console.error("✗ migration 未应用，请先执行 npm run db:migrate");
  process.exit(1);
}

// 2) 与 schema 对比（drizzle-kit check 语义：schema ↔ migrations 一致性）
try {
  execSync("npx drizzle-kit check", { stdio: "inherit" });
  console.log("✓ db:check 通过：migration 已应用且 schema 一致");
} catch {
  console.error(
    "✗ schema 与 migration 不一致：请先 npm run db:generate && npm run db:migrate"
  );
  process.exit(1);
} finally {
  sqlite.close();
}
