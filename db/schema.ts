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
import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";

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

/* ---------------- Resource Intelligence（Phase 2：能力分析 / 能力索引） ----------------
 *
 * 边界原则：
 * - 事实层（discovered_resource）与 AI 分析层（resource_analysis / resource_capability）严格分离
 * - 分析输入全部来自真实文件（只读），零 Demo / Mock 数据
 * - resource_analysis 保留历史：同一资源可对应多次分析（不同输入指纹/分析器版本），
 *   通过 isCurrent 标记当前有效分析；唯一约束保证同一资源+同一输入指纹+同一分析器版本不重复生成
 * - resource_capability 必须可追溯：evidenceRef + evidenceSnippet 指向真实文件位置
 */

export const resourceAnalyses = sqliteTable(
  "resource_analysis",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => discoveredResources.id, { onDelete: "cascade" }),
    /** pending | analyzed | failed | expired */
    status: text("status").notNull(),
    /** heuristic | llm */
    strategy: text("strategy").notNull(),
    /** 分析器版本，如 "heuristic-v1"；版本升级触发全量重分析 */
    analyzerVersion: text("analyzer_version").notNull(),
    /** 记录创建时间（历史语义：保留多次分析记录） */
    createdAt: text("created_at").notNull(),
    /** 成功完成时间 */
    analyzedAt: text("analyzed_at"),
    /** sha1(sourcePath|lastModified|size|metaHash)：增量分析判定 */
    inputFingerprint: text("input_fingerprint").notNull(),
    /** 分析时读到的文件 mtime */
    resourceMtime: text("resource_mtime"),
    /** 当前有效分析标记（同资源只有一条 isCurrent=true） */
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    /** 分析器产出的一句话能力总述 */
    summary: text("summary"),
  },
  (t) => [
    // 同一资源 + 同一输入指纹 + 同一分析器版本 → 只保留一条（防止重复生成；重试更新同键记录）
    uniqueIndex("uq_analysis_resource_fp_version").on(
      t.resourceId,
      t.inputFingerprint,
      t.analyzerVersion
    ),
    index("idx_analysis_resource").on(t.resourceId),
    index("idx_analysis_status").on(t.status),
  ]
);

export const resourceCapabilities = sqliteTable(
  "resource_capability",
  {
    id: text("id").primaryKey(),
    analysisId: text("analysis_id")
      .notNull()
      .references(() => resourceAnalyses.id, { onDelete: "cascade" }),
    resourceId: text("resource_id")
      .notNull()
      .references(() => discoveredResources.id, { onDelete: "cascade" }),
    /** 能力动词短语，如 "从 RSS 源抓取并生成摘要" */
    capability: text("capability").notNull(),
    /** text_summary | web_research | code_gen | data_analysis | automation | content_creation | dev_tool | other */
    category: text("category").notNull(),
    /** JSON: 匹配用关键词数组 */
    keywords: text("keywords").notNull().default("[]"),
    /** 0-1 置信度（heuristic 为规则强度） */
    confidence: real("confidence").notNull().default(0),
    /** 证据定位，如 "SKILL.md#description" */
    evidenceRef: text("evidence_ref").notNull(),
    /** 证据原文片段（短，≤500 字符） */
    evidenceSnippet: text("evidence_snippet").notNull(),
    /** JSON: 本次归纳依赖的输入摘要 */
    inputContext: text("input_context").notNull().default("{}"),
    /** 未来执行层提示（仅描述，不执行） */
    executionHint: text("execution_hint"),
  },
  (t) => [
    uniqueIndex("uq_capability_analysis_cap").on(t.analysisId, t.capability),
    index("idx_capability_resource").on(t.resourceId),
    index("idx_capability_category").on(t.category),
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
export type ResourceAnalysisRow = typeof resourceAnalyses.$inferSelect;
export type ResourceCapabilityRow = typeof resourceCapabilities.$inferSelect;
