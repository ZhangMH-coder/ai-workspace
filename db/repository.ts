/**
 * Repository 层（P4-2a）
 *
 * 职责：唯一的数据访问层。返回 Drizzle Row（camelCase，与前端 Domain 同构）。
 * 不包含业务规则（规则在 Service）；不抛 HTTP 语义错误（由 Service 转换）。
 *
 * Adapter 边界：本层只依赖 drizzle-orm（better-sqlite3 driver 在 db.ts 隔离）；
 * 未来切 node:sqlite / libsql 时本层代码零改动。
 */
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, gte, inArray, like, lt, ne, notInArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "./db";
import {
  agentCapabilities,
  agentRuns,
  agents,
  capabilityDefinitions,
  discoveredResources,
  harnessScans,
  llmProviderConfigs,
  llmProviderEndpoints,
  planDependencies,
  projectAgents,
  projectResources,
  projects,
  resourceAnalyses,
  resourceCapabilities,
  resourceRecommendations,
  scanRuns,
  taskAnalyses,
  taskPlans,
  taskRequirements,
  userHiddenResources,
  userProfiles,
  planSteps,
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
    | "output"
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

/* ---------------- ProjectResource（S1.55：项目 = 使用场景，挂真实资源） ---------------- */

export function listProjectResources(f: { projectId?: string; resourceId?: string }, q: PageQuery) {
  const conds = [];
  if (f.projectId) conds.push(eq(projectResources.projectId, f.projectId));
  if (f.resourceId) conds.push(eq(projectResources.resourceId, f.resourceId));
  const where = conds.length ? and(...conds) : undefined;
  const total = db.select({ n: count() }).from(projectResources).where(where).get()?.n ?? 0;
  const items = db
    .select()
    .from(projectResources)
    .where(where)
    .orderBy(desc(projectResources.addedAt))
    .limit(q.pageSize)
    .offset(offsetOf(q))
    .all();
  return { items, total };
}

export function getProjectResourceByPair(projectId: string, resourceId: string) {
  return (
    db
      .select()
      .from(projectResources)
      .where(
        and(
          eq(projectResources.projectId, projectId),
          eq(projectResources.resourceId, resourceId)
        )
      )
      .get() ?? null
  );
}

export function getProjectResource(id: string) {
  return db.select().from(projectResources).where(eq(projectResources.id, id)).get() ?? null;
}

export function insertProjectResource(row: typeof projectResources.$inferInsert) {
  return db.insert(projectResources).values(row).returning().get();
}

export function deleteProjectResource(id: string) {
  db.delete(projectResources).where(eq(projectResources.id, id)).run();
}

/** 项目下资源数量（真实扫描数据的派生计数） */
export function countProjectResources(projectId: string): number {
  return (
    db
      .select({ n: count() })
      .from(projectResources)
      .where(eq(projectResources.projectId, projectId))
      .get()?.n ?? 0
  );
}

/** 项目下资源按类型分布（Skill / Rule / MCP / Prompt / Plugin…，join discovered_resource 派生） */
export function projectResourceTypeDistribution(projectId: string): Array<{ type: string; count: number }> {
  return db
    .select({
      type: discoveredResources.type,
      count: count(),
    })
    .from(projectResources)
    .innerJoin(
      discoveredResources,
      eq(projectResources.resourceId, discoveredResources.id)
    )
    .where(eq(projectResources.projectId, projectId))
    .groupBy(discoveredResources.type)
    .all()
    .map((r) => ({ type: r.type, count: r.count }));
}

/** 项目下关联资源的完整实体（join 真实资源，用于详情展示） */
export function projectResourcesWithEntity(projectId: string) {
  return db
    .select({
      id: projectResources.id,
      projectId: projectResources.projectId,
      resourceId: projectResources.resourceId,
      addedAt: projectResources.addedAt,
      resource: discoveredResources,
    })
    .from(projectResources)
    .innerJoin(
      discoveredResources,
      eq(projectResources.resourceId, discoveredResources.id)
    )
    .where(eq(projectResources.projectId, projectId))
    .orderBy(desc(projectResources.addedAt))
    .all();
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
        // createdAt 保持首次创建时间：upsert 不改写（用于「本次新增」统计）
      },
    })
    .returning()
    .get();
}

/** 统计某时间点及之后首次入索引的资源数（created_at 非空且 >= iso；用于扫描变更提示） */
export function countResourcesCreatedAfter(iso: string) {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(discoveredResources)
      .where(gte(discoveredResources.createdAt, iso))
      .get()?.n ?? 0
  );
}

