# IMPLEMENTATION_PLAN.md — AI Workspace 实现迭代计划

> 项目：AI Workspace — 现代化 AI SaaS 工作台（前端 Demo）
> 技术栈：Next.js + React + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons + Framer Motion
> 维护规则：每完成一个阶段或一次重要修改，**必须先更新本文件再汇报**；未经用户审批不得擅自进入下一阶段或扩大需求范围。

---

## 版本与更新日志

| 日期 | 版本 | 阶段 | 变更摘要 | 状态 |
| --- | --- | --- | --- | --- |
| 2026-09-08 | v0.1 | Phase 0 — 分析与方案 | 环境检查、需求分析、完整方案文档、里程碑规划 | ✅ 已交付并通过 P1 审批 |
| 2026-09-08 | v0.2 | Phase 1 — 产品外壳与基础视觉体系 | 脚手架、设计 Token、App Shell、Dashboard 骨架页 + 7 模块占位页；修复命令面板 StoreContext 崩溃；lint/tsc/build/交互验证全绿 | ✅ 已完成并通过 P2 审批 |
| 2026-09-08 | v0.3 | Phase 2 — 核心闭环（Dashboard + Agents） | Zustand 状态管理、Mock 服务层、演示数据、Dashboard 业务化、Agents 列表/新建/详情、模拟运行与数据回流、轻量 SVG 趋势图；lint/tsc/build/交互验证全绿 | ✅ 已完成并通过 P3 审批 |
| 2026-09-08 | v0.4 | Phase 3 第一阶段 — 状态持久化 + 工程细节 + Capability 能力层 | Zustand persist（刷新不丢数据 + 可重置回 seed）、趋势图可读性/键盘/空态/异常态增强、无障碍细节（skip-link / reduced-motion / focus-visible / 对比度）、Capability 三层数据模型 + Service 边界 + 详情页只读展示、Dashboard 三处时间窗口口径统一；lint/tsc/build/生产交互验证全绿 | ✅ 已完成并通过 P3 第二阶段审批 |
| 2026-09-08 | v0.5 | Phase 3 第二阶段 — Capability 装配关系编辑（方案 B） | Agent 详情页装配管理：搜索可用能力、装配、启用/停用、解绑（Dialog 确认）、三态区分、Service 写操作契约（贴近 REST）、persist v2（装配持久化 + migrate）、单一 Store 数据源实时一致、空态/加载/失败态完备；lint/tsc/build/生产交互验证全绿 | ✅ 已完成并通过 P3 第三阶段审批 |
| 2026-09-08 | v0.6 | Phase 3 第三阶段 — Capability Asset Hub（方案 A 重定义） | 统一能力资产中心（非四个独立页面）：All/Skills/Memory/Rules/Tools 筛选（URL 驱动）、资产列表（名称/类型/描述/状态/使用数）、资产详情（基本信息 + Used by + 装配概览）、旧占位路由重定向、共享图标/徽章组件去重；Definition 只读；Hub 与 Agent 详情同一 Store 数据源实时联动；lint/tsc/build/生产交互验证全绿 | ✅ 已完成并通过「Definition 资产管理」审批 |
| 2026-09-08 | v0.7 | Phase 3 第四阶段 — Definition 资产管理（方案 A：资产生命周期） | 生命周期两维状态分离（lifecycle 落模型 Active/Archived；Used/Unused 派生不落字段）、创建/编辑/归档（软删除）/恢复全走 Service 写契约、persist v3 + migrate（v1/v2 平滑升级补资产）、归档后不可新装配（Picker 禁用 + Store 校验双保险）、已归档装配保留展示并冻结（不悬空）、Hub/Asset Detail/Agent Detail/Picker 四处同源、Hub 搜索 + 排序（低成本体验增强）、Loading/Success/Error/Empty 完备；lint/tsc/build/生产交互验证全绿 | ✅ 已完成并通过「Projects 业务化」审批 |
| 2026-09-08 | v0.8 | Phase 3 第五阶段 — Projects 业务化（方案 B：最小业务闭环） | 领域模型先定稿（Workspace → Project → ProjectAgent → Agent → AgentCapability/Run；只引用不复制）、Agent ↔ Project 多对多、Run 归属 Agent 统计全派生、Capability 经 Agent 间接关联、persist v3 → v4 + migrate（向后兼容）、`/projects` 列表 + 新建 + `/projects/[id]` 详情（项目摘要 + 关联 Agent 列表 + Picker + 解绑确认）、30 天口径复用 `selectRunsInRange`（与 Dashboard 完全同源）、实时响应 Store 变化；lint/tsc/build/生产交互验证全绿 | ✅ 已完成并通过「Project 维度观察」审批 |
| 2026-09-08 | v0.9 | Phase 3 第六阶段 — Project 维度观察（方案 C 缩小范围） | Dashboard 增加项目维度摘要（项目数/各项目 Agent 数/最近 30 天运行量/成功率/最近活跃，行可点击进详情）、Project Detail 增加「最近运行」（复用 ActivityList + selectRunsInProject，零重复统计/渲染）、Agents 卡片增加所属项目徽章（只展示不改信息架构）、全部统计复用 `selectProjectStats`/`selectRunsInProjectWindow`（统一窗口同源）、单一 Store 实时联动；lint/tsc/build/生产交互验证全绿 | ✅ 已完成并通过「V1 Review」审批 |
| 2026-09-08 | v1.0 | V1 Architecture Review + Scope Freeze（纯审查，零代码修改） | 全量架构审查：领域模型 6 实体无复制/无第二数据源/生命周期无冲突/DB 适配良好；数据流 UI→Store→Selector→Service 合规（唯一例外为纯函数 composeCapabilityViews）；技术债务分级 P0=无 / P1=5 项（分页契约/错误模型/DTO 策略/id 策略/seed-migrate 流程）；Mock→Real 演进判定为 Service 契约足以替换；结论「Mock 边际收益已递减，推荐现在转向 Phase 4 真实后端设计」；V1 范围冻结：已具备 6 类闭环、明确延后 9 类功能 | ✅ 已完成并通过「Phase 4」审批 |
| 2026-09-08 | v1.1 | P4-1 Backend Architecture & API Design（纯设计，零代码修改） | 分层架构（UI→Store→API Client→Route Handler→Service→Repository→SQLite）、DTO 与 Domain 分离、统一 ApiError（7 码 + 字段级）、Page 分页契约、过滤/排序/搜索契约、时间窗口契约化（客户端声明 from/to，含今天 N 自然日规则保留）、6 组资源全量 REST Contract、SQLite Schema（7 表 + PK/FK/UNIQUE/Index/CASCADE-RESTRICT 语义）、ORM 选型对比（Prisma/Drizzle/原生 → **推荐 Drizzle + better-sqlite3**）、Repository/Service 分层、Seed/Migration/Reset 三职责分离 + 防漂移规则、Mock→Real 替换路径（P4-2a~e）、风险与回滚（双模式开关）；P1 五项在契约层一次解决，P2 periodStats 顺带 P4-2 收敛 | ✅ 已完成并通过 P4-2 审批 |
| 2026-09-08 | v1.2 | P4-2 Real Backend 实施（SQLite 成为事实数据源，双模式可运行） | 时间窗口契约收敛（stats 只收显式 from/to）、DB Adapter 边界（better-sqlite3 唯一实现）；`db/schema.ts` 6 表 + `db/db.ts`（WAL+foreign_keys）+ 幂等 seed + migrate + reset + db:check（schema/migration 一致）；Repository 查询层 + `runsStats` 聚合（successRate 1 位小数）；Service 业务规则层（ServiceError 三码 + archived 装配 CONFLICT + 幂等 upsert）；17 个 Route Handler（六域 REST + stats + demo/reset）；前端 API 层（ApiError 7 码 + DTO + client + mappers + server 校验/错误映射/SQLITE_CONSTRAINT→409）；Mock/Real 双模式 services 入口（同名函数契约，组件零改动）；**persist v4→v5**（partialize 仅 timeRange，旧领域数据 migrate 明确丢弃不合并）；`resetDemoData` 改为演示数据库 reset 语义；`selectPeriodStats` 收敛 Dashboard 内联统计（P2 债务）；lint/tsc/build 全绿；Real 生产回归（创建/运行/装配/启停/解绑/项目关联真实落库 + 刷新 SQLite 恢复 + localStorage 仅 timeRange + API 错误契约按 code + stats from/to 与 P3 口径一致 91/91.2%/1.7M）；Mock 模式独立构建可运行（回滚验证） | ✅ 已完成，待审批进入下一阶段 |

