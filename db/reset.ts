/**
 * Reset 脚本（方向调整 S0）：清空演示业务数据，保留真实资源数据
 * 用法：npm run db:reset
 */
import { clearAll } from "./seed";
import { sqlite } from "./db";

clearAll();
console.log("✓ 演示业务数据已清空（真实资源数据保留）");
sqlite.close();
