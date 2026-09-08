# P4-1 Backend Architecture & API Design — AI Workspace

> 阶段：Phase 4 第一子阶段（纯设计，**未创建数据库 / 未改业务代码 / 未建 Route Handler / 未引入 ORM**）
> 日期：2026-09-08 · 状态：待审批（审批后进入 P4-2）
> 前置：V1 Architecture Review（P0=0，P1=5 项）——本设计在契约层面一次性解决 P1 五项（分页/错误模型/DTO/服务端 ID/seed-migration 流程），P2 的 periodStats 重复逻辑顺带在 P4-2 收敛（不单独开阶段）。

---

## 1. 目标分层架构

```
┌──────────────────────────────────────────────────────────────┐
│ UI（Next.js App Router / Client Components）                   │
│  —— 只读 store + selectors；不知道 DB、不知道 API 细节          │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ Zustand Store（客户端状态层：领域数据缓存 + UI 状态 + 派生）     │
│  —— persist 收窄为仅 UI 偏好（timeRange 等）；领域数据由 API 拉取 │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ API Client（lib/api/client.ts + dto.ts + mappers.ts）          │
│  —— fetch + JSON + ApiError 统一解析；DTO → Domain 映射          │
└──────────────────────────┬───────────────────────────────────┘
                           ▼  REST /api/v1/*
┌──────────────────────────────────────────────────────────────┐
│ Route Handlers（Next.js route.ts）                             │
│  —— zod 校验（query/body）→ Service；错误映射为 ApiError         │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ Service（业务规则：装配校验 / 窗口聚合 / 幂等 / 生命周期）         │
│  —— 不写 SQL，只编排 Repository                                │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ Repository（Drizzle ORM，snake_case ↔ camelCase Domain）        │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ SQLite（better-sqlite3 / node:sqlite）                         │
└──────────────────────────────────────────────────────────────┘
```

**不变式**：UI 不知道数据库实现；Store 不知道 API 细节（只依赖 Service 签名）；DTO ≠ Domain。

## 2. DTO 与 Domain 分离

- **Domain**（领域模型）：沿用 `lib/types.ts`（Agent / AgentRun / CapabilityDefinition / AgentCapability / Project / ProjectAgent / TimeRange），前端 Store 与组件只消费 Domain。
- **DTO**（传输层）：新增 `lib/api/types.ts`，字段名与 Domain 一致（P4 阶段无拆分必要），但**独立定义、独立演进**——后端响应结构变化只影响 mappers，不影响 Store/UI。
- **Mappers**：`lib/api/mappers.ts` 负责 DTO → Domain（未来 Domain → DTO 用于提交），纯函数 + 防御性字段裁剪。
- **约定**：API Client 永不直接把 DTO 塞进 Store；Store 永不依赖 DTO 字段名。

## 3. 统一错误模型（ApiError Contract）

```ts
type ApiErrorCode =
  | "VALIDATION_ERROR"   // 400 参数/请求体非法（含字段级）
  | "NOT_FOUND"          // 404 资源不存在
  | "CONFLICT"           // 409 状态冲突（装配已存在 / 归档装配 / 重复创建）
  | "UNAUTHORIZED"       // 401（预留，V1 无鉴权）
  | "FORBIDDEN"          // 403（预留，V1 无权限系统）
  | "INTERNAL_ERROR"     // 500 未预期错误
  | "RATE_LIMITED"       // 429（预留）

interface FieldError { field: string; message: string; }

interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;              // 人类可读，可直出 toast
    details?: FieldError[];       // 仅 VALIDATION_ERROR 时携带
    requestId?: string;           // 追踪（预留）
  };
}

// 前端统一异常类型
class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: FieldError[];
  constructor(status: number, body: ApiErrorBody["error"]);
}
```

**规则**：前端只按 `code` 分支（不解析 response 文本）；非 2xx 一律进 ApiError；toast 显示 `message`，校验类显示 `details`。

## 4. Pagination Contract

统一信封 `Page<T>`：

```ts
interface Page<T> {
  items: T[];
  page: number;        // 1-based
  pageSize: number;
  total: number;
  totalPages: number;
}

// 查询参数
// ?page=1            （默认 1）
// ?pageSize=20       （默认 20，上限 100）
```