## 当前阶段

**P4-2 Real Backend 实施**（已完成；**不自动进入下一阶段**，待审批）

---

## 二、已完成内容（P4-2 实施）

### 1. 时间窗口契约收敛（用户 P4-2 审批要求）
- [x] 统计接口只接受显式 `from/to`：`GET /api/v1/runs/stats?from=...&to=...`；前端统一 window selector（`windowBoundsForRange`）计算「含今天 N 自然日」实际边界；服务端只做「明确 from/to → 查询 → 聚合 → 返回」；**无 window+tzOffset 第二入口**
- [x] 时区信息仅用于正确计算客户端边界，第一版 API 以显式边界为事实输入

### 2. DB Adapter 边界（用户 P4-2 审批要求）
- [x] better-sqlite3 为唯一实际实现（驱动隔离在 `db/db.ts`）；业务层（Service/Route Handler）无任何数据库驱动判断；未来切 node:sqlite/libsql 仅改一行

### 3. Schema + Migration + Repository（P4-2a）
- [x] `db/schema.ts` 6 表（agent/capability_definition/agent_capability/project/project_agent/agent_run）：snake_case、TEXT uuid PK、FK（agent_run→agent CASCADE；agent_capability→agent CASCADE / →definition RESTRICT；project_agent→project CASCADE / →agent RESTRICT）、UNIQUE(agent_id,capability_id)、UNIQUE(project_id,agent_id)、4 组索引
- [x] `db/db.ts`：better-sqlite3 连接，**WAL + `foreign_keys=ON`**（必须显式开，否则 CASCADE/RESTRICT 不生效），data 目录自动创建
- [x] `drizzle.config.ts` + migration `drizzle/0000_cloudy_kitty_pryde.sql`（已应用）；`db/migrate.ts`（可重复验证）
- [x] `db/seed.ts`：与前端 seed 同构（种子 20260908、频次 [26,18,30,12,6]）、幂等 upsert（onConflictDoUpdate）、导出 clearAll；seed 结果 5 agents/18 definitions/49 assemblies/3 projects/6 projectAgents/92 runs
- [x] `db/reset.ts`（clearAll+runSeed）、`db/check.ts`（migration 已应用 + drizzle-kit check schema 一致）
- [x] `db/repository.ts`：PageQuery/offsetOf、六域 list/get/insert/update/delete、`resolveRunAgentIds`（项目经 project_agent join 派生过滤）、`runsStats`（totals + 按日聚合，successRate 1 位小数）

