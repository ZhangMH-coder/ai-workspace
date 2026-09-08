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

export type AgentRow = typeof agents.$inferSelect;
export type AgentRunRow = typeof agentRuns.$inferSelect;
export type CapabilityDefinitionRow = typeof capabilityDefinitions.$inferSelect;
export type AgentCapabilityRow = typeof agentCapabilities.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectAgentRow = typeof projectAgents.$inferSelect;