export function getLatestScanRun() {
  return db.select().from(scanRuns).orderBy(desc(scanRuns.startedAt)).limit(1).get() ?? null;
}

/** 删除不属于指定 scanId 的旧索引记录（本次扫描未覆盖 = 源已消失 / adapter 已排除） */
export function deleteDiscoveredResourcesNotInScan(scanId: string) {
  db.delete(discoveredResources).where(ne(discoveredResources.scanId, scanId)).run();
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
  /** S1.51：按 sourcePath 精确取回（置顶区块用；提供时忽略其余过滤与分页） */
  ids?: string[];
  /** 是否排除用户隐藏的资源（默认 true：列表展示过滤；统计口径用 false） */
  excludeHidden?: boolean;
  page: number;
  pageSize: number;
}

export function listDiscoveredResources(q: DiscoveredResourceQuery) {
  const conds = [];
  if (q.ids && q.ids.length > 0) {
    // S1.51：按 sourcePath 精确取回（置顶区块用；忽略分页/搜索，返回全部命中）
    const items = db
      .select()
      .from(discoveredResources)
      .where(
        and(
          inArray(discoveredResources.sourcePath, q.ids),
          notInArray(
            discoveredResources.sourcePath,
            db.select({ p: userHiddenResources.sourcePath }).from(userHiddenResources)
          )
        )
      )
      .orderBy(desc(discoveredResources.lastModified), asc(discoveredResources.name))
      .all();
    return { items, total: items.length };
  }
  if (q.search) {
    const s = `%${q.search}%`;
    conds.push(or(like(discoveredResources.name, s), like(discoveredResources.sourcePath, s)));
  }
  if (q.type) conds.push(eq(discoveredResources.type, q.type));
  if (q.harness) conds.push(eq(discoveredResources.harnessId, q.harness));
  if (q.parseable !== undefined) conds.push(eq(discoveredResources.parseable, q.parseable));
  if (q.excludeHidden !== false) {
    conds.push(
      notInArray(
        discoveredResources.sourcePath,
        db.select({ p: userHiddenResources.sourcePath }).from(userHiddenResources)
      )
    );
  }
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

/** S1.50：导出全量可见资源（排除用户隐藏；不受分页限制） */
export function listAllVisibleResources() {
  return db
    .select()
    .from(discoveredResources)
    .where(
      notInArray(
        discoveredResources.sourcePath,
        db.select({ p: userHiddenResources.sourcePath }).from(userHiddenResources)
      )
    )
    .orderBy(desc(discoveredResources.lastModified), asc(discoveredResources.name))
    .all();
}

/** S1.51：上一条 / 下一条（同列表排序：last_modified DESC, name ASC；排除隐藏；规模小，行内定位最稳） */
export function getAdjacentResources(id: string): { prev: { id: string; name: string } | null; next: { id: string; name: string } | null } {
  const hidden = db.select({ p: userHiddenResources.sourcePath }).from(userHiddenResources);
  const rows = db
    .select({ id: discoveredResources.id, name: discoveredResources.name, lastModified: discoveredResources.lastModified })
    .from(discoveredResources)
    .where(notInArray(discoveredResources.sourcePath, hidden))
    .all();
  rows.sort((a, b) => {
    if (a.lastModified === b.lastModified) return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    return (a.lastModified ?? "") > (b.lastModified ?? "") ? -1 : 1;
  });
  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return { prev: null, next: null };
  const prev = idx > 0 ? { id: rows[idx - 1].id, name: rows[idx - 1].name } : null;
  const next = idx < rows.length - 1 ? { id: rows[idx + 1].id, name: rows[idx + 1].name } : null;
  return { prev, next };
}

/* ---------------- 用户级资源隐藏（展示排除） ---------------- */

export function listHiddenSourcePaths(): Set<string> {
  const rows = db.select({ p: userHiddenResources.sourcePath }).from(userHiddenResources).all();
  return new Set(rows.map((r) => r.p));
}

export function addHiddenResource(sourcePath: string) {
  return db
    .insert(userHiddenResources)
    .values({ id: randomUUID(), sourcePath, hiddenAt: new Date().toISOString() })
    .onConflictDoNothing()
    .run();
}

export function removeHiddenResource(sourcePath: string) {
  return db
    .delete(userHiddenResources)
    .where(eq(userHiddenResources.sourcePath, sourcePath))
    .run();
}

/** 按隐藏记录 id 删除（Settings 恢复用：不依赖 discovered_resource 是否仍存在） */
export function removeHiddenResourceById(id: string) {
  return db.delete(userHiddenResources).where(eq(userHiddenResources.id, id)).run();
}

export function listHiddenResources() {
  return db
    .select({
      id: userHiddenResources.id,
      sourcePath: userHiddenResources.sourcePath,
      hiddenAt: userHiddenResources.hiddenAt,
    })
    .from(userHiddenResources)
    .orderBy(desc(userHiddenResources.hiddenAt))
    .all();
}

export function countDiscoveredResources() {
  return db.select({ n: count() }).from(discoveredResources).get()?.n ?? 0;
}

export function countHarnessScans() {
  return db.select({ n: count() }).from(harnessScans).get()?.n ?? 0;
}

export function listDistinctHarnessResources() {
  return db
    .select({ harnessId: discoveredResources.harnessId, n: count() })
    .from(discoveredResources)
    .groupBy(discoveredResources.harnessId)
    .all();
}

/* ---------------- 相关资源推荐（真实派生） ---------------- */

export interface RelatedResourceRow {
  id: string;
  name: string;
  type: string | null;
  harnessId: string | null;
  sourcePath: string;
  parseable: boolean;
  /** 与目标资源共享的能力标签数（>0 表示有实质相关） */
  sharedCapabilities: number;
  /** S1.33：相关资源的真实使用方式（metadata.usage，可空） */
  usage?: string | null;
}

/**
 * 查找与指定资源相关的资源：
 * 1. 优先：共享 ResourceCapability 能力标签（按共享数降序）；
 * 2. 补充：同 Harness + 同类型（可解析）资源。
 * 排除自身与用户隐藏资源；返回真实 discovered_resource 行，不复制任何分析数据。
 */
export function findRelatedResources(resourceId: string, limit = 8): RelatedResourceRow[] {
  const hiddenPaths = listHiddenSourcePaths();
  const other = alias(resourceCapabilities, "other");

  // 共享能力标签数（JOIN resource_capability.capability）
  const sharedRows = db
    .select({
      resourceId: other.resourceId,
      shared: count(),
    })
    .from(resourceCapabilities)
    .innerJoin(other, eq(other.capability, resourceCapabilities.capability))
    .where(
      and(eq(resourceCapabilities.resourceId, resourceId), ne(other.resourceId, resourceId))
    )
    .groupBy(other.resourceId)
    .orderBy(desc(count()))
    .limit(limit)
    .all();

  const sharedById = new Map(sharedRows.map((r) => [r.resourceId, r.shared]));
  const picked = sharedRows.map((r) => r.resourceId);
  const known = new Set<string>(picked);

  // 补充：同 Harness + 同类型（可解析、未被选中、未隐藏）
  const current = db
    .select({ harnessId: discoveredResources.harnessId, type: discoveredResources.type })
    .from(discoveredResources)
    .where(eq(discoveredResources.id, resourceId))
    .get();

  let extra: { id: string }[] = [];
  if (current?.harnessId) {
    extra = db
      .select({ id: discoveredResources.id })
      .from(discoveredResources)
      .where(
        and(
          eq(discoveredResources.harnessId, current.harnessId),
          eq(discoveredResources.type, current.type ?? ""),
          eq(discoveredResources.parseable, true),
          notInArray(discoveredResources.id, [...known])
        )
      )
      .orderBy(asc(discoveredResources.name))
      .limit(Math.max(0, limit - picked.length))
      .all();
  }

  const ids = [...picked, ...extra.map((e) => e.id)];
  if (ids.length === 0) return [];

  const info = db
    .select({
      id: discoveredResources.id,
      name: discoveredResources.name,
      type: discoveredResources.type,
      harnessId: discoveredResources.harnessId,
      sourcePath: discoveredResources.sourcePath,
      parseable: discoveredResources.parseable,
      metadata: discoveredResources.metadata,
      description: discoveredResources.description,
    })
    .from(discoveredResources)
    .where(inArray(discoveredResources.id, ids))
    .all();

  const byId = new Map(info.map((r) => [r.id, r]));
  const result: RelatedResourceRow[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || hiddenPaths.has(row.sourcePath)) continue;
    const rawUsage =
      row.metadata && typeof row.metadata === "object" && "usage" in row.metadata
        ? String((row.metadata as { usage?: unknown }).usage ?? "")
        : "";
    // 与资源详情页「如何使用」同口径：usage 为空时回退 description
    const usage = (rawUsage.trim() || row.description.trim());
    result.push({
      ...row,
      sharedCapabilities: sharedById.get(id) ?? 0,
      usage: usage ? usage : null,
    });
  }
  // 稳定排序：共享数降序在前，其次按名称
  result.sort((a, b) => b.sharedCapabilities - a.sharedCapabilities || a.name.localeCompare(b.name));
  return result.slice(0, limit);
}