### 4. Service + Route Handler + ApiError（P4-2b）
- [x] `db/service.ts` 业务规则层：ServiceError{code: VALIDATION_ERROR|NOT_FOUND|CONFLICT}；createAgent/runAgent（演示 86% 成功桩，真实落库）/createCapability/updateCapability/setCapabilityLifecycle/attachCapability（**archived→CONFLICT**、重复→CONFLICT）/setCapabilityEnabled/detachCapability/createProject/attachAgentToProject（重复 CONFLICT）/detachAgentFromProject（按关系 id）/resetDemo
- [x] 17 个 Route Handler（六域 REST + `/runs/stats` + `/demo/reset`），zod 校验、错误映射 handleError（ServiceError/ZodError→ApiErrorBody、SQLITE_CONSTRAINT*→409、兜底 500）、parseTimeRange 只收成对 from/to、白名单 sort、分页 pageMeta

### 5. 前端 API 层 + 双模式 services（P4-2c）
- [x] `lib/api/errors.ts`（ApiErrorCode 7 码 + HTTP_STATUS_BY_CODE + ApiError class）、`dto.ts`（PageDTO/六域 DTO/RunsStatsDTO）、`client.ts`（非 2xx 一律 json→ApiError 按 code，204 透传）、`mappers.ts`（DTO→Domain 六映射）、`server.ts`
- [x] `lib/services/mode.ts`（`NEXT_PUBLIC_USE_MOCK === "1"` 编译期开关）；`{agents,capabilities,projects,demo}.ts` 双模式入口（同名函数契约，组件零改动）；旧 Mock 移至 `mock/*`（新增 fetchAllAgentCapabilities/fetchAllProjectAgents）；新增 `http/*`（fetchRuns 全量兼容 pageSize=1000，stats 端点未来演进）；`compose.ts` 纯函数（composeCapabilityViews 模式无关化）
- [x] `lib/types.ts`：CapabilityDefinition 增加可选 createdAt/updatedAt（后端必填、前端兼容缺省）