- 实现：SQL `LIMIT ? OFFSET ?` + `COUNT(*)`。
- 演进：SQLite 数据量增长后可加 `?cursor=`（keyset）——契约字段预留 `cursor?: string | null`，P4 不实现（文档标注）。
- 适用：`/agents`、`/runs`、`/agents/:id/runs`、`/capability-definitions`、`/agent-capabilities`、`/projects`、`/project-agents`。

## 5. Filtering / Sorting / Search Contract

| 机制 | 语法 | 说明 |
| --- | --- | --- |
| 等值过滤 | `?type=skill&lifecycle=active` | 白名单字段 |
| 搜索 | `?search=关键词` | 名称/描述 LIKE（转义 %/_） |
| 排序 | `?sort=createdAt:desc,startedAt:asc` | **白名单字段**，防注入；未知字段 → VALIDATION_ERROR |
| 状态过滤 | `?status=success` 等 | 各资源枚举 |

## 6. 时间窗口（含今天 N 个自然日，契约化）

**规则不变**：窗口 = `[今天 0 点 −(N−1) 天, 明天 0 点)`（含今天在内的 N 个自然日）——与前端 `selectRunsInRange` 完全一致。

**时区契约**：时区由**客户端声明**（服务端默认 UTC）：
- 方式 A（推荐）：客户端计算边界并传 `from` / `to`（ISO 8601，**含端点 `[from, to)`**）——前端仍是唯一窗口规则实现，服务端纯执行，零时区漂移。
- 方式 B（快捷）：`?window=today|7d|30d&tzOffset=-480`（分钟）——服务端按 tzOffset 计算边界，语义与 A 相同。

**响应**：统计端点返回 `{ window: { from, to, days }, ... }` 回显实际边界，便于前端展示「含今天 30 个自然日」并复核。

## 7. API Contract 全量定义

> Base：`/api/v1`。成功：2xx；失败：见 §3。所有写操作返回**服务端实体**（含服务端生成的 id）。

### 7.1 Agents

| Method & Path | Request DTO | Response DTO | 说明 |
| --- | --- | --- | --- |
| GET `/agents` | `?search&status&sort&page&pageSize` | `Page<AgentDTO>` | 列表 |
| GET `/agents/:id` | — | `AgentDTO` | 详情 |
| POST `/agents` | `CreateAgentDTO{name,description?,model,systemPrompt?}` | `201 AgentDTO` | 创建；id 服务端生成 |
| PATCH `/agents/:id` | `UpdateAgentDTO{name?,description?,systemPrompt?,model?}` | `AgentDTO` | 预留（V1 前端未用编辑） |
| POST `/agents/:id/runs` | `RunTriggerDTO{}` | `202 RunDTO` | 触发运行（真实 AI 为异步，202 + 轮询；V1 桩为同步返回） |
| GET `/agents/:id/runs` | `?from&to&status&sort&page&pageSize` | `Page<RunDTO>` | Agent 运行历史 |

### 7.2 Agent Runs

| Method & Path | Request DTO | Response DTO | 说明 |
| --- | --- | --- | --- |
| GET `/runs` | `?from&to&window&tzOffset&agents=a1,a2&project=prj&status&page&pageSize` | `Page<RunDTO>` | 全局/多维过滤运行明细 |
| GET `/runs/stats` | `?window&tzOffset 或 from&to&groupBy=day&agents=&project=` | `RunsStatsDTO` | **服务端聚合**（趋势/指标/项目统计同源） |

`RunsStatsDTO`：
```ts
interface RunsStatsDTO {
  window: { from: string; to: string; days: number };
  totals: { runs: number; succeeded: number; failed: number; successRate: number; tokens: number };
  daily: Array<{ date: string; runs: number; succeeded: number; failed: number; successRate: number }>;
  byAgent?: Array<{ agentId: string; runs: number; successRate: number; tokens: number }>; // ?groupBy=agent
}
```
> 说明：`?project=prj` 时服务端经 project_agent join 过滤 —— **「项目统计=派生」的领域规则在服务端成立，前端不做 join**。P4-2 可先以全量/内存统计过渡，stats 端点为正式演进目标。

### 7.3 Capabilities（CapabilityDefinition）

