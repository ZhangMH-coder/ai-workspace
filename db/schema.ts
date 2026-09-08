/**
 * Drizzle Schema（P4-2a）
 *
 * 命名约定：
 * - 表名 snake_case；SQL 列名 snake_case（与 P4-1 §8 设计一致）
 * - TS 属性 camelCase（Drizzle 类型即 Domain 形状，Repository 层零映射成本）
 *
 * 约束策略：
 * - UNIQUE / Index / FK 由 Drizzle 生成
 * - CHECK 枚举约束由应用层（zod + Service）保证，避免 drizzle-kit 与手改 SQL 漂移
 * - 关系表（agent_capability / project_agent）只存外键 + 关系属性，不复制实体数据
 */
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable(
  "agent",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    model: text("model").notNull(),
    status: text("status").notNull().default("idle"),
    systemPrompt: text("system_prompt").notNull().default(""),
    createdAt: text("created_at").notNull(),
    lastRunAt: text("last_run_at"),
  },
  (t) => [index("idx_agent_status").on(t.status)]
);

export const capabilityDefinitions = sqliteTable(
  "capability_definition",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    lifecycle: text("lifecycle").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_capability_type").on(t.type)]
);

export const agentCapabilities = sqliteTable(
  "agent_capability",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    capabilityId: text("capability_id")
      .notNull()
      .references(() => capabilityDefinitions.id, { onDelete: "restrict" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_agent_capability").on(t.agentId, t.capabilityId),
    index("idx_agent_capability_agent").on(t.agentId),
    index("idx_agent_capability_capability").on(t.capabilityId),
  ]
);

export const projects = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_project_status").on(t.status)]
);

export const projectAgents = sqliteTable(
  "project_agent",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "restrict" }),
    addedAt: text("added_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_project_agent").on(t.projectId, t.agentId),
    index("idx_project_agent_project").on(t.projectId),
    index("idx_project_agent_agent").on(t.agentId),
  ]
);

export const agentRuns = sqliteTable(
  "agent_run",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    summary: text("summary").notNull().default(""),
    durationMs: integer("duration_ms"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    messages: integer("messages").notNull().default(0),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    // P5-2：Runtime 契约字段（model/provider 审计；input/output 用量；错误码）
    model: text("model"),
    provider: text("provider"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (t) => [
    index("idx_agent_run_agent_started").on(t.agentId, t.startedAt),
    index("idx_agent_run_started").on(t.startedAt),
  ]
);

/* ---------------- Resource Discovery（本地资源发现，V1 MVP） ----------------
 *
 * 三层结构：
 * 1. scan_run             —— 一次「重新扫描」的完整记录（扫描位置清单 + 汇总）
 * 2. harness_scan         —— 每个 Harness 在本次扫描中的命中结果（根路径 + 计数）
 * 3. discovered_resource  —— 统一资源索引（唯一 by sourcePath，幂等 upsert）
 *
 * 边界原则：
 * - 全部数据来自真实本地文件（只读发现 + 导入索引），不允许伪造资源
 * - discovered_resource 保留真实绝对路径，可溯源到原始文件
 * - 无法解析的资源 parseable=false，保留路径与基本信息，不猜测格式
 */

export const scanRuns = sqliteTable(
  "scan_run",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(), // completed | partial | failed
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at").notNull(),
    scanRoots: text("scan_roots").notNull().default("[]"), // JSON: 探测过的候选位置
    byHarness: text("by_harness").notNull().default("{}"), // JSON: 各 Harness 资源数
    byType: text("by_type").notNull().default("{}"), // JSON: 各类型资源数
    totalResources: integer("total_resources").notNull().default(0),
    parseableCount: integer("parseable_count").notNull().default(0),
  },
  (t) => [index("idx_scan_run_started").on(t.startedAt)]
);

export const harnessScans = sqliteTable(
  "harness_scan",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    harnessId: text("harness_id").notNull(),
    harnessName: text("harness_name").notNull(),
    rootPath: text("root_path").notNull(),
    found: integer("found", { mode: "boolean" }).notNull().default(false),
    resourceCount: integer("resource_count").notNull().default(0),
    scannedAt: text("scanned_at").notNull(),
  },
  (t) => [index("idx_harness_scan_scan").on(t.scanId)]
);

export const discoveredResources = sqliteTable(
  "discovered_resource",
  {
    id: text("id").primaryKey(),
    scanId: text("scan_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    harnessId: text("harness_id").notNull(),
    type: text("type").notNull(), // agent | skill | command | rule | prompt | mcp | plugin | other
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    source: text("source").notNull(), // Harness 展示名
    sourcePath: text("source_path").notNull(), // 真实绝对路径（唯一）
    framework: text("framework").notNull(),
    version: text("version"),
    status: text("status").notNull().default("unknown"), // enabled | unknown
    parseable: integer("parseable", { mode: "boolean" }).notNull().default(false),
    parseNote: text("parse_note"),
    lastModified: text("last_modified"),
    metadata: text("metadata").notNull().default("{}"), // JSON: 原始元数据摘要
  },
  (t) => [
    uniqueIndex("uq_discovered_source_path").on(t.sourcePath),
    index("idx_discovered_harness").on(t.harnessId),
    index("idx_discovered_type").on(t.type),
    index("idx_discovered_scan").on(t.scanId),
  ]
);

export type AgentRow = typeof agents.$inferSelect;
export type AgentRunRow = typeof agentRuns.$inferSelect;
export type CapabilityDefinitionRow = typeof capabilityDefinitions.$inferSelect;
export type AgentCapabilityRow = typeof agentCapabilities.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectAgentRow = typeof projectAgents.$inferSelect;
export type ScanRunRow = typeof scanRuns.$inferSelect;
export type HarnessScanRow = typeof harnessScans.$inferSelect;
export type DiscoveredResourceRow = typeof discoveredResources.$inferSelect;