### 6. persist 收窄 + 统计收敛（P4-2d）
- [x] **persist v4→v5**：partialize 仅 `{timeRange}`（localStorage 不再保存领域事实数据）；migrate 对 v<5 旧数据**一律丢弃领域字段只保留 timeRange**（明确处理策略，不与 SQLite 静默合并）；hydrate/resetDemoData 走 fetchAllData
- [x] resetDemoData：Real=POST /demo/reset（演示数据库 reset 语义）+ fetchAllData；Mock=no-op
- [x] `windowBoundsForRange`（唯一窗口边界实现）+ `selectRunsInRange` 改基于它 + **`selectPeriodStats` 收敛 Dashboard 内联 periodStats（P2 债务）**；Dashboard/capability-list 调用点同步更新

### 7. 验证（P4-2e/f）
- [x] lint 0 error 0 warning / tsc 0 error / build 通过（Real 与 Mock 两模式独立构建）
- [x] API 冒烟 11 项：200/201/204 + 400（缺 from/to、from>to、参数校验）+ 404 + 409（重复装配、archived 装配）；stats from/to 30 天 totals 与 P3 Dashboard 口径一致（91 runs/91.2%/1.74M tokens）
- [x] Real 生产回归：Dashboard 全指标与 P3 一致；创建 Agent（服务端 UUID）+ 触发运行 + 装配 + 启停 + 解绑 + 创建项目 + 关联 Agent 全部真实落库；刷新从 SQLite 恢复；Dashboard 项目维度同源（新项目实时出现）；localStorage 仅 timeRange（version 5）；Capabilities Hub 18 资产/49 装配
- [x] Mock 模式独立构建 + 启动 + Dashboard 验证（92/91.3%，相对时间 seed 边界差属已知特性）——回滚通道可用
- [x] db:check 通过（migration 已应用且 schema 一致）；db:reset 幂等


## 三、环境检查记录（2026-09-08，Phase 2 实测更新）

| 检查项 | 结果 | 说明 / 影响 |
| --- | --- | --- |
| 工作目录 | `D:\AI workspace` | **路径含空格，命令与脚本需引号包裹** |
| Node.js | v22.23.2 ✅ | 满足要求 |
| npm | 10.9.8 ✅ | 默认包管理器 |
| pnpm | 11.22.0 ✅ | 备选 |
| Git | 2.54.0.windows.1 ✅ | Phase 1 首次提交 `8a36106`（58 files）已完成 |
| npm registry | `https://registry.npmmirror.com` | 实测可用 |
| Shell | PowerShell 5.1 | 不支持 `&&`，命令以分号或独立调用执行 |
| 实际版本组合 | next 16.3.4 / react 19.2.8 / tailwindcss ^4 / zustand 5.x（Phase 2 新增）/ framer-motion ^13.2.0 / geist ^1.7.2 / radix-ui ^1.6.7 / lucide-react ^1.42.0 / cmdk ^1.1.1 | 构建通过（见验证结果） |

## 四、已完成内容（P4-1 纯设计 / 零代码修改 · 历史记录）

### 1. 分层架构与不变式
- [x] UI → Zustand Store → API Client → Route Handler → Service → Repository → SQLite；UI 不知 DB、Store 不知 API 细节；**DTO ≠ Domain**（mappers 隔离）
- [x] Store 定位调整：领域数据由 API 拉取（persist 收窄为 UI 偏好，P4-2 实施）