| Method & Path | Request DTO | Response DTO | 说明 |
| --- | --- | --- | --- |
| GET `/capability-definitions` | `?type&lifecycle&search&sort&page&pageSize` | `Page<CapabilityDefinitionDTO>` | 资产列表 |
| GET `/capability-definitions/:id` | — | `CapabilityDefinitionDTO` | 详情 |
| POST `/capability-definitions` | `CreateCapabilityDTO{type,name,description?}` | `201 CapabilityDefinitionDTO`（lifecycle=active） | 创建 |
| PATCH `/capability-definitions/:id` | `UpdateCapabilityDTO{name?,description?,type?}` | `CapabilityDefinitionDTO` | 仅元信息 |
| PATCH `/capability-definitions/:id/lifecycle` | `{ lifecycle: "archived" \| "active" }` | `CapabilityDefinitionDTO` | **归档/恢复统一走此端点**（软删除；服务端规则：归档不影响已有装配） |

### 7.4 AgentCapabilities（装配关系）

| Method & Path | Request DTO | Response DTO | 说明 |
| --- | --- | --- | --- |
| GET `/agent-capabilities` | `?agentId&capabilityId&page&pageSize` | `Page<AgentCapabilityDTO>` | 关系列表（小表，全量兼容） |
| POST `/agent-capabilities` | `{ agentId, capabilityId }` | `201 AgentCapabilityDTO` | 装配；**服务端校验：定义存在 + lifecycle≠archived**；`UNIQUE(agent_id,capability_id)` 冲突 → 409 |
| PATCH `/agent-capabilities/:id` | `{ enabled: boolean }` | `AgentCapabilityDTO` | 启停 |
| DELETE `/agent-capabilities/:id` | — | `204` | 解绑（幂等） |

### 7.5 Projects

| Method & Path | Request DTO | Response DTO | 说明 |
| --- | --- | --- | --- |
| GET `/projects` | `?status&search&sort&page&pageSize` | `Page<ProjectDTO>` | 列表 |
| GET `/projects/:id` | — | `ProjectDTO` | 详情 |
| POST `/projects` | `CreateProjectDTO{name,description?}` | `201 ProjectDTO`（status=active） | 创建 |
| PATCH `/projects/:id` | `UpdateProjectDTO{name?,description?}` | `ProjectDTO` | **预留**（V1 前端未用编辑） |
| PATCH `/projects/:id/status` | `{ status: "archived" \| "active" }` | `ProjectDTO` | **预留**（V1 前端未用归档） |

### 7.6 ProjectAgents（关系）

| Method & Path | Request DTO | Response DTO | 说明 |
| --- | --- | --- | --- |
| GET `/project-agents` | `?projectId&agentId&page&pageSize` | `Page<ProjectAgentDTO>` | 关系列表 |
| POST `/project-agents` | `{ projectId, agentId }` | `201 ProjectAgentDTO` | 关联；`UNIQUE(project_id,agent_id)` 冲突 → 409（幂等可前端吞） |
| DELETE `/project-agents/:id` | — | `204` | 解绑（幂等） |

### 7.7 ID 生成策略

- **服务端生成，UUID v4**（`crypto.randomUUID()`，Node 内置）；SQLite TEXT 主键。
- 前端**不再生成任何业务 id**；创建类端点返回实体（现有「写操作返回确认实体」契约天然兼容）。
- 现状 `uid("prefix")` 格式：P4-2 启用后端时重置演示数据，无迁移负担（文档见 §10）。

## 8. Database Schema（SQLite）

```sql
-- 命名：snake_case；时间统一 TEXT ISO8601 UTC（展示由前端本地化）

CREATE TABLE agent (
  id            TEXT PRIMARY KEY,                     -- uuid v4（服务端生成）
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idle'
                CHECK (status IN ('idle','running','paused','error')),
  system_prompt TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  last_run_at   TEXT                                  -- 可空
);
CREATE INDEX idx_agent_status ON agent(status);

CREATE TABLE capability_definition (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('skill','memory','rule','tool')),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lifecycle   TEXT NOT NULL DEFAULT 'active'
              CHECK (lifecycle IN ('active','archived')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_capability_type ON capability_definition(type);

CREATE TABLE agent_capability (                       -- 关系表：不复制实体数据
  id            TEXT PRIMARY KEY,
  agent_id      TEXT NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  capability_id TEXT NOT NULL REFERENCES capability_definition(id) ON DELETE RESTRICT,
  enabled       INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  created_at    TEXT NOT NULL,
  UNIQUE (agent_id, capability_id)                   -- 幂等/防重复装配
);
CREATE INDEX idx_agent_capability_agent ON agent_capability(agent_id);
CREATE INDEX idx_agent_capability_capability ON agent_capability(capability_id);

CREATE TABLE project (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','archived')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE project_agent (                          -- 关系表：只引用 id
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  agent_id   TEXT NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
  added_at   TEXT NOT NULL,
  UNIQUE (project_id, agent_id)
);
CREATE INDEX idx_project_agent_project ON project_agent(project_id);
CREATE INDEX idx_project_agent_agent ON project_agent(agent_id);

CREATE TABLE agent_run (
  id           TEXT PRIMARY KEY,
  agent_id     TEXT NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('success','failed','running')),
  summary      TEXT NOT NULL DEFAULT '',
  duration_ms  INTEGER,
  tokens_used  INTEGER NOT NULL DEFAULT 0,
  messages     INTEGER NOT NULL DEFAULT 0,
  started_at   TEXT NOT NULL,
  finished_at  TEXT
);
CREATE INDEX idx_agent_run_agent_started ON agent_run(agent_id, started_at DESC);  -- Agent 历史
CREATE INDEX idx_agent_run_started ON agent_run(started_at DESC);                  -- 全局窗口/统计
```