/* ---------------- Resource Intelligence（Phase 2） ----------------
 * 分析记录（历史保留）与能力标签 CRUD。
 * 唯一键：resourceId + inputFingerprint + analyzerVersion —— 同一输入同版本不重复生成。
 */

/** upsert 分析记录（同键更新：重试 / 状态迁移；createdAt 保留创建时间） */
export function upsertResourceAnalysis(row: typeof resourceAnalyses.$inferInsert) {
  return db
    .insert(resourceAnalyses)
    .values(row)
    .onConflictDoUpdate({
      target: [resourceAnalyses.resourceId, resourceAnalyses.inputFingerprint, resourceAnalyses.analyzerVersion],
      set: {
        status: row.status,
        strategy: row.strategy,
        analyzedAt: row.analyzedAt,
        resourceMtime: row.resourceMtime,
        isCurrent: row.isCurrent,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        summary: row.summary,
      },
    })
    .returning()
    .get();
}

/** 按资源查分析记录（新 → 旧） */
export function listAnalysesByResource(resourceId: string) {
  return db
    .select()
    .from(resourceAnalyses)
    .where(eq(resourceAnalyses.resourceId, resourceId))
    .orderBy(desc(resourceAnalyses.createdAt))
    .all();
}

/** 当前有效分析（isCurrent=true） */
export function getCurrentAnalysis(resourceId: string) {
  return (
    db
      .select()
      .from(resourceAnalyses)
      .where(and(eq(resourceAnalyses.resourceId, resourceId), eq(resourceAnalyses.isCurrent, true)))
      .get() ?? null
  );
}