### 2. 契约设计（P1 五项一次解决）
- [x] **统一 ApiError**：7 错误码（VALIDATION/NOT_FOUND/CONFLICT/UNAUTHORIZED 预留/FORBIDDEN 预留/INTERNAL/RATE_LIMITED）+ 字段级 details + requestId；前端按 code 分支，不依赖响应文本
- [x] **Page 分页契约**：`{items,page,pageSize,total,totalPages}` + LIMIT/OFFSET + cursor 演进预留
- [x] **过滤/排序/搜索契约**：白名单 sort 字段（防注入）+ search LIKE 转义 + 等值过滤
- [x] **时间窗口契约化**：保留「含今天 N 自然日」规则；**时区由客户端声明**（推荐 from/to 显式边界；window+tzOffset 快捷）；stats 端点回显实际窗口
- [x] **DTO 与 Domain 分离**：lib/api/types.ts（DTO）+ mappers；Store/UI 不依赖 DTO 字段
- [x] **服务端 ID**：UUID v4（crypto.randomUUID）；前端不再生成业务 id

### 3. API Contract（6 组资源全量）
- [x] Agents（6 端点）/ Agent Runs（2 端点 + stats 聚合）/ Capabilities（5 端点，归档走 PATCH lifecycle）/ AgentCapabilities（4 端点，服务端校验归档装配 + 409）/ Projects（5 端点，编辑/归档预留）/ ProjectAgents（3 端点，409 幂等）
- [x] **统计聚合端点** `/runs/stats`（?window&project=&agents=&groupBy=day|agent）：项目统计=派生的领域规则在服务端成立

### 4. DB Schema（SQLite，7 表）
- [x] PK：TEXT uuid；FK 语义：agent_run→agent CASCADE / agent_capability→definition **RESTRICT** / project_agent→project CASCADE / project_agent→agent **RESTRICT**；UNIQUE：装配与关联防重；Index：agent_run(agent_id,started_at DESC)、started_at DESC、status/type 等
- [x] 关系表（project_agent / agent_capability）仅存外键 + 关系属性，**不复制实体数据**

### 5. ORM 选型（对比结论）
- [x] **推荐 Drizzle + better-sqlite3**：TS 单源类型、SQLite 一等公民、迁移轻量可审（drizzle-kit）、聚合可 SQL 片段、未来 libsql 驱动切换；Prisma 较重且 SQLite 非最优；原生类型安全弱
- [x] 兜底：node:sqlite / libsql（驱动一行切换）

### 6. Seed / Migration / Reset 三职责 + 防漂移规则
- [x] Schema 变更只走 migration（drizzle-kit generate 自动对比）；seed 幂等 upsert 仅插演示数据；reset 清业务表重跑 seed；`db:check` 纳入提交流程——根治「seed 改了 migrate 漏了」

### 7. Mock → Real 替换路径（P4-2 实施计划）
- [x] P4-2a DB+Repository → P4-2b Route Handlers+Service+ApiError → P4-2c 前端 API Client 同名替换 + persist 收窄 + periodStats 收敛（P2 顺带）→ P4-2d 全量回归 + API 文档 → P4-2e 双模式开关（可回滚）
- [x] **前端最小改动清单如实列出**：services 实现替换（签名不变）/ persist partialize 收窄 / periodStats 收敛 / resetDemoData 语义 / 演示数据一次性重建

### 8. 风险与回滚
- [x] better-sqlite3 native 构建失败（→node:sqlite/libsql）；时区窗口漂移（→from/to 显式边界 + 跨日测试）；前端改动面（→Mock/Real 双开关灰度）；SQLite 生产部署限制（→文档标注）；旧 localStorage 脏数据（→persist 版本+1）

## 五、验证结果（P4-1 纯设计）

| 检查项 | 结果 |
| --- | --- |
| 代码修改 | ✅ 零修改（仅新增 `docs/P4-1-Backend-Architecture-API-Design.md`） |
| lint / tsc / build | ✅ 无需执行（无代码改动；基线保持全绿） |
| 契约一致性 | ✅ 18 个现有 Service 签名逐项对照 API Contract，替换路径签名零改动 |
| 范围合规 | ✅ 未创建数据库 / 未改业务代码 / 未建 Route Handler / 未引入 ORM / 未接 AI API |

