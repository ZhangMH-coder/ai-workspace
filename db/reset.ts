/**
 * Reset 脚本（P4-2a）：清空业务数据 + 重跑 Seed（保留 migration 历史）
 * 用法：npm run db:reset
 */
import { clearAll, runSeed } from "./seed";
import { sqlite } from "./db";

clearAll();
const counts = runSeed();
console.log("✓ demo data reset:", JSON.stringify(counts));
sqlite.close();