**约束语义**：
| 关系 | FK | 删除语义 | 理由 |
| --- | --- | --- | --- |
| agent_run.agent_id → agent | CASCADE | Agent 删除连删运行 | 无孤儿数据；V1 前端无删除 Agent，安全 |
| agent_capability.agent_id → agent | CASCADE | 同上 | 装配随 Agent 删除 |
| agent_capability.capability_id → definition | **RESTRICT** | 被装配的 Definition 不可物理删 | 归档是软删除，物理删除仅当无装配 |
| project_agent.project_id → project | CASCADE | 项目删除连删关系 | 关系随上下文删除 |
| project_agent.agent_id → agent | **RESTRICT** | 被项目引用的 Agent 不可删 | 防误删；删除需先解绑（V1 无删除 UI） |

**关系表不复制实体数据**：project_agent / agent_capability 仅存外键 + 关系属性（enabled / added_at），全部满足。

## 9. ORM / Data Access 选型

| 维度 | Prisma | **Drizzle（推荐）** | SQLite 原生（better-sqlite3 + 手写 SQL） |
| --- | --- | --- | --- |
| 类型安全 | 强（生成 client）但 schema.prisma 与 TS 双源 | **强且单源**（TS schema 定义直接推导类型） | 弱（手写 SQL + 手写接口） |
| Migration | 成熟但较重；SQLite 支持有限 | **轻量**：drizzle-kit generate（SQL 文件可审）+ migrate | 手写 SQL + 自管版本表 |
| SQLite 适配 | 非最优（特性暴露少） | **一等公民**（better-sqlite3 / libsql driver） | 最优 |
| Next.js 集成 | 需处理生成器与连接管理 | 纯 TS、零生成步骤，集成最顺 | 需自封装 |
| 部署复杂度 | 中（CLI/生成/客户端包） | 低（纯依赖 + 迁移脚本） | 低（但 native build） |
| 查询复杂度 | 简单查询好；复杂聚合需 raw | 简单查询好；聚合可用 SQL 片段 | 完全控制 |
| 未来扩展性 | 迁移 PG/MySQL 最平滑 | PG/MySQL 亦支持，切换成本中等 | 换 DB 全重写 |

**结论：Drizzle + better-sqlite3（本地驱动）**。
- 理由：单源类型（TS schema = 类型 = 迁移基）；SQLite 一等公民；轻量无生成步骤；聚合查询可用原生 SQL 片段（runs/stats 正是复杂聚合）；未来 serverless 可换 libsql/Turso driver，Repository 层隔离改动。
- 兜底：better-sqlite3 在 Windows native 构建失败时，备选 **node:sqlite**（Node 22 内置）或 **libsql**——Drizzle 均支持，驱动层一行切换。

## 10. Seed / Migration / Reset 三职责分离

| 职责 | 工具 | 触发 | 规则 |
| --- | --- | --- | --- |
| Schema Migration | drizzle-kit generate + migrate（版本化 SQL 文件 `drizzle/`） | 启动/部署时自动 migrate | **Schema 变更只走 migration**；seed 永远不承担 schema 变更 |
| 开发 Seed | `npm run db:seed`（幂等 upsert by id） | 显式执行 / 空库自动 | 仅插演示数据；增删演示实体只改 seed 脚本 |
| 演示 Reset | `npm run db:reset`（清业务表 + 重跑 seed） | 显式执行 | 不清 migration 历史 |