## 六、技术决策记录（ADR 简表）

| 编号 | 决策 | 理由 / 状态 |
| --- | --- | --- |
| D13 | **Zustand persist 持久化**（`partialize` 白名单 + version 1 + `createJSONStorage(localStorage)`） | ✅ 落地：仅持久化数据字段，hydrated 标志与 actions 不落盘；`resetDemoData` 保证演示可重新初始化 |
| D14 | **统一自然日窗口口径**（指标/图表/活动共用 `[今天 0 点 −(N−1) 天, 明天 0 点)`） | ✅ 落地：三处数字同源同口径，杜绝「92 vs 91」类展示差异；写为 Selector 注释契约 |
| D15 | **Capability 三层模型**（Definition 资产 / AgentCapability 装配 / Agent） | ✅ 落地：定义与 Agent 解耦、多对多复用、enabled 属装配关系；页面只消费组装视图，不硬编码四类能力逻辑 |
| D16 | **Capability Service 边界**（`lib/services/capabilities.ts`） | ✅ 落地：async 签名与未来真实 API 一致，Mock→Real 单文件替换；compose 纯函数容错悬空引用 |
| D17 | 趋势图焦点重置用**父级 `key={timeRange}` 重挂载**，弃用 useEffect setState | ✅ 落地：满足 `react-hooks/set-state-in-effect` 新 lint 规则，行为等价（切范围回最新一天） |
| D18 | **装配三态用「存在性 + 单一 enabled」表达**（未装配/已装配启用/已装配停用） | ✅ 落地：不引入多个易冲突布尔；attach 幂等、setEnabled 目标缺失抛错、detach 幂等 |
| D19 | **persist version 1 → 2 + migrate**（旧数据自动补 seed 装配） | ✅ 落地：装配持久化；演示可重置回 seed；不引入第二数据源 |
| D20 | **Mock 写契约只做往返、不持有状态**（attach 返回新实体 / setEnabled 返回确认字段 / detach 返回 void） | ✅ 落地：与真实 REST 语义对齐，替换实现时 store/组件零改动 |
| D21 | **四类能力统一为 Capability Asset Hub**（非四套独立页面） | ✅ 落地：单一路由 `/capabilities`（列表+详情）+ URL 类型筛选；旧四入口 301 重定向 |
| D22 | **共享能力 UI 元数据收敛**（`lib/capability-meta.ts` 图标 + `capability-type-badge.tsx` 徽章） | ✅ 落地：Agent 装配列表/面板/Hub 三处共用，消除重复组件 |
| D23 | **资产「状态」为派生值**（使用中/未使用 = 装配数 > 0），Definition 不加冗余字段 | ✅ 落地：保持模型只读干净，UI 状态实时计算 |
| D24 | **两维状态正交**：生命周期 `lifecycle`（Active/Archived 落模型）+ 使用状态（Used/Unused 派生），互不推导 | ✅ 落地：archived 资产可 used（保留装配）也可 unused |
| D25 | **归档 = 软删除**：不物理删除 Definition、不自动解绑 AgentCapability；archived 装配保留展示并冻结管理 | ✅ 落地：Agent 详情「已归档 | 冻结」，恢复后重新可管理 |
| D26 | **归档不可新装配**：Picker UI 禁用 + Store attach 校验双保险 | ✅ 落地：两处拦截，杜绝绕过 UI 直接装配 archived |
| D27 | **Definition 写操作全部经 Service 契约**（create/update/archive/restore），页面不直改领域数据 | ✅ 落地：与 REST 语义对齐，未来替换真实 API 仅动 Service |
| D28 | **persist v3 + migrate**：capabilityDefinitions 由 seed 回填升级为可写持久化；v1/v2 旧数据自动补 seed 定义副本 | ✅ 落地：注入 v2 实测平滑升级 |
| D29 | **Project 为业务组织上下文，只引用不拥有**（ProjectAgent 中介表，不复制 Agent/Capability/Run 数据） | ✅ 落地：localStorage 检查无重复副本；与 Capability 资产模型同构 |
| D30 | **Agent ↔ Project 多对多**（Agent 工作区级资产可跨项目复用） | ✅ 落地：agent-support 同属两项目，统计各自正确 |
| D31 | **Run 归属 Agent，项目统计全派生**（不给 Run 加 projectId；`selectRunsInProjectWindow` 复用 `selectRunsInRange` 统一窗口） | ✅ 落地：30 天口径与 Dashboard 完全同源，localStorage 重算 = 页面 DOM |
| D32 | **Project 生命周期 `status` 入模型**（active/archived 软删除语义预留）；本阶段仅 active，不做归档/恢复 UI | ✅ 落地：避免范围膨胀，领域完整 |
| D33 | **persist v4 + 阶梯 migrate**（v1→v2→v3→v4 依次补装配/定义/项目），projects/projectAgents 可写持久化 | ✅ 落地：解绑结果刷新后保留；向后兼容 |
| D34 | **Dashboard 项目维度全部复用既有 Selector**（selectProjectStats / selectRunsInProjectWindow → selectRunsInRange），不新增统计实现 | ✅ 落地：Dashboard 与 Project Detail 同源同口径（2/38/87% 双向一致） |
| D35 | **Project Detail「最近运行」复用 ActivityList**（纯展示组件，同 props 契约） | ✅ 落地：零重复渲染逻辑，空态/状态徽章沿用 |
| D36 | **Agents 项目关联只展示不改架构**：AgentCard 新增可选 `projectsOf` 徽章行（≤2 +N），列表结构与信息层级不变 | ✅ 落地：5 卡片徽章正确；避免嵌套 Link（卡片外层已是链接） |
| D37 | **V1 Scope Freeze**：停止堆前端模块；P0 债务 = 无；P1 5 项（分页/错误模型/DTO/id/seed-migrate 流程）在接后端前修复；延后 9 类功能 | ✅ 审查结论（见 docs/V1-Architecture-Review.md） |
| D38 | **真实后端切入点判定**：Mock 边际收益已递减，推荐 Phase 4 转向真实后端设计（先契约后实现，前端零改动） | ✅ 审查结论，待用户审批 |
| D39 | **P4-1 契约总纲**：DTO≠Domain（mappers 隔离）、ApiError 7 码统一错误模型、Page 分页 + cursor 演进预留、客户端声明时区的窗口契约、服务端 UUID 生成 | ✅ 设计定稿（docs/P4-1） |
| D40 | **ORM 选型：Drizzle + better-sqlite3**（TS 单源类型 / SQLite 一等公民 / 迁移可审 / 聚合 SQL 片段；兜底 node:sqlite、libsql） | ✅ 设计定稿 |
| D41 | **统计聚合端点化**：`/runs/stats` 承载趋势/指标/项目统计（服务端 join project_agent 保持「项目统计=派生」）；P4-2 先全量兼容渐进切换 | ✅ 设计定稿 |
| D42 | **Seed/Migration/Reset 三职责 + 防漂移**：Schema 变更只走 drizzle-kit migration；seed 幂等 upsert；db:check 提交流程 | ✅ 设计定稿（根治 seed/migrate 漂移） |
| D43 | **persist v4→v5 收窄**：partialize 仅 timeRange；v<5 migrate 一律丢弃领域字段（明确不与 SQLite 静默合并） | ✅ 落地：localStorage 实测仅存 timeRange，杜绝第二数据源 |
| D44 | **时间窗口契约收敛**：stats 只收显式 from/to（客户端 windowBoundsForRange 计算边界），无 window+tzOffset 第二入口 | ✅ 落地：/runs/stats from/to 30 天 totals 与 P3 口径一致（91/91.2%/1.74M） |
| D45 | **DB Adapter 边界**：better-sqlite3 唯一实现，驱动隔离于 db/db.ts（WAL+foreign_keys=ON）；Service/Route Handler 零驱动判断 | ✅ 落地：未来 node:sqlite/libsql 仅改一行 |
| D46 | **写操作全链路契约**：UI→Store→Service(双模式入口)→Route Handler→Service→Repository→SQLite；UI 不依赖 DTO；API Error 仅按 code 分支 | ✅ 落地：17 个 Route Handler + ApiError 7 码 + SQLITE_CONSTRAINT→409 |
| D47 | **resetDemoData 语义改为演示数据库 reset**（POST /demo/reset + fetchAllData），不再是领域数据第二来源 | ✅ 落地：Mock 模式 no-op 保持可回滚 |

