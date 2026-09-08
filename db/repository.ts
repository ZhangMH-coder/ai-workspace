/**
 * Repository 层（P4-2a）
 *
 * 职责：唯一的数据访问层。返回 Drizzle Row（camelCase，与前端 Domain 同构）。
 * 不包含业务规则（规则在 Service）；不抛 HTTP 语义错误（由 Service 转换）。
 *
 * Adapter 边界：本层只依赖 drizzle-orm（better-sqlite3 driver 在 db.ts 隔离）；
 * 未来切 node:sqlite / libsql 时本层代码零改动。
 */
import { and, asc, count, desc, eq, gte, inArray, like, lt, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  agentCapabilities,
  agentRuns,
  agents,
  capabilityDefinitions,
  discoveredResources,
  harnessScans,
  projectAgents,
  projects,
  scanRuns,
} from "./schema";

/* ---------------- 通用分页 ---------------- */

export interface PageQuery {
  page: number;
  pageSize: number;
}

export function offsetOf(q: PageQuery) {
  return (q.page - 1) * q.pageSize;
}

/* ---------------- Agent ---------------- */

export interface AgentFilters {
  search?: string;
  status?: string;
  sort?: string;
}

export function listAgents(f: AgentFilters, q: PageQuery) {
  const conds = [];
  if (f.search) {
    const s = `%${f.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conds.push(or(like(agents.name, s), like(agents.description, s)));
  }
  if (f.status) conds.push(eq(agents.status, f.status));
  const where = conds.length ? and(...conds) : undefined;

  const orderBy =
    f.sort === "name:asc" ? asc(agents.name) :
    f.sort === "name:desc" ? desc(agents.name) :
    f.sort === "createdAt:asc" ? asc(agents.createdAt) :
    f.sort === "createdAt:desc" ? desc(agents.createdAt) :
    desc(agents.createdAt);

  const total = db.select({ n: count() }).from(agents).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(agents)
    .where(where)
    .orderBy(orderBy)
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

export function getAgent(id: string) {
  return db.select().from(agents).where(eq(agents.id, id)).get() ?? null;
}

export function insertAgent(row: typeof agents.$inferInsert) {
  return db.insert(agents).values(row).returning().get();
}

export function updateAgent(id: string, patch: Partial<typeof agents.$inferInsert>) {
  return db.update(agents).set(patch).where(eq(agents.id, id)).returning().get() ?? null;
}

/* ---------------- AgentRun ---------------- */

export interface RunFilters {
  from?: string; // ISO（服务端归一化为 UTC）
  to?: string;
  agentIds?: string[];
  projectId?: string; // 经 project_agent join 派生（项目统计 = 派生，不落 projectId）
  status?: string;
  sort?: string;
}

function resolveRunAgentIds(f: RunFilters): string[] | null {
  if (f.projectId) {
    const rows = db
      .select({ agentId: projectAgents.agentId })
      .from(projectAgents)
      .where(eq(projectAgents.projectId, f.projectId))
      .all();
    return rows.map((r) => r.agentId);
  }
  return f.agentIds ?? null;
}

export function listRuns(f: RunFilters, q: PageQuery) {
  const conds = [];
  if (f.from) conds.push(gte(agentRuns.startedAt, f.from));
  if (f.to) conds.push(lt(agentRuns.startedAt, f.to));
  if (f.status) conds.push(eq(agentRuns.status, f.status));
  const ids = resolveRunAgentIds(f);
  if (ids !== null) conds.push(inArray(agentRuns.agentId, ids.length ? ids : ["__none__"]));
  const where = conds.length ? and(...conds) : undefined;

  const orderBy =
    f.sort === "startedAt:asc" ? asc(agentRuns.startedAt) : desc(agentRuns.startedAt);

  const total = db.select({ n: count() }).from(agentRuns).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(agentRuns)
    .where(where)
    .orderBy(orderBy)
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

export interface RunsStatsFilters {
  from: string;
  to: string;
  agentIds?: string[];
  projectId?: string;
}

export interface DailyStat {
  date: string;
  runs: number;
  succeeded: number;
  failed: number;
  successRate: number;
}

export function runsStats(f: RunsStatsFilters): {
  totals: {
    runs: number;
    succeeded: number;
    failed: number;
    successRate: number;
    tokens: number;
    avgDurationMs: number;
    lastRunAt: string | null;
  };
  daily: DailyStat[];
} {
  const conds = [gte(agentRuns.startedAt, f.from), lt(agentRuns.startedAt, f.to)];
  const ids = resolveRunAgentIds({ projectId: f.projectId, agentIds: f.agentIds });
  if (ids !== null) conds.push(inArray(agentRuns.agentId, ids.length ? ids : ["__none__"]));
  const where = and(...conds);

  const totals = db
    .select({
      runs: count(),
      succeeded: sql<number>`COALESCE(SUM(CASE WHEN ${agentRuns.status} = 'succeeded' THEN 1 ELSE 0 END), 0)`,
      failed: sql<number>`COALESCE(SUM(CASE WHEN ${agentRuns.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
      tokens: sql<number>`COALESCE(SUM(${agentRuns.tokensUsed}), 0)`,
      avgDurationMs: sql<number>`COALESCE(AVG(${agentRuns.durationMs}), 0)`,
      lastRunAt: sql<string | null>`MAX(${agentRuns.startedAt})`,
    })
    .from(agentRuns)
    .where(where)
    .get()!;

  const rows = db
    .select({
      date: sql<string>`substr(${agentRuns.startedAt}, 1, 10)`,
      runs: count(),
      succeeded: sql<number>`COALESCE(SUM(CASE WHEN ${agentRuns.status} = 'succeeded' THEN 1 ELSE 0 END), 0)`,
      failed: sql<number>`COALESCE(SUM(CASE WHEN ${agentRuns.status} = 'failed' THEN 1 ELSE 0 END), 0)`,
    })
    .from(agentRuns)
    .where(where)
    .groupBy(sql`substr(${agentRuns.startedAt}, 1, 10)`)
    .orderBy(asc(sql`substr(${agentRuns.startedAt}, 1, 10)`))
    .all();

  const daily: DailyStat[] = rows.map((r) => ({
    date: r.date,
    runs: r.runs,
    succeeded: r.succeeded,
    failed: r.failed,
    successRate: r.runs > 0 ? Math.round((r.succeeded / r.runs) * 1000) / 10 : 0,
  }));

  const total = totals.runs;
  return {
    totals: {
      runs: total,
      succeeded: totals.succeeded,
      failed: totals.failed,
      successRate: total > 0 ? Math.round((totals.succeeded / total) * 1000) / 10 : 0,
      tokens: totals.tokens,
      avgDurationMs: Math.round(totals.avgDurationMs),
      lastRunAt: totals.lastRunAt,
    },
    daily,
  };
}

export function insertRun(row: typeof agentRuns.$inferInsert) {
  return db.insert(agentRuns).values(row).returning().get();
}

export function getRun(id: string) {
  return db.select().from(agentRuns).where(eq(agentRuns.id, id)).get() ?? null;
}

/** P5-2：Run 状态迁移 / 结果落库（Service 层校验状态机合法性后调用） */
export function updateRun(
  id: string,
  patch: Partial<Pick<
    typeof agentRuns.$inferInsert,
    | "status"
    | "summary"
    | "durationMs"
    | "tokensUsed"
    | "finishedAt"
    | "model"
    | "provider"
    | "inputTokens"
    | "outputTokens"
    | "errorCode"
    | "errorMessage"
  >>
) {
  return db.update(agentRuns).set(patch).where(eq(agentRuns.id, id)).returning().get();
}

/* ---------------- CapabilityDefinition ---------------- */

export interface DefinitionFilters {
  type?: string;
  lifecycle?: string;
  search?: string;
  sort?: string;
}

export function listCapabilityDefinitions(f: DefinitionFilters, q: PageQuery) {
  const conds = [];
  if (f.type) conds.push(eq(capabilityDefinitions.type, f.type));
  if (f.lifecycle) conds.push(eq(capabilityDefinitions.lifecycle, f.lifecycle));
  if (f.search) {
    const s = `%${f.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conds.push(or(like(capabilityDefinitions.name, s), like(capabilityDefinitions.description, s)));
  }
  const where = conds.length ? and(...conds) : undefined;

  const orderBy =
    f.sort === "name:asc" ? asc(capabilityDefinitions.name) :
    f.sort === "name:desc" ? desc(capabilityDefinitions.name) :
    f.sort === "createdAt:asc" ? asc(capabilityDefinitions.createdAt) :
    f.sort === "createdAt:desc" ? desc(capabilityDefinitions.createdAt) :
    desc(capabilityDefinitions.createdAt);

  const total = db.select({ n: count() }).from(capabilityDefinitions).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(capabilityDefinitions)
    .where(where)
    .orderBy(orderBy)
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

export function getCapabilityDefinition(id: string) {
  return db.select().from(capabilityDefinitions).where(eq(capabilityDefinitions.id, id)).get() ?? null;
}

export function insertCapabilityDefinition(row: typeof capabilityDefinitions.$inferInsert) {
  return db.insert(capabilityDefinitions).values(row).returning().get();
}

export function updateCapabilityDefinition(
  id: string,
  patch: Partial<typeof capabilityDefinitions.$inferInsert>
) {
  return db
    .update(capabilityDefinitions)
    .set(patch)
    .where(eq(capabilityDefinitions.id, id))
    .returning()
    .get() ?? null;
}

/* ---------------- AgentCapability ---------------- */

export function listAgentCapabilities(f: { agentId?: string; capabilityId?: string }, q: PageQuery) {
  const conds = [];
  if (f.agentId) conds.push(eq(agentCapabilities.agentId, f.agentId));
  if (f.capabilityId) conds.push(eq(agentCapabilities.capabilityId, f.capabilityId));
  const where = conds.length ? and(...conds) : undefined;
  const total = db.select({ n: count() }).from(agentCapabilities).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(agentCapabilities)
    .where(where)
    .orderBy(desc(agentCapabilities.createdAt))
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

/** P5-2：Runtime 装配查询（join CapabilityDefinition，只读；供 CapabilityLoader 消费） */
export function listRuntimeAssemblies(agentId: string) {
  return db
    .select({
      capabilityId: agentCapabilities.capabilityId,
      enabled: agentCapabilities.enabled,
      type: capabilityDefinitions.type,
      name: capabilityDefinitions.name,
      description: capabilityDefinitions.description,
      lifecycle: capabilityDefinitions.lifecycle,
    })
    .from(agentCapabilities)
    .innerJoin(
      capabilityDefinitions,
      eq(agentCapabilities.capabilityId, capabilityDefinitions.id)
    )
    .where(eq(agentCapabilities.agentId, agentId))
    .all();
}

export function getAgentCapability(id: string) {
  return db.select().from(agentCapabilities).where(eq(agentCapabilities.id, id)).get() ?? null;
}

export function getAgentCapabilityByPair(agentId: string, capabilityId: string) {
  return db
    .select()
    .from(agentCapabilities)
    .where(
      and(
        eq(agentCapabilities.agentId, agentId),
        eq(agentCapabilities.capabilityId, capabilityId)
      )
    )
    .get() ?? null;
}

export function insertAgentCapability(row: typeof agentCapabilities.$inferInsert) {
  return db.insert(agentCapabilities).values(row).returning().get();
}

export function updateAgentCapability(id: string, patch: Partial<typeof agentCapabilities.$inferInsert>) {
  return db.update(agentCapabilities).set(patch).where(eq(agentCapabilities.id, id)).returning().get() ?? null;
}

export function deleteAgentCapability(id: string) {
  db.delete(agentCapabilities).where(eq(agentCapabilities.id, id)).run();
}

/* ---------------- Project ---------------- */

export interface ProjectFilters {
  status?: string;
  search?: string;
  sort?: string;
}

export function listProjects(f: ProjectFilters, q: PageQuery) {
  const conds = [];
  if (f.status) conds.push(eq(projects.status, f.status));
  if (f.search) {
    const s = `%${f.search.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    conds.push(or(like(projects.name, s), like(projects.description, s)));
  }
  const where = conds.length ? and(...conds) : undefined;
  const orderBy =
    f.sort === "name:asc" ? asc(projects.name) :
    f.sort === "createdAt:asc" ? asc(projects.createdAt) :
    desc(projects.createdAt);
  const total = db.select({ n: count() }).from(projects).where(where).get()?.n ?? 0;
  const items = db.select().from(projects).where(where).orderBy(orderBy).limit(q.pageSize).offset(offsetOf(q)).all();
  return { items, total };
}

export function getProject(id: string) {
  return db.select().from(projects).where(eq(projects.id, id)).get() ?? null;
}

export function insertProject(row: typeof projects.$inferInsert) {
  return db.insert(projects).values(row).returning().get();
}

export function updateProject(id: string, patch: Partial<typeof projects.$inferInsert>) {
  return db.update(projects).set(patch).where(eq(projects.id, id)).returning().get() ?? null;
}

/* ---------------- ProjectAgent ---------------- */

export function listProjectAgents(f: { projectId?: string; agentId?: string }, q: PageQuery) {
  const conds = [];
  if (f.projectId) conds.push(eq(projectAgents.projectId, f.projectId));
  if (f.agentId) conds.push(eq(projectAgents.agentId, f.agentId));
  const where = conds.length ? and(...conds) : undefined;
  const total = db.select({ n: count() }).from(projectAgents).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(projectAgents)
    .where(where)
    .orderBy(desc(projectAgents.addedAt))
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

export function getProjectAgentByPair(projectId: string, agentId: string) {
  return db
    .select()
    .from(projectAgents)
    .where(and(eq(projectAgents.projectId, projectId), eq(projectAgents.agentId, agentId)))
    .get() ?? null;
}

export function getProjectAgent(id: string) {
  return db.select().from(projectAgents).where(eq(projectAgents.id, id)).get() ?? null;
}

export function insertProjectAgent(row: typeof projectAgents.$inferInsert) {
  return db.insert(projectAgents).values(row).returning().get();
}

export function deleteProjectAgent(id: string) {
  db.delete(projectAgents).where(eq(projectAgents.id, id)).run();
}

/* ---------------- Resource Discovery（本地资源发现，V1 MVP） ---------------- */

export function insertScanRun(row: typeof scanRuns.$inferInsert) {
  return db.insert(scanRuns).values(row).returning().get();
}

export function insertHarnessScan(row: typeof harnessScans.$inferInsert) {
  db.insert(harnessScans).values(row).run();
}

/** 以 sourcePath 为唯一键幂等 upsert（重复扫描不产生重复资源）；返回最新行 */
export function upsertDiscoveredResource(row: typeof discoveredResources.$inferInsert) {
  return db
    .insert(discoveredResources)
    .values(row)
    .onConflictDoUpdate({
      target: discoveredResources.sourcePath,
      set: {
        scanId: row.scanId,
        harnessId: row.harnessId,
        type: row.type,
        name: row.name,
        description: row.description,
        source: row.source,
        framework: row.framework,
        version: row.version,
        status: row.status,
        parseable: row.parseable,
        parseNote: row.parseNote,
        lastModified: row.lastModified,
        metadata: row.metadata,
      },
    })
    .returning()
    .get();
}

export function getLatestScanRun() {
  return db.select().from(scanRuns).orderBy(desc(scanRuns.startedAt)).limit(1).get() ?? null;
}

export function getScanRun(id: string) {
  return db.select().from(scanRuns).where(eq(scanRuns.id, id)).get() ?? null;
}

export function listHarnessScansByScan(scanId: string) {
  return db
    .select()
    .from(harnessScans)
    .where(eq(harnessScans.scanId, scanId))
    .orderBy(asc(harnessScans.harnessName))
    .all();
}

export interface DiscoveredResourceQuery {
  search?: string;
  type?: string;
  harness?: string;
  parseable?: boolean;
  page: number;
  pageSize: number;
}

export function listDiscoveredResources(q: DiscoveredResourceQuery) {
  const conds = [];
  if (q.search) {
    const s = `%${q.search}%`;
    conds.push(or(like(discoveredResources.name, s), like(discoveredResources.sourcePath, s)));
  }
  if (q.type) conds.push(eq(discoveredResources.type, q.type));
  if (q.harness) conds.push(eq(discoveredResources.harnessId, q.harness));
  if (q.parseable !== undefined) conds.push(eq(discoveredResources.parseable, q.parseable));
  const where = conds.length ? and(...conds) : undefined;

  const total = db
    .select({ n: count() })
    .from(discoveredResources)
    .where(where)
    .get()?.n ?? 0;
  const items = db
    .select()
    .from(discoveredResources)
    .where(where)
    .orderBy(desc(discoveredResources.lastModified), asc(discoveredResources.name))
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

export function getDiscoveredResource(id: string) {
  return db.select().from(discoveredResources).where(eq(discoveredResources.id, id)).get() ?? null;
}

export function countDiscoveredResources() {
  return db.select({ n: count() }).from(discoveredResources).get()?.n ?? 0;
}

export function listDistinctHarnessResources() {
  return db
    .select({ harnessId: discoveredResources.harnessId, n: count() })
    .from(discoveredResources)
    .groupBy(discoveredResources.harnessId)
    .all();
}