**防漂移规则（解决「seed 改了 migrate 漏了」）**：
1. **Schema 变更 = migration 新增 SQL 文件**（唯一通道）；`drizzle-kit generate` 自动对比 schema 产出，杜绝手改遗漏。
2. **seed 与 schema 解耦**：seed 只依赖已迁移的列；若新字段无默认值，必须同批 migration + seed 更新。
3. CI/开发检查：`npm run db:check`（migrate 后跑 schema 一致性检查）纳入提交流程。
4. 前端 `lib/mock-data/seed.ts`：P4-2 后仅作 Mock 模式兜底（`NEXT_PUBLIC_USE_MOCK=1` 时），权威 seed 移到后端；`resetDemoData` 语义改为调用后端 reset（或保留 Mock 专用）。

## 11. Mock → Real API 替换路径（P4-2 实施计划）

| 步骤 | 内容 | 验收 |
| --- | --- | --- |
| P4-2a | 接入 Drizzle + SQLite + schema/migrations/seed；Repository 层（7 实体 CRUD + 关键查询 + 聚合 SQL） | `npm run db:migrate && db:seed` 幂等可跑；冒烟查询通过 |
| P4-2b | Route Handlers 全部契约端点 + zod 校验 + Service 规则（归档装配校验/窗口聚合/幂等/409 映射）+ ApiError 序列化 | curl 冒烟：CRUD/409/404/400 符合契约 |
| P4-2c | 前端 API Client（`lib/api/`）**以同名函数替换 `lib/services/*` 实现**；persist `partialize` 收窄（领域数据不再持久化，仅 timeRange 等 UI 状态）；`periodStats` 收敛为 Store Selector（P2 顺带清理）；DTO→Domain 映射 | Store/组件**零改动**或最小改动；lint/tsc/build 全绿 |
| P4-2d | 全量生产回归：创建 Agent/运行/装配/归档/项目闭环/Dashboard 同源/硬刷新（数据来自后端）；`docs/API.md` 契约文档同步 | 交互验证全绿；控制台 0 error |
| P4-2e | 双模式开关（`NEXT_PUBLIC_USE_MOCK`）+ 文档 | Mock/Real 一键切换，可回滚 |

**前端必须改动的最小集合**（如实列出）：
1. `lib/services/*` 实现替换（签名不变，组件零改动）——预期的主要改动面。
2. `stores/workspace.ts` `partialize` 收窄：`agents/runs/capabilityDefinitions/agentCapabilities/projects/projectAgents` 不再持久化（改为后端为权威，hydrate 拉取）；保留 `timeRange`。
3. `dashboard/page.tsx` `periodStats` → 收敛为 `selectPeriodStats(runs, range)`（P2）。
4. `resetDemoData` 语义调整（调后端 reset / Mock 专用）。
5. 演示数据一次性迁移：后端 seed 重建，前端旧 localStorage 自然废弃（版本号 +1 使旧数据失效）。

## 12. 风险与回滚策略

| 风险 | 等级 | 缓解 / 回滚 |
| --- | --- | --- |
| better-sqlite3 native 构建失败（Windows） | 中 | 备选 node:sqlite（Node 22 内置）/ libsql；Drizzle 驱动一行切换 |
| 时区窗口漂移（前后端窗口不一致） | 中 | 契约强制 `from/to` 显式边界（客户端唯一窗口实现）；测试覆盖跨日/跨月 |
| 前端改动比预期大（persist 收窄影响面） | 中 | 双模式开关（Mock/Real env 切换）灰度；先切读接口后切写接口 |
| 生产部署 SQLite 文件持久化限制 | 低 | 演示/单机部署满足；文档标注 serverless 需换托管 DB（libsql/PG） |
| 统计端点适配成本（selectors 依赖全量 runs） | 低 | P4-2 先全量兼容（小数据），stats 端点作为正式演进目标，逐步切换 |
| 启用后端后旧 localStorage 脏数据 | 低 | persist 版本 +1 + migrate 清理；`db:reset` 一键重建 |

## 13. P4-1 本阶段明确不做

创建数据库 / 修改现有业务代码 / 创建 Route Handler / 引入 ORM / 接真实 AI API / 实现分页与错误模型的代码 / 前端债务清理代码（仅设计契约与迁移路径）。

---

*设计基于现有 18 个 Service 签名与领域模型逐项对照，保证 P4-2 替换时 Store/组件签名零改动或最小改动；本文档未修改任何业务代码。*