/** 将资源除 keepId 外的所有分析记录置为非当前 */
export function markOtherAnalysesNotCurrent(resourceId: string, keepId: string) {
  db.update(resourceAnalyses)
    .set({ isCurrent: false })
    .where(and(eq(resourceAnalyses.resourceId, resourceId), ne(resourceAnalyses.id, keepId)))
    .run();
}

/** 查询同键记录（判断是否已分析过该输入） */
export function getAnalysisByFingerprint(resourceId: string, fingerprint: string, version: string) {
  return (
    db
      .select()
      .from(resourceAnalyses)
      .where(
        and(
          eq(resourceAnalyses.resourceId, resourceId),
          eq(resourceAnalyses.inputFingerprint, fingerprint),
          eq(resourceAnalyses.analyzerVersion, version)
        )
      )
      .get() ?? null
  );
}

/** 删除某次分析的全部能力标签（重分析时替换） */
export function deleteCapabilitiesByAnalysis(analysisId: string) {
  db.delete(resourceCapabilities).where(eq(resourceCapabilities.analysisId, analysisId)).run();
}

/** 插入一条能力标签 */
export function insertResourceCapability(row: typeof resourceCapabilities.$inferInsert) {
  return db.insert(resourceCapabilities).values(row).run();
}

/** 某资源的当前能力标签（join 当前分析） */
export function listCurrentCapabilitiesByResource(resourceId: string) {
  return db
    .select({ cap: resourceCapabilities })
    .from(resourceCapabilities)
    .innerJoin(resourceAnalyses, eq(resourceCapabilities.analysisId, resourceAnalyses.id))
    .where(and(eq(resourceCapabilities.resourceId, resourceId), eq(resourceAnalyses.isCurrent, true)))
    .all()
    .map((r) => r.cap);
}

/** 全量当前能力标签（能力索引 / 任务匹配用；MVP 规模可接受） */
export function listAllCurrentCapabilities() {
  return db
    .select({ cap: resourceCapabilities, resource: discoveredResources })
    .from(resourceCapabilities)
    .innerJoin(resourceAnalyses, eq(resourceCapabilities.analysisId, resourceAnalyses.id))
    .innerJoin(discoveredResources, eq(resourceCapabilities.resourceId, discoveredResources.id))
    .where(eq(resourceAnalyses.isCurrent, true))
    .all();
}