## 七、发现的问题

1. **时区是窗口一致性的最大隐藏风险**（设计前置解决）：前端本地时区 vs 服务端 UTC 会导致「含今天 N 自然日」漂移 → 契约强制客户端传 `from/to` 显式边界（或 window+tzOffset），服务端纯执行；测试覆盖跨日。
2. **Store persist 与后端权威的职责冲突**（P4-2 必改点）：领域数据改为后端权威后，`partialize` 必须收窄（仅 timeRange 等 UI 状态），否则「前端持久化 vs 后端」双源竞争——已在 P4-2c 计划并注明最小改动清单。
3. **统计 selectors 依赖全量 runs 内存计算**（渐进改造）：P4-2 先全量兼容（小数据），stats 聚合端点为正式目标，避免一次性大改。
4. **better-sqlite3 native 构建风险**（Windows）：备选 node:sqlite / libsql 已列入风险表，Drizzle 驱动可一行切换。
5. 既有遗留不变（截图工具链 / link-preload warning，均 P3）。

### P4-2 实施中实际遇到的问题
1. **capability_definition.created_at NOT NULL vs 前端 Domain 缺省**：首跑 seed 报 NOT NULL 约束失败 → 补齐 18 个定义 createdAt/updatedAt（-88d~-25d 分布），重跑幂等通过。
2. **better-sqlite3 生产服务器进程曾被环境回收**（非代码缺陷）：后台 bash 任务生命周期限制 → 改为 cmd 隐藏窗口方式托管（已稳定）；代码零改动。
3. **seed 相对时间边界漂移**（已知特性）：Mock 92 vs Real 91 因 seed 随机 startedAt 跨 30 天窗口边界，非口径问题，DOM/Store/DB 三者始终同源自洽。


