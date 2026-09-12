/**
 * P5-2 验证脚本（验收 A/B，D 因 Mock 执行链移除而废止）
 *
 * A. Run 状态机：合法 / 非法迁移断言
 * B. CapabilityLoader：enabled / disabled / archived 三场景
 *
 * 运行：npx tsx scripts/p52-verify.ts
 * 失败以非零退出码结束。
 */
import assert from "node:assert/strict";
import { canTransition, isFinalRunStatus } from "../lib/runtime/contracts";
import { buildExecutionContext } from "../lib/runtime/capability-loader";
import type { CapabilitySource } from "../lib/runtime/contracts";

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

/* ---------------- A. 状态机 ---------------- */
console.log("A. Run 状态机");

// 合法迁移
for (const [from, to] of [
  ["queued", "running"],
  ["queued", "cancelled"],
  ["running", "succeeded"],
  ["running", "failed"],
  ["running", "cancelled"],
] as const) {
  assert.equal(canTransition(from, to), true, `${from} → ${to} 应为合法`);
}
ok("合法迁移：queued→running/cancelled，running→succeeded/failed/cancelled");

// 非法迁移
for (const [from, to] of [
  ["succeeded", "running"],
  ["succeeded", "failed"],
  ["succeeded", "cancelled"],
  ["failed", "running"],
  ["failed", "succeeded"],
  ["cancelled", "running"],
  ["running", "queued"],
  ["queued", "succeeded"],
  ["queued", "failed"],
] as const) {
  assert.equal(canTransition(from, to), false, `${from} → ${to} 应为非法`);
}
ok("非法迁移：终态不可逆、running→queued、queued 直达终态均被拦截");

assert.equal(isFinalRunStatus("succeeded"), true);
assert.equal(isFinalRunStatus("failed"), true);
assert.equal(isFinalRunStatus("cancelled"), true);
assert.equal(isFinalRunStatus("queued"), false);
assert.equal(isFinalRunStatus("running"), false);
ok("终态判定：succeeded/failed/cancelled 为终态，queued/running 非终态");

async function main() {
/* ---------------- B. CapabilityLoader 三场景 ---------------- */
console.log("B. CapabilityLoader（enabled / disabled / archived）");

const bSource: CapabilitySource = {
  getAgent() {
    return { id: "a1", name: "测试 Agent", systemPrompt: "基座系统提示", model: "doubao-pro" };
  },
  listAssemblies() {
    return [
      // enabled + active → 进入执行上下文
      { capabilityId: "r1", enabled: true, type: "rule", name: "安全约束", description: "禁止输出敏感信息", lifecycle: "active" },
      { capabilityId: "s1", enabled: true, type: "skill", name: "网页搜索", description: "联网检索", lifecycle: "active" },
      { capabilityId: "m1", enabled: true, type: "memory", name: "长期记忆", description: "长期偏好", lifecycle: "active" },
      { capabilityId: "t1", enabled: true, type: "tool", name: "HTTP 请求", description: "发起请求", lifecycle: "active" },
      // disabled → 不进入
      { capabilityId: "s2", enabled: false, type: "skill", name: "禁用技能", description: "不应出现", lifecycle: "active" },
      // archived → 不进入
      { capabilityId: "r2", enabled: true, type: "rule", name: "归档规则", description: "不应出现", lifecycle: "archived" },
    ];
  },
};

const bCtx = await buildExecutionContext("a1", bSource);

assert.ok(bCtx.systemPrompt.includes("基座系统提示"), "基座提示应存在");
assert.ok(bCtx.systemPrompt.includes("安全约束"), "enabled+active 的 rule 应注入");
assert.ok(bCtx.systemPrompt.includes("网页搜索"), "enabled+active 的 skill 应注入");
assert.ok(bCtx.systemPrompt.includes("HTTP 请求"), "enabled+active 的 tool 应注入");
assert.ok(bCtx.systemPrompt.includes("[记忆] 存在 1 项装配"), "enabled+active 的 memory 应以 stub 文案注入");
assert.ok(!bCtx.systemPrompt.includes("禁用技能"), "disabled 装配不应注入");
assert.ok(!bCtx.systemPrompt.includes("归档规则"), "archived 装配不应注入");
assert.equal(bCtx.rules.length, 1);
assert.equal(bCtx.tools.length, 1);
assert.equal(bCtx.skills.length, 1);
assert.equal(bCtx.memoryHints.length, 1);
assert.equal(bCtx.assembledCount, 6, "assembledCount 应为全部装配数（含 disabled/archived）");
ok("enabled+active 进入上下文；disabled / archived 不进入；assembledCount=6");

// archived-only：全部装配均归档时，无任何能力进入
const bCtx2 = await buildExecutionContext("a1", {
  ...bSource,
  listAssemblies: () => [
    { capabilityId: "r9", enabled: true, type: "rule", name: "已归档", description: "", lifecycle: "archived" },
  ],
});
assert.equal(bCtx2.rules.length, 0);
assert.ok(bCtx2.systemPrompt.includes("基座系统提示"));
ok("全部装配归档时：能力区为空，仍保留基座提示");

/* ---------------- D. 已废止：Mock Runtime 执行链随虚拟数据删除移除 ---------------- */
console.log("（D 已废止：MockProvider 执行链随虚拟演示数据删除移除）");

/* 全部通过 */
console.log(`passed: ${passed}`);
}

main().catch((e) => {
  console.error("P5-2 验证失败：", e);
  process.exit(1);
});