/** 分析状态统计（当前有效记录按状态分组） */
export function countAnalysisStatus() {
  const rows = db
    .select({ status: resourceAnalyses.status, n: count() })
    .from(resourceAnalyses)
    .where(eq(resourceAnalyses.isCurrent, true))
    .groupBy(resourceAnalyses.status)
    .all();
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/** 当前有效分析总数 / 能力标签总数 */
export function countAnalysisMeta() {
  const analyses = db
    .select({ n: count() })
    .from(resourceAnalyses)
    .where(eq(resourceAnalyses.isCurrent, true))
    .get()?.n ?? 0;
  const caps = db
    .select({ n: count() })
    .from(resourceCapabilities)
    .innerJoin(resourceAnalyses, eq(resourceCapabilities.analysisId, resourceAnalyses.id))
    .where(eq(resourceAnalyses.isCurrent, true))
    .get()?.n ?? 0;
  return { analyses, caps };
}

/** 最近一次分析完成时间 */
export function getLastAnalysisAt() {
  return (
    db
      .select({ at: resourceAnalyses.analyzedAt })
      .from(resourceAnalyses)
      .orderBy(desc(resourceAnalyses.analyzedAt))
      .limit(1)
      .get()?.at ?? null
  );
}

/** 全部资源（增量分析遍历用；避免 pageSize=1000 反模式） */
export function listAllDiscoveredResources() {
  return db.select().from(discoveredResources).all();
}

/* ---------------- Task Intelligence ---------------- */

/** 按 (task, fingerprint, version) 查同键记录（幂等判定） */
export function getTaskAnalysisByFingerprint(
  task: string,
  fingerprint: string,
  version: string
) {
  return (
    db
      .select()
      .from(taskAnalyses)
      .where(
        and(
          eq(taskAnalyses.task, task),
          eq(taskAnalyses.inputFingerprint, fingerprint),
          eq(taskAnalyses.analyzerVersion, version)
        )
      )
      .get() ?? null
  );
}

/** 写入/更新任务分析（同键记录更新，保留历史语义由 isCurrent 管理） */
export function upsertTaskAnalysis(row: typeof taskAnalyses.$inferInsert) {
  return db
    .insert(taskAnalyses)
    .values(row)
    .onConflictDoUpdate({
      target: [taskAnalyses.task, taskAnalyses.inputFingerprint, taskAnalyses.analyzerVersion],
      set: {
        status: row.status,
        taskType: row.taskType,
        analyzedAt: row.analyzedAt,
        isCurrent: row.isCurrent,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
        summary: row.summary,
      },
    })
    .returning()
    .get();
}

/** 将同任务除 keepId 外的分析记录置为非当前 */
export function markOtherTaskAnalysesNotCurrent(task: string, keepId: string) {
  db.update(taskAnalyses)
    .set({ isCurrent: false })
    .where(and(eq(taskAnalyses.task, task), ne(taskAnalyses.id, keepId)))
    .run();
}

/** 更新分析记录的 LLM 增强结果（strategy / taskType / summary，不重建需求与推荐） */
export function patchTaskAnalysisLlm(
  id: string,
  patch: {
    strategy: "heuristic" | "llm-assisted";
    taskType: string;
    summary: string;
    analyzedAt: string;
  }
) {
  db.update(taskAnalyses)
    .set({
      strategy: patch.strategy,
      taskType: patch.taskType,
      summary: patch.summary,
      analyzedAt: patch.analyzedAt,
    })
    .where(eq(taskAnalyses.id, id))
    .run();
}

/** 删除某次分析的全部需求（重分析时替换） */
export function deleteTaskRequirementsByAnalysis(analysisId: string) {
  db.delete(taskRequirements)
    .where(eq(taskRequirements.taskAnalysisId, analysisId))
    .run();
}

/** 插入一条能力需求（推断产物） */
export function insertTaskRequirement(row: typeof taskRequirements.$inferInsert) {
  return db.insert(taskRequirements).values(row).run();
}

/** 删除某次分析的全部推荐（重分析时替换） */
export function deleteTaskRecommendationsByAnalysis(analysisId: string) {
  db.delete(resourceRecommendations)
    .where(eq(resourceRecommendations.taskAnalysisId, analysisId))
    .run();
}

/** 插入一条资源推荐（只引用 resource_capability.id，追溯快照为真实来源字段） */
export function insertTaskRecommendation(row: typeof resourceRecommendations.$inferInsert) {
  return db.insert(resourceRecommendations).values(row).run();
}

/** 查任务分析记录 */
export function getTaskAnalysisById(id: string) {
  return db.select().from(taskAnalyses).where(eq(taskAnalyses.id, id)).get() ?? null;
}

/** 查询任务分析完整结果（analysis + requirements + 推荐 join 能力与资源） */
export function getTaskAnalysisResult(id: string) {
  const analysis = getTaskAnalysisById(id);
  if (!analysis) return null;
  const requirements = db
    .select()
    .from(taskRequirements)
    .where(eq(taskRequirements.taskAnalysisId, id))
    .orderBy(asc(taskRequirements.sortOrder))
    .all();
  const recommendations = db
    .select({
      reco: resourceRecommendations,
      cap: resourceCapabilities,
      resource: discoveredResources,
      requirement: taskRequirements,
    })
    .from(resourceRecommendations)
    .innerJoin(
      resourceCapabilities,
      eq(resourceRecommendations.resourceCapabilityId, resourceCapabilities.id)
    )
    .innerJoin(discoveredResources, eq(resourceRecommendations.resourceId, discoveredResources.id))
    .innerJoin(
      taskRequirements,
      eq(resourceRecommendations.taskRequirementId, taskRequirements.id)
    )
    .where(eq(resourceRecommendations.taskAnalysisId, id))
    .orderBy(asc(resourceRecommendations.rank))
    .all();
  return { analysis, requirements, recommendations };
}

/** 任务分析历史列表（新 → 旧） */
export function listTaskAnalyses(limit = 20) {
  return db
    .select()
    .from(taskAnalyses)
    .orderBy(desc(taskAnalyses.createdAt))
    .limit(limit)
    .all();
}

/** S1.51：删除单条任务分析历史（连带其需求/推荐/计划）；返回是否删除成功 */
export function deleteTaskAnalysisById(id: string): boolean {
  const analysis = getTaskAnalysisById(id);
  if (!analysis) return false;
  db.delete(taskRequirements).where(eq(taskRequirements.taskAnalysisId, id)).run();
  db.delete(resourceRecommendations).where(eq(resourceRecommendations.taskAnalysisId, id)).run();
  db.delete(taskPlans).where(eq(taskPlans.taskAnalysisId, id)).run();
  db.delete(taskAnalyses).where(eq(taskAnalyses.id, id)).run();
  return true;
}

/* ---------------- Task Planning（Phase 4） ---------------- */

/** 查某分析的计划（幂等判定：一分析一当前计划） */
export function getPlanByAnalysis(analysisId: string) {
  return (
    db
      .select()
      .from(taskPlans)
      .where(eq(taskPlans.taskAnalysisId, analysisId))
      .get() ?? null
  );
}

/** 查计划记录 */
export function getPlanById(id: string) {
  return db.select().from(taskPlans).where(eq(taskPlans.id, id)).get() ?? null;
}

/** 写入计划（唯一键 analysisId：重算走 upsert，历史保留由旧 plan 行语义保证） */
export function upsertTaskPlan(row: typeof taskPlans.$inferInsert) {
  return db
    .insert(taskPlans)
    .values(row)
    .onConflictDoUpdate({
      target: taskPlans.taskAnalysisId,
      set: {
        status: row.status,
        plannerStrategy: row.plannerStrategy,
        plannerVersion: row.plannerVersion,
        createdAt: row.createdAt,
        validation: row.validation,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage,
      },
    })
    .returning()
    .get();
}

/** 删除某计划全部步骤（重算时替换） */
export function deletePlanStepsByPlan(planId: string) {
  db.delete(planSteps).where(eq(planSteps.planId, planId)).run();
}

/** 插入一条计划步骤 */
export function insertPlanStep(row: typeof planSteps.$inferInsert) {
  return db.insert(planSteps).values(row).run();
}

/** 删除某计划全部依赖（重算时替换） */
export function deletePlanDependenciesByPlan(planId: string) {
  db.delete(planDependencies).where(eq(planDependencies.planId, planId)).run();
}

/** 插入一条计划依赖 */
export function insertPlanDependency(row: typeof planDependencies.$inferInsert) {
  return db.insert(planDependencies).values(row).run();
}

/** 依赖查询用的 plan_step 别名（join 取 from/to 的 stepIndex） */
const fromSteps = alias(planSteps, "from_step");
const toSteps = alias(planSteps, "to_step");

/** 查询计划完整结果（plan + steps（join 主选能力/资源，unmet 时为 null）+ dependencies） */
export function getPlanResult(id: string) {
  const plan = getPlanById(id);
  if (!plan) return null;
  const steps = db
    .select({
      step: planSteps,
      cap: resourceCapabilities,
      resource: discoveredResources,
    })
    .from(planSteps)
    .leftJoin(resourceCapabilities, eq(planSteps.primaryCapabilityId, resourceCapabilities.id))
    .leftJoin(discoveredResources, eq(planSteps.primaryResourceId, discoveredResources.id))
    .where(eq(planSteps.planId, id))
    .orderBy(asc(planSteps.sortOrder))
    .all();
  const dependencies = db
    .select({
      dep: planDependencies,
      fromIdx: fromSteps.stepIndex,
      toIdx: toSteps.stepIndex,
    })
    .from(planDependencies)
    .innerJoin(fromSteps, eq(planDependencies.fromStepId, fromSteps.id))
    .innerJoin(toSteps, eq(planDependencies.toStepId, toSteps.id))
    .where(eq(planDependencies.planId, id))
    .orderBy(asc(planDependencies.type))
    .all();
  return { plan, steps, dependencies };
}

/* ---------------- LLM Provider 配置（S1.20） ---------------- */

/** 单行配置（id 固定 "default"） */
export function getLLMProviderConfigRow() {
  return db.select().from(llmProviderConfigs).where(eq(llmProviderConfigs.id, "default")).get();
}

export interface SaveLLMProviderInput {
  baseUrl?: string | null;
  model?: string | null;
  apiKey?: string | null;
}

/** 保存手动配置（null / 空字符串表示该字段不修改；全部为空则仅更新时间戳） */
export function upsertLLMProviderConfig(input: SaveLLMProviderInput) {
  const existing = getLLMProviderConfigRow();
  const now = new Date().toISOString();
  const patch: SaveLLMProviderInput = {};
  if (input.baseUrl !== undefined) patch.baseUrl = input.baseUrl?.trim() || null;
  if (input.model !== undefined) patch.model = input.model?.trim() || null;
  if (input.apiKey !== undefined) patch.apiKey = input.apiKey?.trim() || null;

  if (!existing) {
    db.insert(llmProviderConfigs)
      .values({
        id: "default",
        baseUrl: patch.baseUrl ?? null,
        model: patch.model ?? null,
        apiKey: patch.apiKey ?? null,
        updatedAt: now,
      })
      .run();
    return;
  }

  const set: Record<string, unknown> = { updatedAt: now };
  if (input.baseUrl !== undefined) set.baseUrl = patch.baseUrl ?? null;
  if (input.model !== undefined) set.model = patch.model ?? null;
  if (input.apiKey !== undefined) set.apiKey = patch.apiKey ?? null;
  db.update(llmProviderConfigs).set(set).where(eq(llmProviderConfigs.id, "default")).run();
}

/** 清除手动配置（恢复自动发现） */
export function clearLLMProviderConfig() {
  db.delete(llmProviderConfigs).where(eq(llmProviderConfigs.id, "default")).run();
}

/* ---------------- LLM Provider 端点（S1.53：多端点 + 加密存储） ---------------- */

export interface LlmProviderEndpointRow {
  id: string;
  name: string;
  baseUrl: string;
  model: string | null;
  apiKeyEnc: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 全部端点（按创建时间升序，默认端点优先展示由 Service 处理） */
export function listProviderEndpoints(): LlmProviderEndpointRow[] {
  return db
    .select()
    .from(llmProviderEndpoints)
    .orderBy(asc(llmProviderEndpoints.createdAt))
    .all();
}

export function getProviderEndpointRow(id: string) {
  return db
    .select()
    .from(llmProviderEndpoints)
    .where(eq(llmProviderEndpoints.id, id))
    .get();
}

/** 默认端点；无默认标记时回退第一条（按创建时间） */
export function getDefaultProviderEndpointRow() {
  const def = db
    .select()
    .from(llmProviderEndpoints)
    .where(eq(llmProviderEndpoints.isDefault, true))
    .get();
  if (def) return def;
  return db.select().from(llmProviderEndpoints).orderBy(asc(llmProviderEndpoints.createdAt)).get();
}

export interface InsertProviderEndpointInput {
  id: string;
  name: string;
  baseUrl: string;
  model?: string | null;
  apiKeyEnc?: string | null;
  isDefault: boolean;
}

export function insertProviderEndpoint(input: InsertProviderEndpointInput) {
  const now = new Date().toISOString();
  db.insert(llmProviderEndpoints)
    .values({
      id: input.id,
      name: input.name,
      baseUrl: input.baseUrl,
      model: input.model ?? null,
      apiKeyEnc: input.apiKeyEnc ?? null,
      isDefault: input.isDefault,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export interface UpdateProviderEndpointInput {
  name?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  apiKeyEnc?: string | null; // undefined=不改；null=清空
  isDefault?: boolean;
}

export function updateProviderEndpoint(id: string, input: UpdateProviderEndpointInput) {
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (input.name !== undefined) set.name = input.name?.trim() || null;
  if (input.baseUrl !== undefined) set.baseUrl = input.baseUrl?.trim() || null;
  if (input.model !== undefined) set.model = input.model?.trim() || null;
  if (input.apiKeyEnc !== undefined) set.apiKeyEnc = input.apiKeyEnc;
  if (input.isDefault !== undefined) set.isDefault = input.isDefault;
  db.update(llmProviderEndpoints).set(set).where(eq(llmProviderEndpoints.id, id)).run();
}

export function deleteProviderEndpoint(id: string) {
  db.delete(llmProviderEndpoints).where(eq(llmProviderEndpoints.id, id)).run();
}

/** 将某端点设为默认：先清所有默认标记，再置该端点为默认 */
export function setDefaultProviderEndpoint(id: string) {
  db.update(llmProviderEndpoints)
    .set({ isDefault: false, updatedAt: new Date().toISOString() })
    .where(eq(llmProviderEndpoints.isDefault, true))
    .run();
  db.update(llmProviderEndpoints)
    .set({ isDefault: true, updatedAt: new Date().toISOString() })
    .where(eq(llmProviderEndpoints.id, id))
    .run();
}

export function countProviderEndpoints(): number {
  return db.select({ n: count() }).from(llmProviderEndpoints).get()?.n ?? 0;
}

/**
 * 惰性迁移：旧单行 llm_provider_config（明文）→ 首条端点（加密）。
 * 仅当新表为空且旧表存在有效配置时执行一次；幂等（之后新表非空即跳过）。
 */
export function migrateLegacyProviderConfig(encrypt: (plain: string) => string | null): boolean {
  if (countProviderEndpoints() > 0) return false;
  const legacy = getLLMProviderConfigRow();
  if (!legacy) return false;
  const hasManual = Boolean(legacy.baseUrl || legacy.model || legacy.apiKey);
  if (!hasManual) return false;
  insertProviderEndpoint({
    id: randomUUID(),
    name: legacy.baseUrl || legacy.model ? "旧配置迁移" : "手动配置",
    baseUrl: legacy.baseUrl || "https://api.openai.com/v1",
    model: legacy.model,
    apiKeyEnc: legacy.apiKey ? encrypt(legacy.apiKey) : null,
    isDefault: true,
  });
  return true;
}

/* ---------------- 用户资料（S1.45） ---------------- */

/** 单行用户资料（id 固定 "default"） */
export function getUserProfileRow() {
  return db.select().from(userProfiles).where(eq(userProfiles.id, "default")).get();
}

export interface SaveUserProfileInput {
  displayName?: string | null;
  title?: string | null;
  bio?: string | null;
  avatarColor?: string | null;
  avatarPath?: string | null;
}

/** 保存用户自定义展示信息（未传字段不修改；传 null / 空串表示清空） */
export function upsertUserProfile(input: SaveUserProfileInput) {
  const existing = getUserProfileRow();
  const now = new Date().toISOString();
  const patch: SaveUserProfileInput = {};
  if (input.displayName !== undefined) patch.displayName = input.displayName?.trim() || null;
  if (input.title !== undefined) patch.title = input.title?.trim() || null;
  if (input.bio !== undefined) patch.bio = input.bio?.trim() || null;
  if (input.avatarColor !== undefined) patch.avatarColor = input.avatarColor?.trim() || null;
  if (input.avatarPath !== undefined) patch.avatarPath = input.avatarPath?.trim() || null;

  if (!existing) {
    db.insert(userProfiles)
      .values({
        id: "default",
        displayName: patch.displayName ?? null,
        title: patch.title ?? null,
        bio: patch.bio ?? null,
        avatarColor: patch.avatarColor ?? null,
        avatarPath: patch.avatarPath ?? null,
        updatedAt: now,
      })
      .run();
    return;
  }

  const set: Record<string, unknown> = { updatedAt: now };
  if (input.displayName !== undefined) set.displayName = patch.displayName ?? null;
  if (input.title !== undefined) set.title = patch.title ?? null;
  if (input.bio !== undefined) set.bio = patch.bio ?? null;
  if (input.avatarColor !== undefined) set.avatarColor = patch.avatarColor ?? null;
  if (input.avatarPath !== undefined) set.avatarPath = patch.avatarPath ?? null;
  db.update(userProfiles).set(set).where(eq(userProfiles.id, "default")).run();
}