## 八、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| **runAgent 为服务端演示桩**（86% 成功随机，真实落库；非真实 AI Runtime） | 中 | 用户明确排除范围；接口契约已按真实语义设计，未来接 AI 服务仅替换 service 内实现 |
| **stats 端点已就绪但前端仍全量拉取**（pageSize=1000 内存聚合） | 中 | 契约与实现已就绪（from/to + totals/daily），数据量增大后前端切 stats 端点，selectors 行为不变 |
| **seed 相对时间**：跨天访问 30 天窗口数字微变 | 低 | 已知特性；回归以 DOM/Store/DB 同源为准，不与历史快照强求一致 |
| SQLite 生产部署（serverless）限制 | 低 | 演示/单机部署满足；文档标注未来换托管 DB |
| 旧 localStorage 脏数据 | 低 | persist v5 migrate 明确丢弃领域字段；db:reset 一键重建 |
| better-sqlite3 原生模块在部分平台构建失败 | 低 | 已构建通过（Windows/Node 22）；node:sqlite/libsql 兜底 |

## 九、下一步计划

1. **等待审批**：批准进入下一阶段（候选：P4-3 统计端点化收尾 / AI Runtime 接入前置设计 / 认证与多用户预留；最终由用户选定，本次不做扩范围）。
2. 执行任何内容前：先出方案 → 审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P4-2 收尾**：Git 提交（本次执行）已完成。

## 十、待审批事项

- [x] **A21**：批准《P4-1 Backend Architecture & API Design》（ORM=Drizzle+better-sqlite3 / 统计端点化 / 时区契约 / 三职责 seed-migration 等结论）✅ 已批准
- [x] **A22**：批准进入 **P4-2 实施**（DB+Repository → Route Handlers+Service → 前端同名替换 + persist 收窄 → 全量回归 → Mock/Real 双开关）✅ 已批准并完成
- [ ] **A23**：验收《P4-2 交付汇报》（Real 落库 / 刷新恢复 / 口径一致 / 双模式 / lint-tsc-build 全绿）
- [ ] **A24**：审批下一阶段方向（由用户从候选中选择，不默认推进）
