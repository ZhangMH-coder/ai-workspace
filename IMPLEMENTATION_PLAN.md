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
| 2026-09-08 | v1.2 | P4-2 Real Backend 实施（SQLite 成为事实数据源，双模式可运行） | 时间窗口契约收敛（stats 只收显式 from/to）、DB Adapter 边界（better-sqlite3 唯一实现）；`db/schema.ts` 6 表 + `db/db.ts`（WAL+foreign_keys）+ 幂等 seed + migrate + reset + db:check（schema/migration 一致）；Repository 查询层 + `runsStats` 聚合（successRate 1 位小数）；Service 业务规则层（ServiceError 三码 + archived 装配 CONFLICT + 幂等 upsert）；17 个 Route Handler（六域 REST + stats + demo/reset）；前端 API 层（ApiError 7 码 + DTO + client + mappers + server 校验/错误映射/SQLITE_CONSTRAINT→409）；Mock/Real 双模式 services 入口（同名函数契约，组件零改动）；**persist v4→v5**（partialize 仅 timeRange，旧领域数据 migrate 明确丢弃不合并）；`resetDemoData` 改为演示数据库 reset 语义；`selectPeriodStats` 收敛 Dashboard 内联统计（P2 债务）；lint/tsc/build 全绿；Real 生产回归（创建/运行/装配/启停/解绑/项目关联真实落库 + 刷新 SQLite 恢复 + localStorage 仅 timeRange + API 错误契约按 code + stats from/to 与 P3 口径一致 91/91.2%/1.7M）；Mock 模式独立构建可运行（回滚验证） | ✅ 已完成并通过 P4-3 审批 |
| 2026-09-08 | v1.3 | **P4-3 统计端点化收尾** | Dashboard/Project/Agent 运行统计正式改由 `GET /api/v1/runs/stats?from&to` 服务端 SQL 聚合获取，**彻底结束前端 pageSize=1000 全量拉取 + 内存聚合**；Repository `runsStats` totals 扩展 avgDurationMs/lastRunAt、stats 端点新增 `?agent=` 单 Agent 过滤；前端服务层重构（`lib/services/runs.ts` 双模式入口 + `http/runs.ts` + `mock/runs.ts` SQLite 同构内存聚合 + `mock/state.ts` Mock 内存数据层）；Store 重构（recentRuns/agentRunsById/projectRunsById + StatsCache{global/previous/byProject/byAgent}，删全部统计 selectors，保留唯一窗口实现 windowBoundsForRange）；四个页面组件改用 stats 缓存（对外 UI 行为不变）；明细分页走 `/runs?pageSize&sort` 与 `/agents/:id/runs`（200/10/8），**无任何 pageSize=1000**；**seed 天级锚修复**（Date.now()→今天 0 点，db:reset 统计稳定可复现，Mock/Real 数字完全对齐）；lint/tsc/build 全绿；Real 生产回归（指标 88/90.9%/1.7M、项目 36/47/17、Agent 26/18/30/12/6 全部同源；attach/detach 实时刷新且硬刷新 SQLite 落库恢复；7d 切换 + 硬刷新持久化；localStorage 仅 timeRange；API 冒烟 from/to 边界/空数据/单日/跨月/错误契约全过；控制台 0 错误）；Mock 独立构建验证与 Real 完全一致 | ✅ 已完成并通过 P4-4 审批 |
| 2026-09-08 | v1.4 | **P4-4 交付增强 & V1 Release Candidate** | Docker 化（多阶段 Dockerfile + docker-compose + .dockerignore；SQLite 持久化卷 `./data:/app/data`；容器入口 `db:init && start`，重启数据保留）；README 完整化（环境/安装/开发/Real-Mock/初始化/构建/生产/Docker/数据位置/功能边界）；CI 最小质量门禁（GitHub Actions：npm ci → lint → tsc → db:init+db:check（DATABASE_URL=./data/ci.db 隔离）→ build；本地 `npm run ci` 等价）；新增 `db/init.ts` 从零初始化脚本（migrate + 空库 seed，幂等）；tsx 移至 dependencies（容器运行时 db 脚本）；从零初始化验证（删库 → init 5/18/49/3/6/92 → check → 二次 init seed 跳过 → build → 启动 → 访问）；稳定性回归（Real 生产全页面 + 写操作 attach/detach 落库 + Mock 独立构建与 Real 数字一致 88/90.9%/1.7M）；lint/tsc/build 全绿；seed 天级时间锚保持；P4-3 基线数字不变 | ✅ 已完成并通过 P5-1 审批 |
| 2026-09-08 | v1.5 | **P5-1 AI Runtime 架构与契约设计（纯设计，当前阶段）** | 交付 `docs/P5-1-AI-Runtime-Architecture-Contract.md`：目标架构 Agent→Runtime→Model/Prompt/Context/Capability/Execution→Run；Runtime 编排层（lib/runtime/*）位于 Service 与 Provider 之间；RuntimeRequest/ModelConfig/ExecutionContext/RuntimeResult/RuntimeEvent/RuntimeError/TokenUsage 域模型；Run 状态机五态（queued/running/succeeded/failed/cancelled）+ 合法转换 + 存量 success→succeeded 迁移策略 + 统计分母显式定义；Capability 两层只读消费（Definition 资产 + AgentCapability 装配 → ExecutionContext，四类职责与注入顺序）；统一 RuntimeProvider 接口（Adapter 注册表，禁止 Service 硬编码）；Streaming Event 契约（delta/tool_call/tool_result/finish/error + SSE 细则，P5-2 不实现）；错误分层（API/Runtime/Provider/Tool/Timeout-Cancel → Run 落库 error_code）；Token/Cost 模型（input/output/total 落库、cost 扩展位不落库）；持久化边界（Run 落库、事件流仅内存、完整 output 不持久化）；Mock→Real 双模式替换路径（P5-2 仅 MockProvider + 编排层）；P5-2 最小实施计划（10 项，明确不做清单）；风险与边界 | ✅ 已完成，待审批进入 P5-2 |
| 2026-09-09 | v1.6 | **Phase 2 — Resource Intelligence MVP（能力索引）** | 145 个真实资源（128 可解析）从「被展示」升级为「能力索引」：新表 `resource_analysis`（保留历史：analyzerVersion/createdAt/isCurrent/inputFingerprint，唯一键 resourceId+inputFingerprint+analyzerVersion 防同版本重复）+ `resource_capability`（每条标签必须 evidenceRef+evidenceSnippet 可追溯）；`lib/analysis/*` 分析层（DocumentReader 只读白名单解析 + fingerprint 增量机制 + HeuristicAnalyzer heuristic-v1 唯一实际分析器 + LLMAnalyzer 仅契约桩不注册）；API 5 端点（run/status/resources/[id]/capabilities/match）；前端能力索引页 `/resources/capabilities`（状态卡 + 增量分析 + 任务→资源匹配 + 类别分组）+ 资源详情能力区块（InsightPanel）+ 导航「Resource Capabilities」；Mock 模式真实空态不伪造；**修数据一致性**：同指纹重跑失败时旧标签一并失效（failed 资源不再残留旧能力标签）；最终态 145 / 128 analyzed / 17 failed / 487 标签（全部可追溯）；lint 0/0、tsc、db:check、build（Real+Mock）、增量/幂等/追溯/只读/Mock 空态验证全过 | ✅ 已完成，待审批 |
| 2026-09-09 | v1.7 | **Phase 3 — Task Intelligence MVP（任务理解与能力编排）** | 把「资源能力索引」升级为「任务理解层」：六组件流水线 Task → TaskParser（通用领域词典类型识别）→ TaskDecomposer（类型模板 + 附加意图拆解）→ RequirementExtractor（能力需求，isInferred 固定 true）→ CapabilityRetriever（复用现有打分公式 + 真实用户任务反向匹配 + other 类型仅反向信号）→ Reranker（跨需求合并/同资源去重/证据质量分级/最低推荐分 0.5 如实过滤）→ Assembler（RecommendationPlan，仅「选什么」不执行，lib/runtime 契约零改动）；新表 `task_analysis`（历史 + fingerprint + isCurrent，唯一键 task+inputFingerprint+analyzerVersion）+ `task_requirement`（isInferred）+ `resource_recommendation`（只引用 resource_capability.id，evidenceRef/sourcePath 真实来源快照，追溯链完整）；migration 0004；API `POST /api/v1/task-intelligence/analyze`（幂等复用）+ GET analyses/[id] + GET analyses；DTO/mappers/client + Mock 真实空态双模式；Store taskIntelligence 区块 + `/task-intelligence` 页面（输入 → 拆解/需求（推断徽标）→ 推荐卡片（score/理由/证据行）+ 历史列表）+ 导航「Task Intelligence」；**修检索噪声**：中文 2-gram 停用词、模板词反向匹配虚高（kwHits 改基于真实用户任务）、other 类型关闭正向匹配；验收场景「写一篇小红书文案」8 条 #1=1、「数据周报并整理成表格」8 条 #1=0.94（含数据整理子任务）、「今天天气怎么样」如实 0 推荐空态；lint 0/0、tsc、db:check、build（Real+Mock）、API 冒烟（样例/幂等/空态/追溯/事实推断分离）、145/128/487 零回归 | ✅ 已完成，待审批 |
| 2026-09-10 | v1.8 | **Phase 4 — Capability Planning MVP（任务计划：排序/依赖/校验/回退）**
| 2026-09-10 | v1.10 | **S1 首战 — 新增 Hermes Harness Adapter（用户主战场真实资源）** | ① 新增 `lib/discovery/adapters/hermes.ts`：探测 `HOME/.hermes`，递归发现 skills 全部 135 个真实 SKILL.md（兼容 两层/单层分类即技能/三层 三种结构，修复 `computer-use` 被全局跳过名单误伤的问题——Hermes 内该目录是真实技能，改用自定义遍历仅跳隐藏目录）+ 2 个插件（superpowers 已解析、agency-agents 目录无 manifest 如实标记未解析）；② 新增 `fs-utils.extractUsage`：从 SKILL.md 正文确定性提取一行「如何使用」，Hermes/Doubao/Cursor 三类 SKILL.md 技能均带 usage；③ 前端资源列表行显示用法摘要、资源详情新增「如何使用」卡片（usage 兜底 description）；④ 实测入库：Hermes 137（135 技能 + 2 插件），资源总数 145→282，可解析 248→264；⑤ 验证：幂等扫描 282 不变、135 个 Hermes 文件扫描前后 SHA-1 完全一致（只读）、lint 0/0、tsc、db:check、build（Real+Mock）、页面 200、API hermes=137 全绿 | ✅ S1 Hermes 适配完成，待审批进入后续阶段 | | 产品方向收敛为「本机真实 AI 资源工作台」：① `lib/mock-data/seed.ts` 六组演示数据（seedAgents/seedCapabilityDefinitions/seedAgentCapabilities/seedProjects/seedProjectAgents/seedRuns）全部置空，导出名保留（mock 引用方零改动，Mock 模式真实空态）；② `db/seed.ts` 重写为仅 `clearAll()`（清空 agent/capability_definition/agent_capability/project/project_agent/agent_run 六张演示业务表），`runSeed()` 兼容返回空计数；`db/init.ts` 不再种演示数据（migrate only）；`db/reset.ts` = 清空演示业务数据、保留真实资源；③ 实测清空数据库假记录：6 表归 0，真实资源线零回归（145 资源 / 128 可解析 / 487 当前能力标签）；④ 删除冗余文件：docs/previews 截图 40+、docs 工程化方案/Capability 架构设计/V1-Review/P4-1 旧文档（保留 P5-1 Runtime 契约文档与新增 ROADMAP-Real-Resources.md）、start-*.log、tsconfig.tsbuildinfo；⑤ 页面保留（agents/projects/capabilities/settings 骨架展示空态），Dashboard 已连接真实资源概览数据；lint 0/0 / tsc / db:check / build（Real+Mock）/ 8 页面 200 / API 空态与资源概览核对全绿 | ✅ S0 完成，待审批进入 S1 | | 把扁平推荐升级为「可验证任务计划」：七组件流水线 RecommendationPlan → PlanNormalizer（按需求重建 Retriever 候选集，恢复被 Reranker 丢弃的次优候选）→ StepOrderer（类别先验稳定拓扑排序，无先验保持并列）→ DependencyInferer（类别先验 + 文本信号，边仅当 from<to 构造性 DAG，无证据不强行建边）→ PrimarySelector（主选 + 回退链 ≤3，真实 score）→ PlanValidator（确定性：环/悬空→invalid，unmet/重复/低置信→partial）→ TaskPlan；新表 `task_plan`（valid/partial/invalid/failed + validation JSON 快照，一分析一当前计划）+ `plan_step`（primary FK resource_capability 只引用 + alternatives JSON + 推断 outputDescription/expectedInput + isInferred）+ `plan_dependency`（from/to FK + type + 推断 reason）；migration 0005；PlannerProvider 与 AnalysisProvider 同模式（planner-heuristic-v1 唯一实现 + planner-llm-v1 契约桩不注册）；API `POST /api/v1/task-intelligence/plan`（幂等）+ GET plans/[id] + GET analyses/[id]/plan（404=未生成）；DTO/mappers/client + Mock 真实空态双模式；Store plan 区块 + 任务分析页「任务计划」区块（状态徽标/校验 issues/依赖链/步骤流/回退链折叠）；验收：validator 四类问题矩阵全过、「写一篇小红书文案」2 步骤 0 依赖（并列不强行）+ 3 条真实回退候选、「数据周报并整理成表格」3 步骤 3 条 data_flow（文本信号）+ lark-base 重复如实 warning、幂等同 id、追溯 primary→capId→evidenceRef→sourcePath 完整、推断/事实字段分离落库、145/128/487 + 3 analyses 零回归、**lib/runtime 契约零改动（git diff 证明）**、Harness 零修改、lint 0/0/tsc/db:check/build（Real+Mock）/API/页面全过 | ✅ 已完成，待审批 |
| 2026-09-12 | v1.11 | **S1.43 清理 S1.33 时代残留演示 Agent 数据（Agents 页左下角乱码卡片）** | 根因：agent 表残留 2 条 S1.33 时代演示记录（name 存乱码 ?????? Agent、model s1-33-not-exist-model 的测试数据 + 1 条对应 failed run），而 seed 策略早已改为「不再种任何演示数据」，属历史遗留未清；处理：执行 
pm run db:reset（clearAll 仅清 6 张演示业务表），agent / agent_run / capability_definition / agent_capability / project / project_agent 全部归 0，真实资源线零影响（discovered_resource 254 / resource_capability 3334 / resource_analysis 865 / harness_scan 198 / task_analysis 35 / task_plan 3 全保留）；Agents 页面恢复真实空态「还没有 Agent」；lint / tsc / build / 页面实测全绿 | ✅ 已完成（本次修复） |
| 2026-09-12 | v1.12 | **S1.44 新建 Agent 表单「系统提示词专业润色」** | 后端 `db/service.ts` 新增 `polishSystemPrompt`（真实 LLM chat/completions：专业提示词工程师 System Prompt，只输出润色正文、保持原意、语言一致、空/无意义输入如实拒绝不伪造；未配 Key 抛 LLM_NOT_CONFIGURED）；新端点 `POST /api/v1/ai/polish-prompt`（zod 校验 prompt≤4000）；`lib/api/ai.ts` + `lib/services/ai.ts` 暴露 `polishSystemPrompt`；`agent-form.tsx` 系统提示词区新增「专业润色」按钮（Wand2 图标、空输入禁用、润色中 loading、成功回填并显示模型、LLM_NOT_CONFIGURED/VALIDATION 按 code 提示）；**handleError 新增 AiError 分支**（LLM API_ERROR/TIMEOUT/NETWORK → 502 + 真实原因透传，不再吞成笼统 500）；验证：空输入 400、正常输入 200 返回结构化专业提示词（deepseek-v4-flash-0731）、lint/tsc/build/生产页面（/agents/new 按钮渲染）全绿 | 2026-09-12 | v1.13 | **S1.45 个人资料页（真实身份 + 本机环境事实）** | 新增 `user_profile` 表（单行 default：displayName/title/bio/avatarColor/updatedAt）+ migration 0009；`GET/PUT /api/v1/profile`：GET 返回用户自定义信息 + 本机真实事实（os.userInfo/hostname/platform/DB 路径与大小/LLM 生效配置/资源与扫描计数），PUT 仅保存自定义展示字段（zod 校验、avatarColor 枚举、空串=清空）；新页面 `/profile`（个人信息可编辑卡：头像配色 6 色 + 昵称/职位/简介 + 保存；本机环境事实只读卡）；**消除硬编码假身份**：Sidebar UserMenu / TopBar AccountMenu 改为 fetch `/api/v1/profile` 显示真实用户名与主机名，「个人资料/偏好设置」从 toast 占位改为跳转 /profile、/settings；命令面板「工作区」假切换（Acme AI/个人空间）改为只读「本机工作区」；验证：db:migrate/db:check 通过、GET 200 真实数据（Administrator/DESKTOP-J8HRMN8/win32 x64/254 资源/198 扫描）、PUT 保存与清空 200、非法配色 400、lint/tsc/build/生产 /profile 页面渲染全绿 | ✅ 已完成（本次交付） |
| 2026-09-12 | v1.14 | **S1.46 头像本地上传** | `user_profile` 新增 `avatar_path` 列（migration 0010，DB 只存 data/avatars/ 相对路径）；新端点 `POST/DELETE/GET /api/v1/profile/avatar`：上传（dataURL → MIME/大小校验 png|jpeg|webp ≤2MB → 写 data/avatars/<uuid>.<ext> → 替换时删旧文件）、移除（删文件+清引用）、读取（文件流 + Content-Type + 私有缓存）；`getProfile` 返回 `avatarUrl`（带版本号防缓存）；`ProfileForm` 支持点击头像/按钮上传（前端类型+大小预检、上传中 loading、成功回显、移除按钮）；Sidebar UserMenu / TopBar AccountMenu 头像支持显示上传图片（无图回退渐变+首字符）；路径安全：文件操作限定 avatars 目录内（startsWith 校验防穿越）；验证：migration/db:check 通过、非法类型 400、上传 200 且 GET 200 image/png、移除 200、移除后 404、avatarUrl 置空、lint/tsc/build/生产页面全绿 | ✅ 已完成（本次交付） |
| 2026-09-12 | v1.15 | **S1.47 四项候选执行** | ① S1.44+45+46 一起提交并 push：commit `7812ef8`（feat(S1.46)），推送 `95cf5ea..7812ef8 master -> master`（docs/AI Workspace 项目-QA测试方案与报告.md 非本次产物，未纳入）；② 资源详情页新增「使用建议 · 预设问题」：新组件 `components/resources/suggested-prompts.tsx`，按 type 模板确定性生成 3 条预设问题（真实注入 name/description，不调用 LLM），点击复制去 Harness 使用；并修复「相关资源」重复渲染（page.tsx 与 resource-detail.tsx 各渲染一次 → 仅保留 resource-detail 内一处）；③ Agent 模型分组复核：厂商分组 + 搜索过滤已在 S1.33 落地，本次清理 vendorOf 冗余分支（qwen 被前序拦截、开源分支永不命中的历史遗留）；④ 运行失败错误面板复核：Agent 详情页 failed 运行错误卡（formatRunErrorCode 可读标签 + errorMessage + 原始 code）已存在，agent_run 表当前 0 条真实记录，无 failed 样本可验证；验证：lint / tsc / build / 生产重启 / /resources/[id] 预设问题渲染（真实资源 project-evaluation）+「相关资源」唯一 / /agents/new 模型分组（DeepSeek 3 · 智谱 GLM 4 · MiniMax 1 · Kimi 2 · 通义千问 5 · 豆包 2 · 其他 2 = 19）全绿 | ✅ 已完成（本次交付） |
| 2026-09-12 | v1.16 | **S1.48 页面进入时自动扫描** | store 新增 `maybeAutoScan` action + 15 分钟阈值常量 + inFlight 并发锁：进入 Dashboard / Resources 页面时静默检查上次扫描时间，从未扫描或距上次扫描超 15 分钟才触发增量扫描，完成后 dispatch `aiw:rescan` 复用现有页面刷新链路；自动扫描失败静默（不弹 toast、不打断浏览），保留手动「重新扫描」入口；验证：lint / tsc / build 全绿，生产重启后打开 /resources 自动触发（scanId b89b9b89 → cda18ea4），totalResources 保持 254 幂等无重复；同时输出《候选资源推荐重构方案（S1.49）》待审批 | ✅ 已完成（本次交付） |
| 2026-09-13 | v1.17 | **S1.49 功能评估清单第一批** | ① 能力索引页新增搜索（匹配能力/资源名/证据引用/类别名）+ 类别过滤 + 分页（100/页，>100 条显示翻页）；② 扫描变更提示：discovered_resource 新增 created_at（migration 0011/0012，存量行 NULL 不误报），扫描后统计 addedResources，自动扫描有新增时低打扰 toast、手动扫描 toast 显示新增数；③ 纠正：任务智能「技能创建建议」已在 S1.37 实现（SkillProposalBlock + generateSkillProposal），无需重复开发；验证：lint / tsc / build 全绿；scan API addedResources=0（存量 254 无新增不误报）、total 254 幂等；浏览器实测搜索「代码生成」52 条（分类名可命中）、类别过滤/空态/计数正常 | ✅ 已完成（本次交付） |
| 2026-09-13 | v1.18 | **S1.50 四项候选执行** | ① 提交推送：`e4eaca8`（S1.47）+ `05a771a`（S1.48+S1.49），push 成功 `7812ef8..05a771a`；② 资源收藏 Pin：store persist 升 v6（partialize 增 pinnedResourcePaths；migrate 旧版仅留 timeRange、领域数据明确丢弃），toggleResourcePin(sourcePath)；资源列表行内 Pin 按钮 + 置顶排序 + 名称旁图标，详情页「置顶/已置顶」按钮；③ 导出 CSV/JSON：新 API `GET /api/v1/resource-discovery/export` 与 `/api/v1/resource-capabilities/export`（format=csv|json，Content-Disposition 下载，服务端排除用户隐藏、CSV 转义），新公共组件 export-menu.tsx，resources 页与 capabilities 页接入；④ 预设问题统一：抽 `lib/prompts.ts`（presetPromptsForResource 类型模板 3 条 + presetQuestionFromDescription 描述转指令 + cleanPromptDesc），suggested-prompts.tsx 与 skill-suggestions.tsx 两处调用点统一；验证：lint / tsc / build 全绿；生产重启（端口占用杀净）；export API：资源 JSON 253（254−1 隐藏）、CSV 254 行、能力标签 JSON 970（当前有效）、CSV 971 行；浏览器：Pin 点击→persist v6 pinned=1、刷新保留+置顶优先、详情页已置顶、取消置顶=0、导出菜单 CSV/JSON、任务智能页 console 无 error | ✅ 已完成（本次交付） |
| 2026-09-13 | v1.20 | **S1.52 技能画廊交互打磨** | 复核：分类切换 / 悬停预览 / 复制在 S1.x 已实现（数据源 Hermes 8 个真实技能，`/resources?harness=hermes` 同源）；本次打磨 ① 悬停预览由「卡片上方外弹」改为「卡片内嵌覆盖」（任何行无方向溢出，z-10 覆盖层含完整说明 + 复制按钮，其余区域点击穿透进详情）；② 移动端无 hover 时复制不可达 → 卡片标题行新增常驻复制按钮（lg:hidden）；验证：lint/tsc/build 全绿；浏览器实测 hover 后 overlay visible=1 且含「复制使用方式」、分类切换 media→仅 booru-image-api、复制按钮存在 | ✅ 已完成（本次交付） |
| 2026-09-13 | v1.19 | **S1.51 四项候选执行** | ① 任务分析历史管理：`db/repository.ts` listTaskAnalyses/deleteTaskAnalysisById（连带删 task_requirements/resource_recommendations/task_plans/task_analyses）、`db/service.ts` deleteTaskAnalysis（NOT_FOUND）、API `DELETE /api/v1/task-intelligence/analyses/[id]`、client http.del、store loadTaskAnalysis/deleteTaskAnalysis（analysisId 标识；删当前态即清空 current/plan）、`history-panel.tsx` 列表+回看+删除（hover 显现）；② 能力索引 50/页 + PinnedStrip：INDEX_PAGE_SIZE 100→50、`DiscoveredResourceQuery.ids`（sourcePath 精确取回、忽略分页/搜索、排除隐藏）、`resources/route.ts` ids 解析、client ResourceListQuery.ids、`pinned-strip.tsx` 置顶条跨页可见；③ Dashboard 真实分布条 + 详情相邻导航：`distribution-bars.tsx`（资源类型分布 + 能力标签分类分布，纯 CSS，970 能力合计一致）、`getAdjacentResources`（行内排序定位 last_modified DESC,name ASC、排除隐藏，避开 drizzle gt/lt 类型坑）、API `GET /resources/[id]/adjacent`、详情页上一条/下一条（首条 disabled）；④ 命令面板全局搜索：重写 `command-palette.tsx`（打开懒加载能力索引平铺、输入防抖 280ms 服务端搜资源、分组：资源→能力标签→导航→工作区，点击跳详情） | ✅ 已完成（本次交付） |

## 当前阶段

**S1.52 技能画廊交互打磨（悬停预览内嵌化 / 移动端常驻复制）**（已完成；**不自动进入下一阶段**，待审批）

---

## 一、已完成内容（Phase 2 — Resource Intelligence MVP 实施）

### 1. 领域模型（用户三项修正全落地）

- `resource_analysis` 表保留**历史分析记录**（一次资源可多次分析）：analyzerVersion / createdAt / analyzedAt / inputFingerprint / resourceMtime / isCurrent / errorCode / errorMessage / summary；唯一约束 `uq_analysis_resource_fp_version(resourceId,inputFingerprint,analyzerVersion)`——同一版本 + 同一输入指纹不重复生成；isCurrent 标记当前有效分析。
- `resource_capability` 表：capability / category / keywords(JSON) / confidence / **evidenceRef + evidenceSnippet（可回溯真实文件，硬性要求）** / inputContext(JSON) / executionHint；唯一约束 `uq_capability_analysis_cap(analysisId,capability)`。
- **取消「能力标签 ≥150」硬指标**；不拆分不制造，标签一律带证据。
- HeuristicAnalyzer 为唯一实际分析器；LLMAnalyzer 仅接口契约（调用返回 PROVIDER_NOT_AVAILABLE，不注册）。

### 2. 分析层（lib/analysis/）

- `types.ts`：AnalysisProvider 接口（id/strategy/analyze → AnalysisOutcome）。
- `fingerprint.ts`：computeInputFingerprint = sha1(sourcePath|lastModified|metaHash)；computeMetaHash。
- `reader.ts`：DocumentReader 只读解析——`TEXT_EXTENSIONS` 白名单（.md/.markdown/.txt/.json/.toml/.yaml/.yml），非白名单返回 DOCUMENT_NOT_FOUND（对应 17 个 failed 的真实状态：.py 无契约等）；正文上限 32KB、预览 2KB、提取 headings/references/frontmatter；纯读取不落盘。
- `heuristic.ts`：heuristic-v1 确定性规则——description 主能力（conf=0.72，证据 SKILL.md#description）+ headings 补充（conf=0.5，证据 #heading）+ 类型兜底（conf=0.3）；过滤折叠符、否定/边界类 heading（不适用/注意/禁止/回退…）、非语义文本。
- `registry.ts`：ANALYZERS=[heuristicAnalyzer]、CURRENT_ANALYZER_VERSION="heuristic-v1"。

### 3. 增量分析与历史语义（db/service.ts runIncrementalAnalysis）

- 指纹相同且已 analyzed 且非 force → skipped；新增 / 变化 / failed / force → 重跑。
- 成功：upsert 分析记录 + 先删旧标签再重插 + markOtherAnalysesNotCurrent（历史保留 isCurrent=false）。
- 失败：记录 failed 并保持旧 current 分析可用（新指纹失败不覆盖旧结果）；**同指纹覆盖失败时旧标签一并失效**（数据一致性修复，杜绝 failed 残留旧能力标签）。
- getAnalysisStatus / getResourceInsight / listCapabilityIndex / matchResourcesForTask（派生打分不落库）。

### 4. API 契约（5 端点）

- `POST /api/v1/resource-analysis/run`（body {force?, resourceIds?}）→ AnalysisRunResult
- `GET /api/v1/resource-analysis/status` → AnalysisStatusSummary
- `GET /api/v1/resource-analysis/resources/[id]` → ResourceInsight（params Promise 模式）
- `GET /api/v1/resource-capabilities` → 按类别分组能力索引
- `GET /api/v1/resource-capabilities/match?task=` → 任务→资源匹配
- DTO / mappers 追加（lib/api/dto.ts + mappers.ts）；Mock service 真实空态（status 全 0 / insight 抛 ApiError NOT_FOUND / 不伪造）。

### 5. 前端（Store + UI）

- `stores/workspace.ts`：analysis 区块（status/capabilityIndex/insight/matchResult/lastRun/running/loading/error）+ 5 actions；persist partialize 不变（仅 timeRange，领域数据不入 localStorage）。
- `/resources/capabilities`：状态卡（总资源/已分析/失败/能力标签/版本）+ 增量分析按钮 + 任务→资源匹配 + 类别分组索引。
- 资源详情页：`components/resources/analysis/insight-panel.tsx` 能力区块（状态徽章/总述/能力标签卡含证据与执行提示/历史/未分析时「分析此资源」按钮）。
- 导航：本地资源组新增「Resource Capabilities」。

### 6. 验证结果（全部通过）

- lint 0 error 0 warning；tsc --noEmit 0 错误；db:check schema 一致；build Real + Mock（NEXT_PUBLIC_USE_MOCK=1）均通过。
- **最终态**：145 资源 / 128 analyzed / 17 failed / 0 expired / **487 能力标签（全部 evidenceRef+evidenceSnippet 可追溯）**。
- 幂等：第二次非 force 跑 processed=17（仅 failed 重试）、skipped=128、analyzed=0（成功资源零重复）。
- 增量：touch 一个 SKILL.md mtime → 重扫 → 增量分析 processed=22（仅变化资源）、skipped=123，非全量重跑。
- 一致性：failed-with-caps=0（修复后无 failed 残留标签）。
- 只读：实现全程仅 fs.readFileSync；mtime touch 测试后已恢复原值。
- Mock：客户端 chunk 确认 mock service 内联（NEXT_PUBLIC_USE_MOCK=1 build），API 端点始终连 SQLite（设计如此）。
- API 冒烟：status / capabilities / match（中文任务匹配 doubao-ecommerce-proposal 等）/ insight（含 evidence 追溯）/ run 幂等全过；页面 /resources、/resources/capabilities、/resources/[id] 全部 200。

## 二、已完成内容（P4-4 交付增强实施 · 历史）

### 1. Docker 化（P4-4 核心）
- [x] `Dockerfile` 多阶段构建（deps 全量 → build → runner）：better-sqlite3 prebuilt 优先、g++/python3 编译兜底；构建期 `mkdir data` 保证不依赖本地已有数据库；runner 仅 `npm ci --omit=dev`（tsx 已在 dependencies，容器内 db:init/db:migrate/db:check 可用）
- [x] `docker-compose.yml`：`./data:/app/data` 绑定挂载（**SQLite 持久化目录，禁止写入临时容器层**）、`DATABASE_URL=/app/data/ai-workspace.db`、`NEXT_PUBLIC_USE_MOCK=0`、restart=unless-stopped + healthcheck
- [x] `.dockerignore`：node_modules/.next/data/logs/docs/scripts/.git 等排除，镜像构建不依赖本地开发状态
- [x] **容器启动语义**：`CMD = db:init && start`——首次启动自动 migration + 空库 seed；后续启动 migration 幂等、数据存在时跳过 seed（重启后数据正常保留）
- [x] ⚠️ **验证边界**：本机未安装 Docker（环境事实），Dockerfile/compose 已按契约编写但**未在真实 Docker 引擎实测**；已在 README 给出可执行验证步骤，待有 Docker 环境机器上验证

### 2. README 完整化
- [x] 重写 `README.md`：项目简介、功能边界（已实现能力矩阵 / 明确未实现能力清单）、环境要求、安装、开发启动、Real/Mock 双模式（编译期开关 + 重构建说明）、SQLite 初始化（migration/seed/reset/db:init 职责表 + 防漂移规则）、构建、生产启动、Docker 启动（持久化契约）、数据文件位置汇总、架构简述（分层 + 领域模型 + 时间窗口口径）、CI 门禁、已知边界

### 3. CI 最小质量门禁
- [x] `.github/workflows/ci.yml`（push/PR）：checkout → setup-node 22（cache npm）→ `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm run db:init` + `npm run db:check`（**DATABASE_URL=./data/ci.db 独立路径，不依赖本地已有数据库状态**）→ `npm run build`
- [x] 本地等价命令：`npm run ci`（lint + tsc + build）
- [x] ⚠️ 验证边界：项目无 Git 远程（git remote 为空），workflow 无法在真实 GitHub Actions runner 执行；本地已按相同顺序完整跑通（lint/tsc/db:init/db:check/build 全绿）

### 4. 从零初始化脚本
- [x] 新增 `db/init.ts`（`npm run db:init`）：migrate（幂等）→ 若 `agent` 表为空则 runSeed（幂等 upsert），数据存在则跳过——本地开发与 Docker 容器共用的干净环境初始化入口
- [x] `package.json`：tsx 由 devDependencies 移至 dependencies（容器运行时 db 运维脚本依赖）；新增 `db:init`、`ci` script
- [x] **从零初始化实测**：备份移除 data/ → `db:init`（migrate+seed: 5/18/49/3/6/92）→ `db:check` 通过 → 二次 `db:init`（seed 跳过，重启保留语义）→ `build` 通过 → 生产启动 200 → 页面访问正常；备份已清理

### 5. 稳定性回归（P4-4）
- [x] **Real 生产回归**：Dashboard 88/+2100.0%/90.9%/1.7M（与 P4-3 基线一致）；Projects 36/47/17 次；Project Detail 2/38/87%/733.6K；Agents 5 卡片 26/18/30/12/6；Capabilities 18 资产/49 装配；Agent Detail 运行历史 26 次/80.8%——全部同源
- [x] **写操作落库**：API attach tool-db-reader → agent-support 装配 11→12（服务端 UUID 201）→ 浏览器硬刷新持久化保持 → detach 还原 11（数字不污染基线）
- [x] **persist**：localStorage 仅 `{timeRange:"30d"}` version 5（UI 偏好）
- [x] **Mock/Real 双模式**：Mock 独立构建 + 启动，Dashboard 数字与 Real 完全一致（88/90.9%/1.7M）——双模式回滚通道可用
- [x] **seed 天级时间锚保持**：未重新引入相对时间漂移（db/seed.ts 与 lib/mock-data/seed.ts 未再改动）
- [x] lint 0 error 0 warning / tsc 0 error / build（Real + Mock 双模式）通过 / 控制台 0 error

---

## 三、已完成内容（P4-3 实施 · 历史）

### 1. 服务端统计端点化（P4-3 核心）
- [x] `db/repository.ts` `runsStats` totals 扩展 **avgDurationMs**（COALESCE AVG(duration_ms)）+ **lastRunAt**（MAX(started_at)），daily 保持按日聚合（successRate 1 位小数）
- [x] `app/api/v1/runs/stats/route.ts` 新增 **`?agent=<id>` 单 Agent 过滤**（保留 `agents=`/`project=`），from/to 校验沿用 `parseTimeRange`（成对必填、from<to → 400 VALIDATION_ERROR）
- [x] **统计由 SQLite/Repository 直接聚合**：totals + daily 全服务端计算，前端不再拉全量 runs 内存聚合

### 2. DTO / Domain 分离扩展
- [x] `lib/api/dto.ts` `RunsStatsDTO.totals` 增 avgDurationMs/lastRunAt；`lib/api/mappers.ts` 新增 `toRunsStats`（successRate 100→1、daily 补 label MM-DD）；`lib/types.ts` 新增 domain `RunsStats`/`DailyStat`（label 字段）

### 3. 前端服务层（去掉全量拉取）
- [x] 新建 `lib/services/runs.ts`：双模式入口 `fetchRunsStats`/`fetchRecentRuns`/`fetchProjectRuns` + `export type RunsStatsQuery`
- [x] 新建 `lib/services/http/runs.ts`：stats 端点 + `/runs?pageSize&sort=startedAt:desc` 明细分页；`fetchRecentRuns(pageSize=10)` 全局倒序、`fetchProjectRuns(agentIds, pageSize=8)` 按 agents= join
- [x] 新建 `lib/services/mock/runs.ts`：与 SQLite 同构的内存聚合（from/to 过滤 → totals{含 avgDurationMs/lastRunAt} + daily 带 label，projectId 经 mockState.projectAgents 派生）
- [x] 新建 `lib/services/mock/state.ts`：Mock 内存数据层（mockState{runs,projects,projectAgents} + pushRun + resetMockState），Mock 写操作与统计聚合同源
- [x] **删除全量路径**：`lib/services/agents.ts` 与 `http/mock/agents.ts` 的 `fetchRuns`（pageSize=1000）双双移除；新增 `fetchAgentRuns(agentId)`（GET `/agents/:id/runs?pageSize=200`）；`mock/agents.ts` runAgent 走 `pushRun`、`mock/projects.ts` create/attach/detach 落地 mockState、`demo.ts` Mock reset 改 `resetMockState()`

### 4. Store 重构（`stores/workspace.ts` 整文件重写）
- [x] state：`runs: AgentRun[]` → `recentRuns`（全局最近 10）+ `agentRunsById` + `projectRunsById` + `stats: StatsCache | null`；新增 `fetchAgentRuns`/`fetchProjectRuns`（按需拉取、防重）
- [x] `StatsCache = { range, global, previous, byProject, byAgent }`；`loadWindowStats` 用 `windowBoundsForRange(days)` + `(days, days)` 计算当前/前一窗口 from/to 并发拉取（**唯一窗口实现，无第二套日期计算**）；`loadEntityStats` 项目 all+recent30d（固定 30 天窗口）、Agent 全部时间
- [x] 写操作联动：`runAgent` 后刷新 global/previous；`createProject/attach/detach` 后 `refreshProjectStats`；`setTimeRange` 只刷窗口统计
- [x] **删除全部统计 selectors**（selectRunsInRange/selectPeriodStats/selectDailyStats/selectAgentStats/selectRunsInProject*/selectProjectStats），保留 `windowBoundsForRange`/`selectAgentsInProject`/`sortProjectsByActivity`；新增导出 `EMPTY_RUNS_STATS`（组件防御默认值）
- [x] persist 保持 **version 5**：partialize 仍仅 `{timeRange}`（state 形状变化但持久化字段未变，无需升版）

### 5. 组件适配（统计 UI 对外行为不变）
- [x] dashboard：指标卡用 `stats.global.totals`（runs/successRate/failed/tokens），环比 `stats.previous`，趋势图 `stats.global.daily`，最近活动 `recentRuns`
- [x] projects-overview / projects 列表：`stats.byProject[p.id].recent30d`（runs/successRate/lastRunAt 兜底 updatedAt）+ 实时 projectAgents 数
- [x] project detail：摘要 `byProject.all`（agentCount 用 projectAgentsOf.length）、30 天行 `recent30d`、Agent 行 `byAgent`、最近运行 `projectRunsById`（hydrate 后 fetchProjectRuns）
- [x] agents 列表/详情：卡片 `RunsStats` 类型 + `byAgent`；运行历史 `agentRunsById`（hydrate 后 fetchAgentRuns）
- [x] trend-chart：`DailyStat` 类型来源改 `@/lib/types`

### 6. seed 时间锚稳定化（顺手修复，用户 P4-3 批准）
- [x] `db/seed.ts` 与 `lib/mock-data/seed.ts`：`Date.now()` → **今天 0 点天级锚**（注释 P4-3 修复意图）——同一天内 db:reset 完全可复现；跨日整体平移、30 天窗口 run 集合不变
- [x] **修复效果**：两次 `db:reset` 后统计完全一致（88/80/8/90.9%/1698119）；**Mock 与 Real 数字完全对齐**（P4-2 遗留的 92/91.3 vs 91/91.2 差异消除）

### 7. 验证（全部通过）
- [x] lint 0 error 0 warning / tsc 0 error / build 通过（Real 与 Mock 两模式独立构建）
- [x] db:reset 两次复跑统计完全一致（5 agents/18 definitions/49 assemblies/3 projects/6 projectAgents/92 runs；30d stats 88/80/8/90.9%/1698119，daily 27 天，项目 38/48/18、Agent 26/18/30/12/6 全同）
- [x] API 冒烟：stats 30d/项目/Agent 维度 totals+daily 正确；单日窗口、空窗口（lastRunAt=null）、跨月正常；缺 to / 倒置 from/to → 400 VALIDATION_ERROR；`/runs?pageSize=10` 分页明细 total=92
- [x] Real 生产回归：Dashboard 指标（活跃 3/共 5、运行 88 +2100.0%、成功率 90.9% 8 失败、Tokens 1.7M +2216.0%）与 DB 同源；项目区 36/47/17 次与 Project Detail 30 天行一致；Agents 卡片 26/18/30/12/6 与 DB 一致；**attach「内容撰稿助手」→ Agent 2→3/总运行 38→68/成功率 87→90%/30 天 36→65 实时刷新，detach 确认后回到 2/38/87%/36（写操作真实落库 + stats 实时联动）；attach 后硬刷新从 SQLite 恢复（3/68/90% 保持）**；时间范围切 7d（16/-50.0%/93.8%/344.4K）+ 硬刷新持久化；localStorage 仅 `{timeRange:"7d"}` version 5；控制台 0 error/warning
- [x] 网络请求核查：**无任何 pageSize=1000 请求**（旧全量路径已彻底移除）
- [x] Mock 独立构建 + 启动验证：Dashboard/Projects 与 Real 完全一致（7d 16/-50.0%/93.8%/344.4K；项目 36/47/17），控制台 0 错误——双模式回滚通道可用

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


## 四、环境检查记录（2026-09-08，Phase 2 实测更新）

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

## 五、已完成内容（P4-1 纯设计 / 零代码修改 · 历史记录）

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

## 六、验证结果（P4-1 纯设计）

| 检查项 | 结果 |
| --- | --- |
| 代码修改 | ✅ 零修改（仅新增 `docs/P4-1-Backend-Architecture-API-Design.md`） |
| lint / tsc / build | ✅ 无需执行（无代码改动；基线保持全绿） |
| 契约一致性 | ✅ 18 个现有 Service 签名逐项对照 API Contract，替换路径签名零改动 |
| 范围合规 | ✅ 未创建数据库 / 未改业务代码 / 未建 Route Handler / 未引入 ORM / 未接 AI API |

## 七、技术决策记录（ADR 简表）

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
| D48 | **统计端点化收尾**：Dashboard/Project/Agent 统计正式走 `/runs/stats?from&to`（服务端 SQL 聚合），删除前端全量 runs 拉取 + 内存聚合 selectors | ✅ 落地：网络请求核查无 pageSize=1000；组件 UI 行为不变 |
| D49 | **Mock 内存数据层**（mock/state.ts mockState + pushRun + resetMockState）：Mock 写操作与统计聚合同源，语义与 Real 的 SQLite 权威源对齐 | ✅ 落地：Mock 与 Real 数字完全一致（P4-2 差异消除） |
| D50 | **seed 天级时间锚**（Date.now() → 今天 0 点）：db:reset 同日内完全可复现、跨日整体平移不改变 30 天窗口 run 集合 | ✅ 落地：两次 reset 统计逐字节一致；消除 P4-2「seed 毫秒锚跨窗口边界漂移」 |
| D51 | **StatsCache 缓存分层**：global/previous（随 range）、byProject/byAgent（实体维度，不随 range）；写操作只刷新受影响缓存（runAgent→窗口、attach/detach→项目） | ✅ 落地：统计 UI 实时联动且无冗余请求 |
| D52 | **db:init 从零初始化入口**：migrate（幂等）→ 空库 seed / 有数据跳过；本地与 Docker 容器共用，语义 = 「安装 → 初始化 → 启动」 | ✅ 落地：删库实测 migrate+seed 5/18/49/3/6/92，二次 init seed 跳过 |
| D53 | **Docker 多阶段构建 + 数据卷**：runner 仅生产依赖（--omit=dev）；SQLite 持久化目录为卷挂载点 `./data:/app/data`，数据库禁止写入临时容器层；容器入口 `db:init && start` | ✅ 落地（文件级；本机无 Docker 未引擎实测，README 附验证步骤） |
| D54 | **CI 门禁不依赖本地数据库**：DATABASE_URL 指向 CI 独立路径 `./data/ci.db`，db:init + db:check 在干净环境执行；workflow 顺序 = ci → lint → tsc → db:init/check → build | ✅ 落地（本地等价命令全绿；无 Git 远程，workflow 未在真实 runner 执行） |
| D55 | **tsx 移至 dependencies**：容器运行时 db 运维脚本（init/migrate/check）依赖 tsx，生产镜像 `npm ci --omit=dev` 后仍可用 | ✅ 落地：Dockerfile runner 阶段依赖此决策 |
| D56 | **Runtime 编排层**（P5-1）：Service.runAgent 与 Provider 之间新增 Runtime（lib/runtime/*）；Service 不依赖 Provider、Provider 选择由 Runtime 内部基于 Agent.model 决定 | ✅ 设计落地：P5-1 文档 §二/§三/§七 |
| D57 | **Run 状态机五态**（P5-1）：queued/running/succeeded/failed/cancelled + 合法转换 + 终态不可逆 + 单 Agent 串行 409；存量 success→succeeded 走数据迁移；统计分母（succeeded+failed）显式定义 | ✅ 设计落地：P5-1 文档 §五 |
| D58 | **Capability 两层只读消费**（P5-1）：Runtime 实时读 Definition(资产)+AgentCapability(装配) 构建 ExecutionContext；四类职责（Skills 描述注入/Memory 占位/Rules 约束注入/Tools 清单注入）；无缓存 = 无第二数据源 | ✅ 设计落地：P5-1 文档 §六 |

## 八、发现的问题

1. **时区是窗口一致性的最大隐藏风险**（设计前置解决）：前端本地时区 vs 服务端 UTC 会导致「含今天 N 自然日」漂移 → 契约强制客户端传 `from/to` 显式边界（或 window+tzOffset），服务端纯执行；测试覆盖跨日。
2. **Store persist 与后端权威的职责冲突**（P4-2 必改点）：领域数据改为后端权威后，`partialize` 必须收窄（仅 timeRange 等 UI 状态），否则「前端持久化 vs 后端」双源竞争——已在 P4-2c 计划并注明最小改动清单。
3. **统计 selectors 依赖全量 runs 内存计算**（渐进改造）：P4-2 先全量兼容（小数据），stats 聚合端点为正式目标，避免一次性大改。
4. **better-sqlite3 native 构建风险**（Windows）：备选 node:sqlite / libsql 已列入风险表，Drizzle 驱动可一行切换。
5. 既有遗留不变（截图工具链 / link-preload warning，均 P3）。

### P4-2 实施中实际遇到的问题
1. **capability_definition.created_at NOT NULL vs 前端 Domain 缺省**：首跑 seed 报 NOT NULL 约束失败 → 补齐 18 个定义 createdAt/updatedAt（-88d~-25d 分布），重跑幂等通过。
2. **better-sqlite3 生产服务器进程曾被环境回收**（非代码缺陷）：后台 bash 任务生命周期限制 → 改为 cmd 隐藏窗口方式托管（已稳定）；代码零改动。
3. **seed 相对时间边界漂移**（已知特性）：Mock 92 vs Real 91 因 seed 随机 startedAt 跨 30 天窗口边界，非口径问题，DOM/Store/DB 三者始终同源自洽。

### P4-3 实施中实际遇到的问题
1. **PowerShell 内联 node -e 不可靠**：反引号/复杂引号模板字符串两次 SyntaxError → 改 Write 脚本文件再 tsx 执行（`scripts/tmp-stats-check.ts` 验证 repository.runsStats，验证后已删除）。
2. **better-sqlite3 在 .cjs 脚本 require 报 `Database is not a constructor`**：改走项目自身 repository 验证（更贴近真实端点口径），临时脚本已清理。
3. **Mock 首载 hydrate 慢于 1.5s 时指标区短暂空白**（非缺陷）：Mock 模式 hydrate 拉取 5 agents + 3 projects + 13 stats 请求；reload 后 hydrate 完成即正常，与 Real 数字一致。截图/验证以 hydrate 完成后为准。
4. **Radix Selector（时间范围）在 bu 自动化会话中 ref/坐标点击不弹菜单**（工具链问题，非产品缺陷）：改用 pointerdown/up + click 事件序列或 JS dispatch 后正常；P4-2 已验收该交互，P4-3 未改相关代码。
5. **30 天窗口统计 91 → 88 的口径修正（关键结论）**：P4-2 的 91 是「seed 毫秒锚 + now 日内时分」导致 daysAgo=29 的 run（属窗口外第 30 天）漏入窗口的边界误差；天级锚修复后回到正确口径 **88**（含今天 30 自然日 = daysAgo 0..28；previous 窗口固定 4 个 run → 环比 +2100.0%）。**这是 seed 稳定性修复的预期结果，非回归**；Mock/Real 同构后数字完全一致。


## 九、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| **runAgent 为服务端演示桩**（86% 成功随机，真实落库；非真实 AI Runtime） | 中 | 用户明确排除范围；接口契约已按真实语义设计，未来接 AI 服务仅替换 service 内实现 |
| **stats daily 日期为 UTC 日期口径**（substr(started_at,1,10) 分组，与本地日期最大差 8 小时；totals 与 daily 求和严格一致） | 低 | 既有行为（P4-2 起）；契约以显式 from/to 绝对边界为事实输入，daily 仅作趋势展示；未来如需要可扩展服务端按客户端时区分组参数 |
| **SQLite 生产部署（serverless）限制** | 低 | 演示/单机部署满足；文档标注未来换托管 DB |
| 旧 localStorage 脏数据 | 低 | persist v5 migrate 明确丢弃领域字段；db:reset 一键重建 |
| better-sqlite3 原生模块在部分平台构建失败 | 低 | 已构建通过（Windows/Node 22）；node:sqlite/libsql 兜底 |



### Phase 2（Resource Intelligence）遗留

- 17 个 failed 资源为真实状态（.py 无统一契约、Claude Temp 临时目录无 CLAUDE.md、插件无 manifest），每次增量 run 会重试 failed（属预期「重试失败」语义，未加失败冷却，避免 failed 永不重试）。
- 扫描快照与文件系统 mtime 差异：增量判定基于扫描记录的 lastModified（需先重扫才感知文件变化），设计如此（扫描=幂等 upsert 索引）。
- 浏览器自动化空间本阶段暂不可用（browser_use_space_disabled_or_unavailable），生产交互验证降级为 HTTP 页面 200 + 端点冒烟 + 产物级检查；非应用问题。

## 十、下一步计划

1. **等待审批**：验收《P5-1 AI Runtime Architecture & Contract》（纯设计：Runtime 编排层 / 状态机 / Capability 映射 / Provider 接口 / Streaming 契约 / 错误与成本模型 / Mock→Real 路径）。
2. 执行任何内容前：先出方案 → 审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P5-1 收尾**：Git 提交（本次执行）已完成。
4. **P5-2（已完成）**：按 §十三 实施最小闭环——Runtime 接口 + CapabilityLoader + MockProvider + Run 状态机（migration：success→succeeded + 新列）+ `runAgent` 改经 Runtime + UI 徽章扩展 + 全量回归；**不接真实 LLM / 不实现 Streaming / Tool / Memory**。



### Phase 2 下一步（待审批）

1. **等待审批**：验收本阶段《Phase 2 Resource Intelligence MVP 交付汇报》。
2. 可选后续方向（未获批准前不实施）：能力索引的 LLMAnalyzer 真实接入（本阶段仅为契约桩）；资源执行 / MCP / 编辑删除 / 远程部署；failed 重试冷却与增量性能优化；更多文档类型解析。

## 十一、待审批事项

- [x] **A21**：批准《P4-1 Backend Architecture & API Design》（ORM=Drizzle+better-sqlite3 / 统计端点化 / 时区契约 / 三职责 seed-migration 等结论）✅ 已批准
- [x] **A22**：批准进入 **P4-2 实施**（DB+Repository → Route Handlers+Service → 前端同名替换 + persist 收窄 → 全量回归 → Mock/Real 双开关）✅ 已批准并完成
- [x] **A23**：验收《P4-2 交付汇报》✅ 已验收（批准进入 P4-3）
- [x] **A24**：审批下一阶段方向 ✅ 已选定 P4-3 统计端点化收尾
- [x] **A25**：验收《P4-3 交付汇报》✅ 已验收（批准进入 P4-4 交付增强）
- [x] **A26**：验收《P4-4 Delivery & V1 Release Candidate Report》✅ 已验收（批准进入 P5-1 AI Runtime 设计）
- [x] **A27**：验收《P5-1 AI Runtime Architecture & Contract》并批准进入 P5-2 最小实施（编排层 + 状态机 + MockProvider；明确不接真实 LLM）✅ 已批准并完成

---

## P5-2 AI Runtime 最小实施（已完成）

### 一、当前阶段

**Phase 5 · Stage 2（P5-2）**：AI Runtime 最小实施——将 `runAgent` 演示桩正式迁移为 `Service.runAgent → Runtime.execute → CapabilityLoader → MockProvider → RuntimeResult → Run 持久化`；Run 五态状态机落地；不接任何真实 LLM / Streaming / Tool / Memory。

### 二、本次修改内容

**新增（4 文件）**
- `lib/runtime/contracts.ts`：Runtime 全部契约——五态状态机（`RUN_TRANSITIONS` / `canTransition` / `isFinalRunStatus`）、`RuntimeRequest` / `ExecutionContext` / `RuntimeResult` / `RuntimeEvent` / `RuntimeError`（10 错误码）/ `TokenUsage` / `ModelConfig` / `CapabilitySource`（数据源无关注入）/ `RuntimeProvider` 接口 / `ProviderExecuteResult`（含 durationMs 与 provider error）/ `RunPatch` / `normalizeRunStatus`
- `lib/runtime/capability-loader.ts`：`buildExecutionContext`——只消费 `enabled && lifecycle=active` 装配，按 type 解构 rules/tools/skills/memoryHints，组装 systemPrompt（注入顺序：基座 → 规则区 → 技能区 → 记忆 stub → 工具区 JSON）；`assembledCount` 含全部装配
- `lib/runtime/mock-provider.ts`：唯一 Provider——86% 成功 / 14% 失败（P5-1 §12 演示桩语义）、8s~230s 模拟时长、900~38k tokens、`stream()` 抛错占位（不进执行路径）
- `lib/runtime/runtime.ts`：编排层——`createRuntime` / `createProviderRegistry`；执行链：实时构建 ExecutionContext → 注册表选 Provider → 归一化消息 → Provider.execute → Provider error 归一化 failed / 成功组装 RuntimeResult

**修改（12 文件）**
- `db/schema.ts`：agent_run 加列（model / provider / input_tokens / output_tokens / error_code / error_message，最小集）
- `drizzle/0001_dry_terror.sql`：加列 + 数据迁移 `UPDATE agent_run SET status='succeeded' WHERE status='success'`（幂等）
- `db/repository.ts`：新增 `updateRun`（状态迁移落库）、`getRun`、`listRuntimeAssemblies`（join Definition 只读）；`runsStats` 聚合 succeeded 条件 `'success'` → `'succeeded'`
- `db/service.ts`：`runAgent` 重写为两阶段（insert queued → running → Runtime 执行 → `canTransition` 校验 → 终态 updateRun 含 usage/model/provider/error + agent lastRunAt）；并发 queued/running 409 拦截；Real CapabilitySource（SQLite 事实源）+ Real Runtime 注册表
- `app/api/v1/agents/[id]/runs/route.ts`：`await service.runAgent(id)`
- `lib/services/mock/agents.ts`：`runAgent` 经 Mock Runtime 编排（Mock CapabilitySource = 静态 seed 装配；RuntimeResult → pushRun）；不再直接随机造数
- `lib/services/mock/runs.ts`：统计 `'success'` → `'succeeded'`
- `lib/mock-data/seed.ts` / `db/seed.ts`：seed runs 状态枚举 `'success'` → `'succeeded'`（两处时间锚逻辑不动）
- `lib/types.ts`：`RunStatus` 五态 + `runStatusMeta` + `normalizeRunStatus`；`AgentRun` 补可选 Runtime 字段
- `components/dashboard/activity-list.tsx`：STATUS_META → `runStatusMeta` + 五态 dot
- `app/(workspace)/agents/[id]/page.tsx`：RunBadge 五态 + toast 判断 `succeeded`
- `lib/api/dto.ts` / `mappers.ts`：AgentRunDTO 补可选字段 + `toAgentRun` 映射 + `normalizeRunStatus`

**新增验证脚本**：`scripts/p52-verify.ts`（状态机合法/非法迁移、CapabilityLoader 三场景、Mock 完整执行链）

### 三、已完成内容

1. Runtime 接口落地（五态状态机 + 请求/上下文/结果/错误/Token/Provider 契约）
2. CapabilityLoader：enabled+active 才进执行上下文；archived 不进入；实时构建无缓存
3. MockProvider：86%/14% 演示语义 + 模拟时长/tokens；唯一 Provider 经注册表注册
4. Run 状态机：queued→running→succeeded|failed|cancelled；终态不可逆；并发 409
5. 数据迁移 success→succeeded（92 条全部转换，无残留）；统计口径 succeeded+failed 不变
6. runAgent 全链经 Runtime 编排（Real + Mock 双实现同构）
7. UI 五态展示（Dashboard 活动列表 + Agent Detail RunBadge）
8. Mock / Real 双模式构建与运行验证

### 四、验证结果（验收 A–H）

| 验收项 | 结果 |
| --- | --- |
| A 状态机合法/非法迁移 | ✅ 脚本断言 9 组非法全部拦截 + 并发双请求 409 |
| B Capability enabled/disabled/archived | ✅ loader 注入 4 项、排除 disabled/archived；assembledCount=6 |
| C 迁移后统计 = P4-3 基线 | ✅ 88/80/8/90.9/1698119/daily27 完全一致 |
| D 完整 Mock 执行链 | ✅ POST run 落库（succeeded：model/provider/input/output 全落；failed：error_code=provider_unavailable 落库） |
| E Provider 解耦 | ✅ Service/Store/UI 无 MockProvider 直接引用（仅 Runtime 注册表 / mock agents 注册） |
| F 双模式构建 | ✅ Real build + Mock build（NEXT_PUBLIC_USE_MOCK=1）均通过；Mock 3001 stats/runAgent 正常 |
| G 业务回归 | ✅ Dashboard（91 运行/90.1%/1.7M 活动列表五态）、Agents、Agent Detail、Capabilities Hub 全部正常 |
| H lint / tsc / build / API / 生产交互 | ✅ lint 0 错误 0 警告；tsc 0 错误；build 成功；API 冒烟通过；浏览器生产交互无 console error |

### 五、发现的问题（本阶段）

| 问题 | 级别 | 状态 |
| --- | --- | --- |
| migration 应用后 `runsStats` succeeded=0（repository 聚合仍按 `'success'` 过滤） | P0 | 已修复（SQL 条件改 `'succeeded'`）；修复前一次 API 查询暴露、修复后基线恢复 88/80/8 |
| Mock 模式 runs 状态 seed 枚举仍为 `'success'`（mock/runs.ts 统计断裂风险） | P1 | 已修复（seed 与统计同步改 `'succeeded'`） |
| `realCapabilitySource.listAssemblies` 初始实现依赖 `listAgentCapabilities`（无 Definition 字段） | P1 | 已修复（新增 `listRuntimeAssemblies` join 查询） |
| runAgent 原为同步函数、Runtime.execute 为 async | P1 | 已修复（runAgent 改 async；route handler await） |

### 六、遗留问题 / 风险

| 遗留项 | 级别 | 说明 |
| --- | --- | --- |
| cancelled 状态无可达执行路径（无 cancel 端点） | 低 | 状态机与 UI 已支持；取消端点属 P5-3 范围 |
| queued/running 中间态在同步执行下窗口极短（409 并发验证用双请求触发成功） | 低 | 真实 Runtime 异步队列化时自然存在 |
| Mock seed 装配为静态快照（Mock attach/detach 不写 mockState） | 低 | 既有 Mock 架构（不持有装配状态）；Real 为事实源 |
| 演示数据中新增 run 的 duration 分布 8s~230s 为 Mock 模拟值 | 低 | 与历史演示桩一致；真实 Provider 为实际耗时 |

### 七、下一步计划

1. **等待审批**：验收《P5-2 AI Runtime 最小实施交付汇报》。
2. 建议方向（P5-3 候选，供审批）：AI Runtime 扩展——取消端点（cancelled 可达路径）/ 队列化执行（queued/running 真实窗口）/ streaming 契约接线；或接入真实 Provider Adapter（OpenAI/DeepSeek/Anthropic）之前的 API Key 与 Provider 配置管理。
3. 未做（按范围声明）：真实 LLM、Streaming/SSE/WebSocket、Tool Calling、Memory Retrieval、Prompt Editor、Authentication、Multi-user、Capability Versioning。

---

# V1 Final Freeze（最终封版）

> 状态：**V1 Final / Frozen**——功能冻结，仅文档修正与已知问题修复，不新增业务功能、不做架构扩张。

## 一、阶段完成总览（P1 → P5-2）

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| **P1** | 产品外壳与基础视觉体系（App Shell / Sidebar / TopBar / Command Palette / Design Token / Typography） | ✅ 完成 |
| **P2** | 核心闭环（Dashboard / Agents / Capability 装配 / Run 演示桩 / 时间窗口） | ✅ 完成 |
| **P3-1** | Capability 三层模型 + Zustand 持久化 + 工程收尾 | ✅ 完成 |
| **P3-2** | Agent Detail 装配关系编辑（搜索 / 装配 / 启停 / 解绑） | ✅ 完成 |
| **P3-3** | Capability Asset Hub（统一四类资产模型与展示） | ✅ 完成 |
| **P3-4** | Definition 资产生命周期（创建 / 编辑 / 归档 / 恢复，软删除） | ✅ 完成 |
| **P3-5** | Projects 最小闭环（领域模型 + 创建 / 关联 / 详情） | ✅ 完成 |
| **P3-6** | Dashboard / Agents 的 Project 维度观察 | ✅ 完成 |
| **V1 Review** | 架构与产品总审查（P0=0，P1/P2 分级认可，范围冻结建议） | ✅ 通过 |
| **P4-1** | Backend Architecture & API Design（纯设计） | ✅ 完成 |
| **P4-2** | Real Backend（Drizzle+better-sqlite3、SQLite 事实源、DTO/Domain 分离、统一 ApiError、Mock/Real 双模式） | ✅ 完成 |
| **P4-3** | 统计端点化收尾（去 pageSize=1000、seed 天级锚） | ✅ 完成 |
| **P4-4** | 交付增强（Docker / README / CI / db:init 从零初始化 / V1 RC） | ✅ 完成 |
| **P5-1** | AI Runtime 架构与契约（纯设计） | ✅ 完成 |
| **P5-2** | AI Runtime 最小实施（状态机五态 / CapabilityLoader / MockProvider / 数据迁移 / UI 五态） | ✅ 完成 |
| **Final Freeze** | 工作区整理、README/.env 对齐、全量最终回归、封版提交 | ✅ 本次完成 |

## 二、最终回归验证结果

| 检查 | 结果 |
| --- | --- |
| Git 工作区 | ✅ 干净（`139aed0` 含 P5-2 全部成果；无未提交修改） |
| 临时文件清理 | ✅ 删除根目录 12 个历史阶段日志（p42/p43/p44-*.log）；保留 `scripts/p52-verify.ts`（架构验证资产）；`logs/` 仅保留最新运行日志（gitignore） |
| README 一致性 | ✅ 同步 V1 Final 状态、AI Runtime 能力行、有意延后清单、Runtime 分层、设计文档列表、.env.example 说明、Mock 边界说明（服务端 API 始终 Real） |
| 配置 | ✅ 新增 `.env.example`（DATABASE_URL / NEXT_PUBLIC_USE_MOCK 说明）；.gitignore 加 `!.env.example`；drizzle/docker 配置核对无缺失 |
| 数据库 | ✅ migration 可重复（drizzle 版本表）；db:init 语义明确（migrate+空库 seed）；seed 幂等（onConflictDoUpdate）；reset 语义明确（clearAll+runSeed 保留 migration 历史）；P5-2 `success→succeeded` 迁移已记录（`drizzle/0001_dry_terror.sql`） |
| lint / tsc / build | ✅ 0 error / 0 warning / 通过 |
| db:check | ✅ 通过（migration 已应用且 schema 一致） |
| Real 模式 | ✅ 启动正常；四核心页面 200；stats 93/83/10 |
| Mock 模式 | ✅ 独立 build + 3001 启动；前端 Dashboard 显示 Mock 数据 88/90.9%；控制台无 error |
| SQLite 持久化 | ✅ POST run → 重启 → 统计 +1 恢复（93） |
| 控制台错误 | ✅ 无（Real 与 Mock 均验证） |

## 三、当前已知问题（最终分级）

| 级别 | 问题 | 状态 |
| --- | --- | --- |
| **P0** | 无 | — |
| **P1** | 无 | — |
| **P2** | cancelled 无可达路径（无 cancel 端点）；queued/running 同步窗口极短 | 有意延后至 P5-3（Runtime 扩展） |
| **P2** | Mock 装配静态快照（attach/detach 不写 mockState） | 既有 Mock 架构（不持有装配状态），Real 为事实源 |
| **P3** | 演示 run duration 为 Mock 模拟值；daily UTC 日期口径（totals 一致）；截图/自动化 Radix 点击工具层限制 | 低风险，保持现状 |

## 四、有意延后（明确标注，非遗漏）

Authentication / Multi-user / Permissions / 真实 LLM Provider Adapter（OpenAI/DeepSeek/Anthropic）/ Streaming·SSE·WebSocket / Tool Calling / Memory Retrieval / Prompt Editor / Capability Versioning / Marketplace / Project Tasks / 协作成员 / 文件管理 / Kanban / 评论 / Settings 业务化 / 云数据库部署。均属于 P5-3 及之后的产品演进，未在 V1 承诺范围内。

## 五、环境限制（非代码问题）

- 本机无 Docker 引擎（P4-4 记录的 Dockerfile/compose 未在本机真实引擎验证，待环境验证项）。
- GitHub Actions CI 未在真实 GitHub 仓库运行（无远程仓库；本地 `npm run ci` 等价门禁已通过）。

## 六、最终提交

`git commit`（Final Freeze）：工作区整理 + README/.env 对齐 + 计划文件封版 + 最终回归通过。

---

# Resource Discovery MVP（本地资源发现，真实数据验证阶段）

> 在 V1 Final / Frozen 之上追加的独立能力：只读发现本机真实 AI Harness 资源，解析为统一索引（SQLite）并在新增的 Local Resources 页面可视化展示。**本阶段零 Demo / Mock 数据，一切资源来自真实本地文件；原始 Harness 文件严格只读。**

## 当前阶段

**S1.33 交互增强四合一（模型分组搜索 / 失败错误面板 / 相关资源×使用建议 / 画廊打磨）** —— 实现完成、全量验证通过、待审批（不自动进入下一阶段）。

## 本次修改内容

- **新增 3 张表**（migration `0002_majestic_aqueduct.sql`，已应用）：
  - `scan_run`：一次扫描的汇总（状态 completed/partial/failed、覆盖位置、byHarness/byType 分布、总数、可解析数）。
  - `harness_scan`：每次扫描对每个 Harness 的命中结果（found、resourceCount、rootPath）。
  - `discovered_resource`：统一资源索引，`sourcePath` 唯一键（幂等 upsert，重复扫描不产生重复资源）。
- **Adapter 层**（`lib/discovery/`）：`HarnessAdapter` 接口（id/name/framework/probe/scan）+ 6 个 Adapter：
  - `doubao`（Doubao Skills：.skills 根 105 个 SKILL.md；.user_skills 与 C:\Users\Administrator\Doubao\skills 为空目录，如实 0）
  - `claude`（projects→CLAUDE.md(rule)、plugins/marketplaces→plugin、根脚本→other parseable=false）
  - `cursor`（skills-cursor→skill、agents→agent、plugins→plugin）
  - `codex`（根 config→rule、plugins→plugin、AGENTS.md→rule）
  - `cursor-user`（settings.json→rule、snippets→command，JSON 可解析才算）
  - `project-agents`（CWD 根 AGENTS.md/CLAUDE.md/.claude→rule）
- **扫描器**（`lib/discovery/scanner.ts`）：候选根从 HOME/LOCALAPPDATA/APPDATA/CWD 推导；只读头部 4KB；跳过运行态目录（node_modules/.git/cache/telemetry/sessions/tmp 等）。
- **Repository / Service**：discovery CRUD（含 `onConflictDoUpdate target=sourcePath` 幂等 upsert）；`runResourceScan / getDiscoveryOverview / listDiscoveredResources / getDiscoveredResource`。
- **API**（`/api/v1/resource-discovery/*`）：scan(POST) / overview / harnesses / resources(搜索/类型/Harness/可解析过滤+分页) / resources/[id]。
- **前端**：`/resources` 列表页（统计 4 卡 + 类型分布 + Harness 网格 + 资源表）+ `/resources/[id]` 溯源详情页；Store discovery 区块；导航「本地资源」；Mock 模式返回结构化空态（不伪造）。
- **领域类型**（`lib/types.ts`）：`DiscoveredResource / HarnessScanSummary / ScanRun / ScanLocation / DiscoveryOverview / RunScanResult` 等。

## 已完成内容（含真实验证结果）

- **实际发现的 Harness 与资源数**（一次全量扫描，`db:reset` 后亦稳定）：

  | Harness | 命中 | 资源数 | 根路径 |
  |---|---|---|---|
  | Doubao Skills（.skills） | ✓ | 105（skill） | `C:\Users\Administrator\AppData\Local\Doubao\User Data\Default\.doubao\agent_mode\workspace\.skills` |
  | Doubao（.user_skills / Doubao\skills） | ✓（存在但空） | 0 | 如实显示空目录 |
  | Claude | ✓ | 15（rule/plugin/other） | `C:\Users\Administrator\.claude` |
  | Cursor | ✓ | 19（skill/agent/plugin） | `C:\Users\Administrator\.cursor` |
  | Codex CLI | ✓ | 3（rule/plugin） | `C:\Users\Administrator\.codex` |
  | Cursor User | ✓ | 1（rule；snippets 空） | `C:\Users\Administrator\AppData\Roaming\Cursor\User` |
  | Project 指令 | ✓ | 2（rule：AGENTS.md/CLAUDE.md） | `D:\AI workspace` |

  **合计 145 个资源；128 个已解析（88.3%）。**
- **各类型数量**：Skill 123 / Rule 19 / Plugin 2 / Other 1（按真实扫描结果）。
- **parseable=false 共 17 个，均保留真实路径与原因，不猜测格式**：
  - Claude 项目目录内无 CLAUDE.md（11 个，含 10 个 Temp\tmp 临时项目，如实展示）；
  - Codex `.plugin-appserver` / Cursor `plugins\local` 无 *.json manifest（不猜插件格式）；
  - Claude 根 `anthropic_proxy.py` 无统一资源契约（仅保留位置）。
- **覆盖路径**：HOME、LOCALAPPDATA、APPDATA、CWD 四组候选根推导出的全部位置；未命中的 `.continue / .gemini / .aider / .code / AppData\Roaming\Code\User / D:\AI workspace\.claude / .cursor` 如实标注未命中。
- **验证结果**：lint（0 error 0 warning）/ tsc --noEmit / db:check / build（Real + Mock 双模式）/ 生产交互（/resources 列表页、详情页溯源、控制台无应用错误）/ 只读确认（原始文件 mtime 扫描前后不变）/ 幂等（二次扫描 total 仍 145）/ Mock 模式显示「Mock 模式不执行真实扫描」空态、零伪造数据 / API 冒烟（scan→overview→resources→detail 全链）。
- **Git**：本阶段变更已 commit（见交付汇报）。

## 遗留问题

- Claude `projects\` 下的 Temp 临时项目目录（无 CLAUDE.md）会被如实索引为 parseable=false 的 rule——属真实状态，后续可考虑在 Adapter 内按项目路径前缀过滤临时会话，但**不在本阶段范围**。
- 浏览器控制台存在一条 `chrome-extension://` 扩展注入错误（非应用错误，与本地扩展环境相关，已记录）。

## 下一步计划

等待审批。后续可选方向（均未获批准前不实施）：资源执行 / 编辑 / 删除 / 同步 / 远程部署 / MCP 调用 / 真实 AI 集成；更多 Harness Adapter（.continue、.aider、Gemini CLI 等）；临时会话目录过滤优化。

---

## 一、已完成内容（Phase 3 — Task Intelligence MVP 实施）

### 1. 领域模型（三张新表，migration 0004 已应用）

- `task_analysis`：task / status(analyzed|failed) / strategy(heuristic|llm) / analyzerVersion("task-heuristic-v1") / taskType（推断）/ inputFingerprint / isCurrent / errorCode / errorMessage / summary / createdAt / analyzedAt；唯一约束 `uq_task_analysis_fp_version(task,input_fingerprint,analyzer_version)`——同版本同输入不重复生成；历史保留（isCurrent 标记当前，markOtherTaskAnalysesNotCurrent）。
- `task_requirement`：taskAnalysisId(FK cascade) / requirementText / category / keywords(JSON) / weight / derivedFrom / **isInferred（固定 true，显式标记推断）** / sortOrder；唯一 `uq_task_req_analysis_text`。
- `resource_recommendation`：taskAnalysisId + taskRequirementId(FK) + **resourceCapabilityId（只引用不复制能力文本）** + resourceId + score + reason（推断）/ evidenceRef + sourcePath（真实来源快照）/ rank / source；唯一 `uq_reco_analysis_cap`。

### 2. 分析层（lib/task-intelligence/，纯计算、不触碰 Runtime）

- `parser.ts`：parseTaskType —— 7 类领域词典（内容创作/文本摘要/网络研究/数据分析/代码生成/自动化/开发工具）+ other 兜底；取信号最多类型；**不针对测试词硬编码**。
- `decomposer.ts`：类型模板子任务 + 附加意图检测（"表格/数据/整理成"→数据整理、"配图/图片"→视觉素材、"翻译/英文"→翻译）；other 类型关键词为空（只依赖真实用户反向信号）。
- `extractor.ts`：子任务 → CapabilityRequirement（isInferred=true）。
- `retriever.ts`：tokenizeTask（英文词 + 中文 2/3-gram + **停用词过滤**）；BaseScore 复用现有公式 `(min(hits+kw,5)/5)*0.65 + confidence*0.35`；**kwHits 反向匹配基于真实用户任务原文**（修模板词虚高）；类别加成 +0.08（other 除外）；other 类型仅 kwHits 路径。
- `reranker.ts`：跨需求合并（同 capability 保留最高分+理由合并）、同资源多标签去重、证据质量分级（description>heading>其他）、**MIN_RECOMMENDATION_SCORE=0.5 低置信如实过滤**；reason 由真实匹配信号生成。
- `assembler.ts`：流水线编排，输出 RecommendationPlan（analysisId 复用语义由 service 注入）。

### 3. Service / Repository（db/）

- `analyzeTask(task)`：fingerprint 幂等（同键已 analyzed → 复用已有记录，reused=true，不重复落库）；能力源空 → failed 记录（NO_CAPABILITIES）+ ServiceError NOT_FOUND；分析异常 → failed 记录（ANALYSIS_FAILED）+ 抛错；成功 → upsert analysis + markOtherNotCurrent + 替换需求/推荐（全部写操作走 Repository）。
- `getTaskAnalysis(id)` / `listTaskAnalyses(limit)`：详情 join capability+resource+requirement 组装领域 Plan；列表新→旧。

### 4. API 契约（3 端点 + DTO/Mock 双模式）

- `POST /api/v1/task-intelligence/analyze` { task } → Plan + reused；`GET /api/v1/task-intelligence/analyses?limit` → 历史列表；`GET /api/v1/task-intelligence/analyses/[id]` → 详情（404 契约）。
- `lib/api/task-intelligence.ts`：DTO（独立于 Domain）+ mappers + client（ApiError 按 code 分支）。
- `lib/services/mock/task-intelligence.ts`：**真实空态**（analyze 抛 ApiError、列表空数组，不伪造分析结果）；`lib/services/task-intelligence.ts` 双模式入口。

### 5. Store / 前端

- `stores/workspace.ts`：taskIntelligence 区块（current/history/analyzing/loading/error/reused）+ analyzeTask / fetchTaskAnalysisHistory actions；**persist partialize 仍仅 timeRange**（领域数据不入 localStorage，migrate v5 语义未动）。
- `/task-intelligence` 页面 + `components/task-intelligence/task-intelligence-view.tsx`：任务输入（含示例按钮）、结果区（任务类型徽标 + summary + 拆解需求列表（isInferred 徽标）+ 推荐卡片（rank/资源链接→/resources/[id]/类型·harness/类别/score 条/能力文本/推断理由/证据行 sourcePath+evidenceRef+置信度+关联需求））、空态（低相关如实显示）、历史列表；导航「本地资源」组新增「Task Intelligence」（Workflow 图标）。

### 6. 检索质量修复（验证过程中发现的真实问题）

- 中文 2-gram 高频停用词过滤（怎么/什么/一个/可以/进行/使用/用于/帮助/需要…）——消除宽匹配噪声。
- **模板词反向匹配虚高**：kwHits 原本用自造需求文本做反向匹配，导致"任务/处理/帮助"等模板词虚高命中 → 改为基于真实用户任务原文。
- **other 类型关闭正向匹配**：未识别任务只依赖用户真实词的 kwHits，杜绝 3-gram 残留噪声（如「今天天气怎么样」从误报 6 条降到如实 0 条）。

## 验证结果

- **lint**：0 error / 0 warning。
- **tsc --noEmit**：通过。
- **db:check**：通过（migration 0004 已应用且 schema 一致）。
- **build**：Real + Mock 双模式构建全绿（Mock 需 `NEXT_PUBLIC_USE_MOCK=1` 重新构建，既有双模式语义）。
- **API 冒烟（Real 生产）**：
  - 「写一篇小红书文案」→ content_creation，2 需求，8 推荐，#1 doubao-ecommerce-proposal score=1.00；
  - 「帮我做一份数据周报并整理成表格」→ data_analysis，3 需求（含数据整理），8 推荐，#1 lark-base score=0.94；
  - 「今天天气怎么样」→ other，**0 推荐如实空态**；
  - 幂等：同任务二次 POST 同 analysisId + reused=true（跨进程 SQLite 持久化验证）；
  - 追溯：推荐 → resourceCapabilityId → sourcePath（真实 SKILL.md 路径）+ evidenceRef（SKILL.md#description）；
  - 事实/推断分离：requirements.isInferred=true 落库，推荐 reason 为推断文本、score 为确定性算法输出；
  - 详情/列表端点 200 正常。
- **页面 HTTP**：/task-intelligence、/dashboard、/resources/capabilities、/agents、/projects 全部 200。
- **零回归**：145 资源 / 128 analyzed / 17 failed / 487 能力标签基线未变；Harness 文件零修改（本阶段无任何文件写操作）。
- **Mock 模式**：前端 Mock 真实空态（analyze 抛 ApiError、列表空），API 端点连 SQLite（既有双模式架构，与 P4 验收一致）。
- **限制**：浏览器自动化空间不可用（browser_use_space_disabled_or_unavailable），生产交互验证降级为 HTTP 200 + API 冒烟 + 产物级检查（与上一阶段一致的既定降级）。

## 遗留问题

- Heuristic 任务理解属确定性规则，复杂自然语言（长句多意图、歧义指代）拆解粒度有限——LLM 理解器（task-llm-v1）预留为同一接口的替换实现，本阶段不接。
- other 类型任务依赖用户显式词反向匹配，若用户任务含生僻领域词可能 0 推荐（如实空态，属设计行为）。
- 浏览器控制台 chrome-extension 注入错误（非应用错误，既有记录）。

## 下一步计划

等待审批。后续可选方向（均未获批准前不实施）：Agent 覆盖度推荐（需求命中能力 → 按 AgentCapability 装配推荐 Agent）；CapabilityDefinition 人工提炼（ResourceCapability → Definition 的 provenance 确认 UI）；真实 LLM 任务理解（task-llm-v1）；编排执行层（RecommendationPlan → Runtime 前置映射）。

---

## 一、已完成内容（Phase 4 — Capability Planning MVP 实施）

### 1. 领域模型（三张新表，migration 0005 已应用）

- `task_plan`：id / taskAnalysisId(FK cascade) / status(valid|partial|invalid|failed) / plannerStrategy / plannerVersion("planner-heuristic-v1") / createdAt / validation(JSON 快照) / errorCode / errorMessage；唯一键 `uq_plan_analysis`（一分析一当前计划，重算走 upsert）。
- `plan_step`：id / planId(FK cascade) / stepIndex / taskRequirementId(FK) / requirementText / category / **primaryCapabilityId(FK resource_capability，只引用不复制正文；unmet 为 null)** / primaryResourceId(FK) / score（retriever 原分）/ alternatives(JSON，真实次优候选 ≤3) / outputDescription(推断) / expectedInput(推断) / satisfaction(satisfied|unmet) / **isInferred(推断标记)** / sortOrder；唯一 `uq_plan_step_plan_index(planId,stepIndex)`。
- `plan_dependency`：id / planId / fromStepId / toStepId(FK plan_step) / type(data_flow|constraint) / reason(推断) / isInferred；唯一性由应用层保证（同 from-to 不重复建边）。

### 2. 分析层（lib/task-planning/，纯计算；不 import lib/runtime/*）

- `normalizer.ts`：每个 requirement 重新调用 Retriever（确定性，输入与 Phase 3 分析一致）→ 恢复 ≥0.5 的全部候选（修复 Reranker 丢弃次优候选问题）；候选零制造。
- `orderer.ts`：类别先验偏序（web_research 先于 data_analysis/content_creation 等）+ 稳定拓扑排序；无先验关系的步骤保持并列。
- `dependency-inferer.ts`：类别先验边（to 的前置含 from 类别）+ 文本信号边（下游需求关键词命中上游输出声明词）；**边仅当 from<to**（构造性 DAG）；反向/弱信号一律丢弃——"无证据时无依赖优于错误依赖"。
- `primary-selector.ts`：主选 = 候选最高分；alternatives = 次优 ≤3（真实 score）；无候选 → satisfaction=unmet 如实降级；outputDescription/expectedInput 按类别确定性模板生成（推断）。
- `validator.ts`：确定性——circular_dependency（Kahn 拓扑）/ dangling_input（边端点越界）→ error → invalid；unmet_capability / duplicate_capability / low_confidence（<0.6）→ warning → partial；无 issue → valid。**合法性判定不依赖 LLM**。
- `index.ts`：planTask 编排 + PlannerProvider（planner-heuristic-v1 唯一注册；planner-llm-v1 契约桩 PROVIDER_NOT_AVAILABLE）+ PLANNERS 注册表 + getPlanner（对齐 AnalysisProvider 模式）。

### 3. Service / Repository（db/）

- `createPlanFromAnalysis(analysisId)`：analysis 不存在 → NOT_FOUND；未 analyzed → VALIDATION_ERROR；幂等（已存在非 failed 计划 → 复用 + reused=true）；Planner 失败 → failed 计划落库（errorCode/errorMessage）+ 抛错；成功 → upsert plan + 替换 steps/deps（requirementText → taskRequirementId 同源映射，未命中防御性中止）；全部写操作走 Repository。
- `getPlan(id)` / `getPlanByAnalysis(analysisId)`：join 主选能力/资源（leftJoin，unmet 为 null）+ 依赖 from/to stepIndex（plan_step 别名 join）。

### 4. API 契约（3 端点 + DTO/Mock 双模式）

- `POST /api/v1/task-intelligence/plan` { analysisId } → TaskPlan + reused（幂等）；`GET /api/v1/task-intelligence/plans/[id]` → 详情（404 契约）；`GET /api/v1/task-intelligence/analyses/[id]/plan` → 该分析当前计划（未生成 404，前端据此显示「生成计划」入口）。
- `lib/api/task-intelligence.ts`：PlanStepDTO / PlanDependencyDTO / PlanIssueDTO / TaskPlanDTO + mappers（DTO → Domain）+ client（createTaskPlan / fetchTaskPlan / fetchPlanByAnalysis）。
- `lib/services/mock/task-intelligence.ts`：**真实空态**（createTaskPlanMock 抛 ApiError、fetchPlan 404）；双模式入口同构。

### 5. Store / 前端

- `stores/workspace.ts`：taskIntelligence 区块扩展 plan / planLoading / planError / planReused + createTaskPlan / fetchPlanByAnalysis actions（404 → null 空态不报错）；persist partialize 仍仅 timeRange（领域数据不入 localStorage）。
- `components/task-intelligence/plan-section.tsx`：任务计划区块——状态徽标（valid/partial/invalid/failed 语义色）+ 校验 issues 列表（error=danger / warning=amber）+ 依赖链（步骤 a → b · data_flow，title=推断理由）+ 步骤流（序号/需求/类别/满足状态/主选资源链接→/resources/[id]/score/置信/推断输出与输入/来源+证据行/回退链折叠）+ 未生成空态（生成按钮）+ 无依赖提示（并列不强行）。
- 挂载：task-intelligence-view.tsx 结果区追加 `<PlanSection analysisId={plan.analysisId} />`。

## 验证结果

- **lint**：0 error / 0 warning。
- **tsc --noEmit**：通过。
- **db:check**：通过（migration 0005 已应用且 schema 一致）。
- **build**：Real + Mock 双模式构建全绿（Mock 需 NEXT_PUBLIC_USE_MOCK=1 重构建，既有双模式语义）。
- **validator 校验矩阵（纯函数单测）**：
  - 环（1→0 与 0→1 双向边）→ **invalid / circular_dependency**；
  - 悬空（to=5 越界）→ **invalid / dangling_input**；
  - 无候选步骤 → **partial / unmet_capability**；
  - 同 capability 双主选 → **partial / duplicate_capability**；
  - 正常边 → **valid / 0 issue**。
- **真实 DB 服务冒烟**：
  - 「写一篇小红书文案」→ 2 步骤（content_creation 并列，0 依赖不强行）+ partial（duplicate + low_confidence 如实 warning）+ 步骤 0 主选 doubao-ecommerce-proposal score=0.98 + **3 条真实回退候选** + 推断输出/输入落库；
  - 「帮我做一份数据周报并整理成表格」→ 3 步骤（准备数据 lark-base 0.90 → 计算指标 doubao-creative-design 0.85 → 整理表格 lark-base 0.90）+ **3 条 data_flow 依赖（文本信号：统计/数据/表格）** + lark-base 重复主选如实 warning；DAG 无环。
  - 幂等：同 analysisId 二次生成同 planId + reused=true（跨进程 SQLite 验证）。
- **API 冒烟（Real 生产）**：POST plan（status=partial 返回）/ 幂等（sameId+reused）/ GET plans/[id]（steps+primary+alternatives+isInferred 完整）/ GET analyses/[id]/plan（同源）/ 404 语义（plans/not-exist → 404、analyses/not-exist/plan → 404）。
- **页面 HTTP**：/task-intelligence、/dashboard、/resources/capabilities、/agents、/projects 全部 200。
- **零回归**：145 资源 / 128 analyzed / 17 failed / 487 能力标签 / 3 条任务分析基线未变；**lib/runtime 契约零改动（git diff --stat lib/runtime 为空）**；Harness 文件零修改（git status 无 harness 路径）。
- **Mock 模式**：前端真实空态（createTaskPlan 抛 ApiError、fetchPlan 404 由前端转为空态），API 端点连 SQLite（既有双模式架构）。
- **限制**：浏览器自动化空间不可用（既有降级：HTTP 200 + API 冒烟 + 产物级检查）。

## 遗留问题

- Heuristic 依赖推导与步骤排序基于类别模板与文本信号，复杂任务（跨域多步骤、隐含数据流）可能并列化或依赖不足——planner-llm-v1 预留为同一接口的替换实现（输出仍须过确定性 validatePlan 才能落库），本阶段不接。
- duplicate_capability 为 warning 语义（同能力可被多步骤共享）；未来如需严格去重可在 Planner 内做共享消解，不在本阶段范围。
- 浏览器控制台 chrome-extension 注入错误（非应用错误，既有记录）。

## 下一步计划

等待审批。后续可选方向（均未获批准前不实施）：Plan 编辑/重排 UI；Plan → Agent 执行批次桥接（Runtime 消费 TaskPlan 的前置映射契约）；ResourceCapability → CapabilityDefinition 人工提炼；真实 LLM 任务理解/计划生成；Agent 覆盖度推荐。

---

## 方向调整记录（2026-09-10）

**用户决策**：产品只展示本机真实 AI 资源，删除全部演示/假数据；页面骨架保留；冗余文件清理。

### S0 已完成内容
1. **假数据源清除**：前端 Mock seed（lib/mock-data/seed.ts）六组演示数据全部置空；数据库 seed 脚本（db/seed.ts）重写为仅清空演示业务表；db:init 不再种数据；db:reset 语义 = 清空演示业务数据 + 保留真实资源。
2. **数据库假记录清零**（实测）：agent / capability_definition / agent_capability / project / project_agent / agent_run 六表全部归 0。
3. **真实资源零回归**（实测）：145 资源 / 128 可解析 / 487 当前能力标签 / 6 Harness 概览完整。
4. **冗余文件删除**：docs/previews（40+ 截图）、工程化方案与技术架构说明.md、Capability 架构设计.md、V1-Architecture-Review.md、P4-1-Backend-Architecture-API-Design.md、start-real.log、start-mock.log、tsconfig.tsbuildinfo。保留：P5-1-AI-Runtime-Architecture-Contract.md（Runtime 契约仍在使用）、新增 docs/ROADMAP-Real-Resources.md（新方向路线图）。
5. **页面保留**：agents / projects / capabilities / settings 骨架保留并展示空态；Dashboard 已连接真实资源概览（145/128/6 Harness）。

### 验证结果
- lint 0/0、tsc --noEmit、build（Real + Mock 双模式）全部通过
- 8 个页面 HTTP 200；/api/v1/agents 空态（agents=0）；资源概览 API 真实数据完整
- 既有真实资源数据零回归

### 遗留问题
- agents / projects / capabilities / settings 页面当前为空态（骨架保留），属于"页面保留、数据真实化"的中间状态；是否重定向到真实资源功能，待 S1 及后续阶段决定。
- README 尚未同步"方向调整 + 假数据已删除"说明（待后续阶段一并更新）。

---

## S1 Hermes Adapter 交付记录（2026-09-10）

### 已完成
1. **Hermes Harness Adapter**（lib/discovery/adapters/hermes.ts，注册入 registry）：
   - 探测 HOME/.hermes；递归发现 skills 全部 135 个真实 SKILL.md（兼容两层 / 单层分类即技能 / 三层嵌套结构）
   - 修复「computer-use」目录被全局跳过名单误伤（Cursor 运行态目录在 Hermes 里是真实技能），Hermes 改用自定义遍历仅跳过隐藏目录
   - 2 个插件：superpowers（含 README，已解析）、agency-agents（目录无 SKILL.md/README，如实标记未解析）
2. **「如何使用」提取**（fs-utils.extractUsage）：从 SKILL.md 正文确定性提取一行简短用法（去 frontmatter/标题/代码块，截断 200 字符）；Hermes / Doubao / Cursor 三类 SKILL.md 技能统一带 usage
3. **前端展示**：资源列表行显示一行用法摘要；资源详情新增「如何使用」卡片（usage 缺失时兜底 description）
4. **真实数据**：Hermes 137 条入库（135 技能 + 2 插件），资源总数 145→282，可解析 248→264，byHarness 含 hermes=137

### 验证结果
- lint 0/0、tsc、db:check、build（Real + Mock）全通过
- 幂等：连续扫描资源总数 282 不变，无重复入库
- 只读：135 个 Hermes SKILL.md 扫描前后 SHA-1 完全一致
- API：/resources?harness=hermes total=137，详情含 usage 字段（如 windows-shell-interop 等真实提取）
- 页面：/resources、/resources/capabilities、/dashboard 均 200

### 遗留问题
- claude Harness 下仍有 2 条指向 hermes 的历史路径残留（Desktop/hermes/dashboard 等，目录已不存在），如实标记未解析，待后续清理
- 资源列表页暂未做「按类别分组展示」（Hermes 有 27 个类别），后续阶段可按类别浏览

---

## S1.5 展示化首页交付记录（2026-09-10）

### 阶段目标
用户方向定稿：把 AI Workspace 做成「酷炫的本机 AI 资源展示平台」，展示 Hermes 真实技能 / 规则 / 人设。零演示数据。

### 已完成
1. **Hermes Adapter 扩展**（lib/discovery/adapters/hermes.ts）：
   - 新增 scanProfiles：扫 AppData/Local/hermes/profiles/*/SOUL.md → type=prompt「人设」资源（真实发现 work + newprofile 两条）
   - 新增 scanMainConfig：读 .hermes/config.yaml → type=rule「Hermes 主配置」资源（默认模型 / Provider / base_url / 模型数；不读密钥）
   - 资源总数 282→285，Hermes 137→140（135 技能 + 2 插件 + 2 人设 + 1 配置）
2. **展示首页重写**（app/(workspace)/dashboard/page.tsx + components/dashboard/showcase/ 4 个新组件）：
   - HeroStats：285 已发现 / 267 可解析 / 7 Harness / 140 Hermes 技能（真实数字）
   - TypeCards：技能 258 / 人设 2 / 规则 20 / 插件 4 分类卡（点击进 /resources?type=xx）
   - HermesSpotlight：运行配置卡（默认模型 deepseek-v4-flash-0731、Provider custom:tokenrhythm、16 个可用模型）+ 人设卡（work 机器视觉教练 / newprofile Hermes Agent，各带真实首段）
   - SkillGallery：精选 8 个 Hermes 真实技能卡（名称 / 类别 badge / 一行用法），framer-motion 入场动画
   - 「重新扫描」按钮：调 runResourceScan 后刷新全部数据
3. **数据源**：首页直接走 lib/services/resource-discovery（overview + 3 组资源查询），不污染 workspace store

### 验证结果
- lint 0/0、tsc 0、build（Real）通过
- API：overview total=285 parseable=267 hermes=140；prompt=2（work 人设 / newprofile 人设）；hermes rule=1（Hermes 主配置）
- 幂等：连续扫描 total=285 不变
- 只读：135 个 SKILL.md 仍在；config.yaml / SOUL.md SHA-1 已记录，全程未写入
- 页面：/dashboard 生产模式 HTTP 200，浏览器渲染确认四块全部显示真实数据

### 遗留问题
- claude Harness 2 条历史路径残留（已如实标记未解析）
- Dashboard 顶部标题仍显示「Dashboard」（PageHeader），与展示定位不完全匹配，待后续微调
- README 仍为旧版描述，未同步「真实资源展示」方向（待开源整理时统一更新）

### 当前状态
- 阶段完成；未越界（仅 Hermes Adapter 追加扫描 + 首页展示，未动 Runtime / 其它核心模块）
- Git：待提交（dashboard/page.tsx、hermes.ts、showcase/ 4 组件）

---

## S1.6 清理收尾 + README 同步（2026-09-10）

### 已完成
1. **扫描噪声收敛**（lib/discovery/adapters/claude.ts）：Claude Adapter 移除 projects/ 会话记录扫描（曾产出 13 条无 CLAUDE.md 噪声）+ 根下脚本扫描（anthropic_proxy.py 非资源）；仅保留 plugins/marketplaces 与根 CLAUDE.md。
2. **索引孤儿清理**（db/service.ts + db/repository.ts）：runResourceScan 末尾删除 scanId 非本次的记录——adapter 排除的路径 / 已消失的源自动从索引移除，索引与真实文件系统保持一致。
3. **重复页面删除**：/capabilities（CapabilityDefinition 空壳）与 /resources/capabilities（真实能力索引）概念重复 → 删除 app/(workspace)/capabilities/ 整目录 + 导航项（lib/navigation.ts 移除 Blocks 项）。
4. **README 重写**：从 P1-P5 旧描述（假业务 + 已删文档引用）更新为当前「真实本地 AI 资源展示平台」定位：核心能力、页面结构、扫描语义、数据基线、明确未实现清单；移除对已删文档的引用。

### 验证结果
- lint 0/0、tsc 0、build（Real）通过
- 重扫：total 285→270，claude 15→0（13 条会话记录 + 2 条不存在路径被清理），**可解析 267 一条未少**
- byType：skill 258 / plugin 4 / prompt 2 / rule 6 / other 1（原 rule 20 中 claude 噪声 14 条已清）
- 幂等：重扫 total=270 稳定
- 页面：全部 7 个路由 200；/capabilities → 404 ✓；Dashboard 数字更新 270/267/6/140
- 原始 Harness 文件零修改

### 遗留问题
- docs/ROADMAP-Real-Resources.md 与 docs/P5-1 为历史设计文档，内部交叉引用旧评审，不影响运行，待后续统一归档
- agents / projects / settings 仍为空壳骨架页面（S0 用户确认保留），后续按展示方向决定去留

### 当前状态
- 阶段完成；未越界（仅 Adapter 收敛 + 索引清理 + 页面去重 + 文档）
- Git：待提交

---

## S1.7 详情页专用展示交付记录（2026-09-10）

### 已完成
1. **Adapter 元数据扩展**（lib/discovery/adapters/hermes.ts）：
   - scanProfiles：SOUL.md 全文写入 metadata.content（限 32KB，本地只读）
   - scanMainConfig：模型名列表写入 metadata.models（16 个真实模型名），不再只有计数
2. **详情页专用展示**（components/resources/resource-detail.tsx）：
   - HermesConfigDetail：默认模型 / Provider / Base URL 三格 + 可用模型列表（chips）
   - SoulProfileDetail：SOUL.md 人设全文（max-h 滚动 pre 块，标注"本地只读"）

### 验证结果
- lint 0/0、tsc 0、build 通过
- 数据：work 人设 content=5090 chars、newprofile 人设 content=513 chars、主配置 models=16 个
- 浏览器实渲染：配置详情页显示 deepseek-v4-flash-0731 / tokenrhythm / seed-2.1-pro / kimi-k2.5 / qwen3.8-max 等全部模型；人设详情页显示 SOUL 全文（含"机器视觉工作成长教练""康耐视 Cognex VisionPro"等真实内容）+ "本地只读"标注
- 幂等：重扫 270 不变；原始文件零修改

### 遗留问题
- SOUL.md 全文仅存本地库（data/ 已 gitignore），开源发布安全；若未来做公开演示截图需注意可见性

### 当前状态
- 阶段完成；未越界
- Git：待提交

---

## S1.8 技能按类别分组浏览交付记录（2026-09-10）

### 已完成
1. **CategoryBrowser 组件**（components/resources/category-browser.tsx）：全量拉取 Hermes 技能（分页合并），按 metadata.category 真实分组，每类标题 + 数量 + 技能卡网格（名称 + 一行用法），无类别的归「未分类」，按数量降序。
2. **资源页视图切换**（app/(workspace)/resources/page.tsx）：资源索引卡头部新增「列表 / 按类别」切换，默认列表，保留现有分页筛选能力。

### 验证结果
- lint 0/0、tsc 0、build 通过
- 浏览器实渲染：类别视图显示「135 技能 / 25 类别」，software-development（28）居首，技能卡带真实用法；与列表视图一键切换正常
- 数据：135 个 SKILL.md 全部来自真实分类元数据，零演示
- 幂等/只读不受影响（纯前端视图）

### 遗留问题
- 类别视图仅覆盖 Hermes 技能（其余 Harness 技能无 category 元数据，暂不纳入）

### 当前状态
- 阶段完成；未越界
- Git：待提交

---

## S1.9 文档归档与仓库清理交付记录（2026-09-10）

### 已完成
1. **归档历史设计文档**：docs/P5-1-AI-Runtime-Architecture-Contract.md 与 docs/ROADMAP-Real-Resources.md 移入 docs/archive/（git mv，保留历史）；新增 docs/README.md 说明归档语义（不再作为现行设计依据，进度以 IMPLEMENTATION_PLAN.md 为准）。
2. **清理运行产物**：删除 start-real.log / start-showcase.log / start-showcase-err.log 与 tsconfig.tsbuildinfo（编译缓存，已 gitignore）。

### 验证结果
- 文档结构：docs/ 仅 README.md + archive/ 两份历史文档，根目录无过期设计文档
- Git：归档移动为 rename，历史保留
- 项目功能不受影响（纯文档清理）

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.10 开源配套交付记录（2026-09-11）

### 已完成
1. **LICENSE**：新增 MIT License（版权行使用 "AI Workspace contributors"，可自行修改）。
2. **项目真实截图**：docs/screenshots/ 4 张实拍（首页 270/267/6/140、资源列表、按类别视图 135 技能/25 类、Hermes 主配置详情 16 模型），全部来自本机真实数据。
3. **README 配图**：新增「界面预览」章节 + 页面结构同步「列表/按类别」双视图说明。

### 验证结果
- 截图逐张浏览器实拍确认内容正确（无敏感信息：未拍人设全文页）
- 纯文档/图片变更，不影响代码与构建

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.11 Settings 展示化交付记录（2026-09-11）

### 已完成
1. **Settings 从空壳改为「本机环境与资源扫描信息」展示页**（app/(workspace)/settings/page.tsx 重写为 server component，force-dynamic）：
   - EnvInfo：运行模式（Real/Mock）、数据文件真实路径与体积（fs.stat 实测）、存储策略
   - HarnessDirectories：已命中 Harness 目录清单（同 /resources 同源 store 数据，含真实路径与资源数）
   - ResourceStats：资源统计（总数/已解析/命中数/上次扫描）+ 类型分布 + 4 条扫描策略说明（只读/幂等/真实空态/可追溯）
2. **零新增偏好开关**：扫描策略以只读说明呈现，未引入可写偏好（避免扩大范围）；无假数据。

### 验证结果
- lint 0/0、tsc 0、build 通过
- 浏览器实渲染：Real 模式、data/ai-workspace.db（1.5 MB）、Claude(0)/Codex(3)/Cursor(19)/Cursor User(1)/Doubao Skills(105) 等真实路径全部显示
- 数据与 /resources 同源（同一 overview store），无第二数据源

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.12 资源隐藏（展示排除）交付记录（2026-09-11）

### 已完成
1. **用户级隐藏数据层**：新增 `user_hidden_resource` 表（migration 0006），按 sourcePath 记录隐藏（非物理删除；重扫资源 ID 变化不丢失隐藏状态）。
2. **Service / Repository / API**：hideResource / unhideResource / unhideResourceRecord / listHiddenResources / isResourceHidden 五个写读函数；API：POST+DELETE `/api/v1/resource-discovery/resources/[id]/hidden`、GET `/api/v1/resource-discovery/hidden`、DELETE `/api/v1/resource-discovery/hidden/[id]`；列表查询默认 `excludeHidden` 过滤（notInArray 子查询）。
3. **前端三个入口**：资源列表行内「隐藏」按钮（hover 显示，事件阻断不触发行跳转）、详情页「隐藏此资源」按钮（隐藏后跳回列表）、Settings「已隐藏资源」区块（sourcePath + 隐藏时间 + 一键恢复；恢复按隐藏记录 id，不依赖资源是否仍存在）。
4. **统计口径保持不变**：隐藏只影响列表展示；Dashboard / Settings「已索引资源 270」等真实发现统计不变。
5. **Mock 空态**：Mock 模式 hide/unhide 抛 404、list 返回 []，不伪造。

### 验证结果
- lint 0/0、tsc 0、build 通过；db:migrate 应用 0006、db:check 通过
- API 实测：隐藏前 total=270 → POST 隐藏 → 269 → GET /hidden 1 条 → 幂等重复 POST 仍 1 条 → DELETE 恢复 → 270；不存在 id → HTTP 404
- 浏览器实测：列表行隐藏（toast + 行消失 + 分页 269）、详情页隐藏（toast + 跳回列表 269）、Settings 恢复（toast「已恢复展示」+ 空态）、控制台 0 error
- 原始 Harness 文件只读：sheet SKILL.md LastWriteTime 未变化

### 当前状态
- 阶段完成；未越界（未改 Dashboard/Project/Agent/Capability/Run/Agent 装配）；Git：待提交

---

## S1.13 隐藏功能收尾（CategoryBrowser 口径核实 + 详情页隐藏状态 + README 同步）（2026-09-11）

### 已完成
1. **CategoryBrowser 口径核实**：实证确认类别视图走同一 API（repository 默认 excludeHidden 过滤），隐藏后 hermes+skill 查询 135→134→135，上一轮误报的「类别视图不随隐藏过滤」为伪问题，无需修改。
2. **详情页「已隐藏」状态与就地恢复**：新增 GET `/resources/[id]/hidden` 状态端点；详情页加载时查询隐藏状态，已隐藏时显示警示横幅 +「恢复展示」按钮（就地恢复，无需跳 Settings）。
3. **README 同步**：核心能力表补充「用户级隐藏（展示排除）」；页面结构更新 /resources、/resources/[id]、/settings 说明；新增「资源隐藏」数据流说明。

### 验证结果
- lint 0/0、tsc 0、build 通过
- API：GET hidden 状态端点返回 `{hidden:false}` 正确
- 浏览器实测：详情页隐藏→跳列表；直接访问已隐藏详情页显示横幅+恢复按钮；点击恢复→toast「已恢复展示」+横幅消失
- 数据已还原（hidden=0，total=270）

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.14 Harness 网格去重（豆包技能多根冗余）（2026-09-11）

### 已完成
1. **根因**：doubao-skills 扫描命中 3 个根目录（.skills 105 / .user_skills 0 / Doubao\skills 0），overview 把同一 Harness 的多条根记录全量返回，前端渲染成多张同名牌卡片。
2. **数据层合并**：getDiscoveryOverview 按 harnessId 分组去重（取 resourceCount 最大者为主卡），其余根进 extraRoots 次要展示；新增 mergeHarnessScans；DTO/mapper 透传 extraRoots。
3. **前端**：harness-grid 主卡显示主根路径，副行显示「另有 N 个候选根」（title 悬停查看完整路径）；资源统计卡「命中的 Harness」9→7（唯一 Harness 类型数，口径更真实）；下拉筛选自动去重。

### 验证结果
- lint 0/0、tsc 0、build 通过
- API：overview.harnesses 9→7，doubao-skills 单卡 n=105 + extraRoots 2 条
- 浏览器实测：网格显示「另有 2 个候选根」，统计 7
- 数据口径：仅展示层合并，领域数据（discovered_resource / harness_scan）零改动

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.15 侧边栏导航去重（Resource Capabilities 独立项移除）（2026-09-11）

### 已完成
1. **问题**：用户截图指出侧边栏「本地资源」组下 Local Resources 与 Resource Capabilities 两个平级项看起来重复（能力索引实为本地资源的从属功能，且页面顶部已有「能力索引」按钮入口）。
2. **修复**：lib/navigation.ts 移除 Resource Capabilities 独立导航项（同时清理未用 BrainCircuit import）；保留 Local Resources / Task Intelligence；能力索引从 Local Resources 页面顶部按钮进入，URL /resources/capabilities 仍可直达。
3. **联动正确**：isNavItemActive 已支持子路径前缀匹配，/resources/capabilities 页 TopBar 标题与侧边栏高亮自动回退到 Local Resources；Command Palette 引用同一 navGroups 自动同步。

### 验证结果
- lint 0/0、tsc 0、build 通过
- 浏览器实测：侧边栏仅剩 Local Resources / Task Intelligence；页面内「能力索引」按钮仍在；/resources/capabilities 可访问、TopBar 显示 Local Resources、控制台 0 error

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.16 开源发布准备（2026-09-11）

### 已完成
1. **发布前安全审计**：被跟踪代码无真实密钥/token/secret（关键词命中均为业务词如 formatTokens）；hermes adapter 确认不读取 api_key/secret/authorization/Bearer（只读模型/Provider/base_url 元数据）；git 历史无 .env 提交；数据库 data/ 未被跟踪。
2. **临时文件清理**：`.tmp-user-image.png` 已 git rm --cached 并物理删除；`.gitignore` 追加 `.tmp-*`。
3. **README 截图更新**：4 张预览图全部重新实拍（01-dashboard 271/268/6/140；02-resources 271/7/1h/4；03 按类别技能卡区；04 Hermes 主配置详情），README 预览表与「当前真实数据基线」同步为 API 实测数字（271/268、skill 259/plugin 4/prompt 2/rule 6、harness 7：hermes 140/doubao 105/cursor 19+1/codex 3/claude 空根/project-agents 2）。
4. **Docker/CI 核验**：Dockerfile + docker-compose.yml 存在；CI（npm ci→lint→tsc→db:init+db:check(独立 ci.db)→build）不依赖本地数据库；本机无 docker 命令，真实引擎验证记为环境依赖项（P4-4 同结论）。
5. **发布前完整回归**：lint / tsc / db:check / build 全绿。

### 验证结果
- lint ✅ / tsc ✅ / db:check ✅ / build ✅
- 敏感审计 ✅（无密钥、无 .env、无数据库入库、adapter 不读密钥）
- 截图已更新并同步 README ✅
- Docker 真实引擎：❌（本机无 docker 命令，环境限制，不阻塞发布）

### 当前状态
- 阶段完成；未越界；Git：待提交（含 .gitignore/.tmp 删除/README/截图）
- 遗留：git remote 为空——推送需用户提供 GitHub 仓库 URL 或确认创建方式

---

## S1.17 页面体验打磨（口径统一 + 链接修复）（2026-09-11）

### 已完成
1. **Harness 统计口径统一**：首页「Harness 框架」（byHarness 键数=有资源）与资源页「命中的 Harness」（filter found，含 Claude 空根）不一致（6 vs 7）→ 资源页改为「有资源的 Harness」= filter(found && resourceCount>0)，两页统一为 6。
2. **标签准确性**：首页「Hermes 技能 · 你的主力」实为 Hermes 全部资源（140 含插件/人设/配置）→ 改为「Hermes 资源 · 你的主力」。
3. **信息补充**：首页 HeroStats 补充「上次扫描 xxx · 数据只存本地库」时间行（此前 lastScannedAt 字段存在但未渲染）。
4. **链接修复**：首页技能画廊「查看全部 →」链接到 /resources?harness=hermes，但资源页不支持该 query → ResourceTable 增加 initialHarness prop，资源页从 URL 读取初始过滤，链接现在真正生效（进入即过滤 Hermes）。
5. **按钮一致性**：首页「重新扫描」从 outline 改为实心主色，与资源页主操作样式统一。

### 验证结果
- lint ✅ / tsc ✅ / build ✅
- 浏览器实测：首页显示「上次扫描 1 小时前 · 数据只存本地库」+「Hermes 资源 · 你的主力」；资源页「有资源的 Harness 6」与首页「Harness 框架 6」一致；/resources?harness=hermes 进入即过滤；控制台 0 error

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.18 移除 TopBar 演示工作区切换器（2026-09-11）

### 已完成
1. **问题**：用户截图指出 TopBar 左侧「工作区」切换器（Acme AI / 个人空间）——P1 早期演示组件，点击仅弹"演示"toast，与项目零 Demo 原则冲突，当前单机本地资源产品无多工作区概念。
2. **修复**：移除 WorkspaceSwitcher 组件及 Building2 / ChevronsUpDown import；TopBar 左侧现为 [移动端菜单] + 当前页面标题，更简洁。

### 验证结果
- lint ✅ / tsc ✅ / build ✅
- 浏览器实测：TopBar 无 Acme AI / 工作区字样，直接显示当前页标题；控制台 0 error

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.19 资源详情页增强 + 技能画廊交互（2026-09-11）

### 已完成
1. **资源详情页 · 如何使用折叠**：usage 超过 180 字符自动折叠（line-clamp-4 + 「展开全部/收起」），长说明不再占满整页。
2. **资源详情页 · 相关资源区块**：同 Harness 的其他真实资源（同类型优先，最多 4 个），点击进入各自详情；直接走 Service fetch，不污染 Store 列表状态。
3. **技能画廊 · 分类切换**：从 8 个精选技能提取真实分类 Tab（autonomous-ai-agents / media / mlops / research / software-development），点击过滤。
4. **技能画廊 · 悬停预览**：卡片 hover 弹出完整说明浮层（pointer-events-none，不推挤布局），看清全文再决定是否进入详情。

### 验证结果
- lint ✅ / tsc ✅ / build ✅
- 浏览器实测：画廊 5 个真实分类 Tab + 悬停浮层弹出完整说明（截图确认）；详情页「相关资源」区块渲染；控制台 0 error

### 当前状态
- 阶段完成；未越界；Git：待提交

---

## S1.20 真实 AI Provider 接入（方案 C）+ LLM Provider 配置页（2026-09-12）

### 已完成
1. **LLM 客户端层**（`lib/ai/` 五文件）：API Key 解析 = 环境变量 `LLM_API_KEY`/`HERMES_CUSTOM_OPENAI_API_KEY` → 读取 `~/.hermes/.env` 的 `HERMES_CUSTOM_OPENAI_API_KEY`（Hermes 实际存放位置，零额外配置）；baseUrl 默认 tokenrhythm `/v1`，模型默认 `deepseek-v4-flash-0731`；`AiError` 5 码（CONFIG_MISSING/TIMEOUT/NETWORK/API_ERROR/PARSE_ERROR）；OpenAI 兼容非流式 `chatCompletion`，超时 25s；Key 只服务端进程内读，不进 DB / 不进 Git / 不进前端。
2. **场景 A · 任务分析 LLM 增强**：`analyzeTaskWithLLM` 先跑 Heuristic 全流程落库（保证证据链可追溯），再 LLM 覆盖 taskType/summary 并标 `strategy=llm-assisted`，任何失败静默回退 Heuristic。实测 3/3 识别准确（自动化→automation、会议纪要→text_summary、短视频脚本→content_creation），3.3-5.2s。
3. **场景 B · 技能 AI 解读**：资源详情页「生成解读」按钮 → `POST /resource-discovery/resources/[id]/interpret` → LLM 输出「一句话总结 + 能做什么 + 怎么用」Markdown，未配置 Key 返回 501 LLM_NOT_CONFIGURED。
4. **修复 API 双前缀 404 bug**：`lib/api/client.ts` BASE=`/api/v1` 但 task-intelligence.ts（6 处）/ resource-analysis.ts（5 处）路径重复 `/api/v1/api/v1/...` 导致任务分析页红条；全库清零（教训：绝不用 PowerShell `Set-Content` 写 .ts，会 GBK 乱码；用 node -e fs.writeFileSync 或 Edit）。
5. **LLM Provider 配置页（Settings → AI Provider）**：参考 Hermes config.yaml 字段（base_url / model / key_env）设计：
   - 新表 `llm_provider_config`（单行 id=default；base_url/model/api_key/updated_at）+ migration 0007；
   - 配置生效优先级：**手动配置（DB）> 环境变量 > Hermes 自动发现 > 内置默认**；
   - API：GET/PUT/DELETE `/api/v1/ai/provider-config` + POST `/test`（真实连接测试，返回延迟/模型/错误）；
   - 前端表单：当前生效来源徽标（手动配置/环境变量/Hermes 自动发现/内置默认）+ base_url/model/api_key 输入（Key 为 password，留空不修改）+ 保存/测试连接/恢复自动发现 + 测试结果与错误分支；Key 读取接口只回显掩码 `****fTSs` 形式，绝不返回完整 Key；
   - 安全说明文案：Key 明文存本地 SQLite（data/ 不入 Git，等同 Hermes .env 行为）。

### 验证结果
- lint ✅ 0/0 / tsc ✅ / build ✅ / db:check ✅（migration 已应用且 schema 一致）
- API 冒烟全过：GET 初始=hermes 自动发现（baseUrl/model/keyConfigured/keyMasked 正确）→ PUT 保存=manual → GET 掩码 `****1234` → POST test 无效 Key 如实返回网络错误 → DELETE 恢复 hermes；真实连接测试 ok=true 1014ms deepseek-v4-flash-0731
- analyze LLM 增强回归：strategy=llm-assisted / content_creation ✅；interpret 回归：deepseek-v4-flash-0731 / 428 字 Markdown ✅
- /settings 页面 HTTP 200 且 SSR 含「AI Provider」区块与加载态；服务端无错误日志
- 已知问题：浏览器自动化通道本次不可用（环境限制），页面交互以 API 冒烟 + SSR 验证覆盖；migration 状态簿曾与磁盘表不同步（0006 表已存在但 drizzle 记录缺失/时间戳错位，且 meta 缺 0006_snapshot.json 导致 db:generate 重复生成 0006 内容）——已用「修正 0007 SQL + 对齐记录」方式解决，0007_snapshot.json 已生成保证后续 generate 基线正确

### 当前状态
- 阶段完成；未越界；未修改原始 Harness 文件；Git：待提交

---

## S1.21 Task Intelligence 页「技能使用建议」替换「最近分析」（2026-09-12）

### 已完成
1. 新增 `components/task-intelligence/skill-suggestions.tsx`：从真实技能资源取数（`fetchDiscoveredResources({type:"skill", parseable:true, pageSize:30})`，实际 258 个真实技能），按 resourceId 去重（Set），优先挑选带 usage 元数据的技能，最多展示 6 条。
2. 卡片交互：点击卡片跳转 `/resources/[id]` 查看真实来源；「复制使用方式」按钮把 `【技能名】使用方式：<usage|description>` 复制到剪贴板，用户可粘贴到对应 Harness（如 Hermes）使用 —— 仅指引不执行，符合只读边界；复制后按钮临时变「已复制 ✓」。
3. 状态齐备：loading（骨架加载文案）/ error（如实显示）/ 空态（暂无可用技能建议）。
4. Task Intelligence 页：删除 HistoryList 组件与「最近分析」Card，替换为 `<SkillSuggestions />`；清理失效 import（useEffect/Skeleton/ArrowRight）与 handleAnalyze 中的 fetchHistory 调用；store 历史字段保留（persist 兼容，未清理属有意保留）。

### 验证结果
- lint ✅ 0 错误 / tsc ✅ / build ✅（14 条路由全过）
- 生产服务重启后 /task-intelligence HTTP 200；SSR 含「技能使用建议」✅、不含「最近分析」✅
- API 冒烟 ✅：type=skill&parseable=true 返回 total=258（真实数据），示例 5 条均带 usage 元数据
- 浏览器自动化通道仍不可用（环境限制），页面交互以 API + SSR 覆盖
- 原始 Harness 文件零修改

### 当前状态
- 阶段完成；未越界；Git 待提交（push 仍受代理未运行阻塞：commit 834878d / 331dfb0 待推送）

---

## S1.22 技能建议改「预设问题」+ 详情页 AI 解读结构化 + 画廊复制按钮（2026-09-12）

### 已完成
1. **「技能使用建议」改为预设问题形态**（用户纠正方向）：每条 = 真实技能 + 一条预设问题——点击「复制问题」把可直接提问的指令复制到剪贴板，粘贴到对应 Harness（如 Hermes）即可使用；预设问题优先取真实 usage（触发方式），否则基于真实 description 转成任务指令（如「帮我写一篇小红书图文笔记」）；不重复（resourceId 去重）。
2. **资源详情页 AI 解读 → 「如何使用」结构化**：服务端 interpret 改为输出 JSON（summary / whatItDoes[] / howToUse[]），解析失败回退原始 Markdown（不伪造）；前端分区展示「一句话总结 + 它能做什么 + 怎么用（步骤编号）+ 复制使用方式」，LLM 未配置时提示去 Settings → AI Provider 填写。
3. **首页技能画廊**：悬停预览新增「复制使用方式」按钮（与卡片同 hover 组，复制「技能名 + 使用方式」）；分类切换保持。
4. **GitHub push 完成**：直连成功，S1.20/S1.21 全部 commit 已推送，master 与远端一致（efe1eda）。
5. 修复：生产服务进程因会话回收退出导致页面进不去——已用 Start-Process 重启并验证 HTTP 200。

### 验证结果
- lint ✅ 0 错误 / tsc ✅ / build ✅
- /task-intelligence HTTP 200，SSR 含「预设问题」副标题 ✅
- interpret 真实 API 回归 ✅：summary + whatItDoes 4 条 + howToUse 3 条 + rawMarkdown 空（结构化成功）+ model=deepseek-v4-flash-0731；偶发一次 500（LLM 抖动）已被错误态+重试覆盖，重试 200
- 画廊/详情页交互为客户端渲染，SSR 主体为 RSC 编码，交互验证待浏览器通道恢复
- 原始 Harness 文件零修改

### 当前状态
- 阶段完成；未越界；Git 待提交（S1.22）；master 已与远端同步（S1.20/S1.21 已推送）

### S1.22 修正（2026-09-12 用户反馈）
- 用户截图指出「技能使用建议」仍显示 usage/描述原文（如 sheet 的强制前置条件、doubao-pdf 英文说明），不是「预设问题」。
- 修正：presetQuestion 改为基于真实 description 第一句生成「帮我用「技能名」：目的」可提问指令（剔除 本技能/用于/负责/帮助 等引导词，英文描述回退技能名模板，短 usage 兜底）；真实数据验证输出自然（如「帮我用「ppt」技能：飞书幻灯片：创建和编辑幻灯片」）。
- lint/tsc/build ✅；生产重启 HTTP 200。

### S1.23 主题功能（2026-09-12，模仿 GlassTodo token 化范式）
- 设置页新增「外观 · 主题」：默认（深紫）/ 暖色（暖棕玻璃）/ 冷色（冷蓝玻璃）/ 浅色 四套预设，分段按钮即时切换。
- 机制：html[data-theme] 覆盖 globals.css 的 .dark token 值（主题=换 token）；layout 内联脚本 hydration 前从 localStorage('aiw-theme') 恢复防闪烁；localStorage 仅存 UI 偏好。
- 浅色主题下对 187 处 border-white/bg-white 硬编码做全局补偿 CSS（半透明黑），避免完全隐形。
- 验证：lint ✅ / tsc ✅ / build ✅；生产重启 HTTP 200；构建 CSS 确认含 data-theme=warm/cool/light 规则。

### S1.24 外观体系完整化（2026-09-12，复刻 GlassTodo 外观/背景）
- 设置页「外观」拆为两组：外观（主题四套 + 玻璃效果 + 减少动效）+ 背景（纯色/流体/壁纸、多图壁纸 IndexedDB 存储、显示方式/位置九宫格、Ken Burns、多图轮播、壁纸透明度、色调/颜色深浅/背景亮度/玻璃模糊度/磨砂度 滑块）。
- 新增 useAppearance（Zustand persist，localStorage 仅存 UI 偏好）+ AppearanceLayer（应用 data-theme/data-bg/data-glass/data-motion + CSS 变量，渲染流体/壁纸/雾化背景层）+ lib/wallpaper-db.ts（IndexedDB 存压缩壁纸，canvas 最长边 1600/JPEG 0.85）。
- workspace 布局内容容器 relative z-10 透明化，背景层 fixed z-0 透出；流体渐变复用 GlassTodo 的 hsl(--bg-hue) 多层 radial+linear 公式。
- 防闪脚本改读 aiw-appearance（兼容旧 aiw-theme）。
- 验证：lint/tsc/build ✅；浏览器实测：流体渐变生效、色调滑块联动、壁纸真实图片渲染为全站背景、IndexedDB 持久化、硬导航主题恢复、外观/背景全控件渲染。

### S1.24b 界面框架毛玻璃化（2026-09-12，用户反馈后补充）
- 侧边栏 / 顶栏由不透明 bg-background 改为 bg-background/70 + backdrop-blur-xl：壁纸 / 流体背景可贯穿整个页面，不止内容区。
- 「玻璃效果」开关语义扩展：关闭时 aside / header 恢复实色（globals.css data-glass=off 规则）。
- 验证：浏览器实测壁纸下顶栏/侧边栏 70% 透明 + blur(24px)；glass off 时实色 rgb(10,10,12) 无 blur；内容卡片照常显示在壁纸上。

### S1.25 全页面背景贯穿（2026-09-12，用户确认「整个页面都受背景影响」后实现）
- bg-surface-1 大面积卡片（metric-card / agent-card / projects-overview / quick-actions / module-placeholder 等）玻璃开启时改为 72% 半透明 + blur(--glass-blur)，壁纸 / 流体贯穿到卡片层。
- 移动端抽屉（SheetContent）改 bg-background/80 + backdrop-blur-2xl；命令面板 Command 改 bg-popover/90 + backdrop-blur-xl。
- 玻璃效果关闭时所有卡片 / 抽屉恢复实色。
- 验证：浏览器实测卡片 oklab(…/0.72) + blur(16px)；glass off 实色 rgb(16,16,20) 无 blur；壁纸整页渲染正常；lint/tsc/build ✅。

### S1.26 完善收尾（2026-09-12，用户确认按建议顺序完善）
- README 同步：新增「技能使用建议（S1.21–S1.22）」「外观与主题（S1.23–S1.25）」两小节。
- 顶栏新增「重新扫描」按钮（RefreshCw 图标，右侧首位）：调用 runResourceScan，成功后 toast + dispatch `aiw:rescan` 事件，Dashboard 监听事件自动重拉数据；扫描中旋转动画。
- 浅色主题修复：bg-black/30、bg-black/20 深色底（输入框/代码块）在 light 下补偿为浅灰底 rgba(0,0,0,0.06/0.04)；遮罩 bg-black/10 不受影响。
- AI Provider 连接页：新增官方端点快捷选择（OpenAI / DeepSeek / Anthropic / Kimi / 智谱 + 自定义），一键填入 base_url，仍由用户填 Key / 模型。
- 技能画廊确认已具备分类切换 + 悬停预览 + 复制（S1.22 已实现，未重复开发）。
- 壁纸亮色对比度：实测 70% 底色 + blur 下标题/按钮/文字清晰可读，机制有效无需改动。
- 移动端巡检：resources / settings / dashboard 窄屏（634px）均正常渲染，无布局破坏。
- 验证：lint / tsc / build ✅；生产重启 HTTP 200 ✅；浏览器实测顶栏刷新按钮渲染、亮壁纸可读、settings Provider 端点按钮渲染 ✅。

### S1.27 可用模型列表（2026-09-12，用户需求：测试连接后刷新可用模型并可选择）
- lib/ai/client.ts 新增 listModels()：OpenAI 兼容 GET /models，Bearer 鉴权，过滤非对话模型（embedding/image/tts 等），失败返回 null 不抛错。
- 连接测试接口扩展：测试成功后顺带拉取端点模型列表，TestLLMResult / TestLLMResultDTO 增加 models?: string[] | null。
- Settings AI Provider：测试连接成功后显示「可用模型」选择区（点击模型自动填入 Model 输入框 + 提示已选择）；端点不支持 /models 时提示手动输入。
- 验证：真实 Hermes tokenrhythm 端点测试 ok=true，拉取 19 个模型（glm-5.1 / minimax-m2.7 / kimi-k2.6 / qwen3.7-max 等）；浏览器实测「测试连接」→ 连接成功 1595ms → 可用模型列表渲染；lint / tsc / build ✅。

### S1.28 候选执行（2026-09-12，用户「执行候选」）
候选 1 · Dashboard 联动：HermesSpotlight 增加「AI Workspace 当前生效」badge（读取手动 Provider 配置的生效模型，叠加展示，不覆盖 Hermes 自身 config.yaml 事实）。
候选 3 · 任务分析 AI 增强入口：analyze 接口支持 strategy 参数（heuristic / llm-assisted），前端「AI 增强」开关（默认开，未配置 Key 时服务端静默回退）；同时修复 toPlan 把 strategy 写死 heuristic 的回显 bug。
候选 4 · 官方端点标注：Anthropic 预设按钮 title 标注「chat 格式与 OpenAI 不同，建议经兼容中转」。
候选 2（Vercel 部署）挂起：待用户注册 Vercel 账号。
- 验证：lint / tsc / build ✅；浏览器实测「AI 增强」开关渲染、Dashboard 当前生效 badge 渲染；API 实测 heuristic → strategy=heuristic，llm-assisted → strategy=llm-assisted ✅。

补充（S1.28 收尾）：
- 候选 3 排查结论：LLM 增强链路正常（直测端点与系统路径均返回正确 JSON）。此前「任务内容为空，无法判断类型」为早期一次 LLM 异常输出被幂等复用所致；每次分析 LLM 覆盖会重新执行，复测「写一篇小红书文案」已返回 content_creation +「撰写小红书平台风格的推广文案。」✅ 无需改代码。
- 候选 4 完成：resources 列表页监听 aiw:rescan 事件，顶栏重新扫描后自动重拉概览（与 Dashboard 同模式）。
- Git push 根因修正：此前误用 -c http.proxy= 禁用了系统代理（git 全局代理 http://127.0.0.1:33210）导致直连失败；恢复默认代理后推送成功（aa517cf..4576f7f）。

### S1.29 候选 2/3/4 执行（2026-09-12，用户「234执行」）
候选 2（Vercel）挂起：本机无 ~/.vercel 登录态、无 vercel CLI，需用户注册 Vercel 并提供 token 才能部署。
候选 3 完成 · 资源详情页「相关资源」推荐：GET /api/v1/resource-discovery/resources/[id]/related（真实派生，只读）——共享 ResourceCapability 能力标签优先（按共享数降序），其次同 Harness+同类型可解析资源；排除自身与用户隐藏资源；每项返回真实 reason（「共享 N 个能力标签」/「同 Harness · 同类资源」）。Repository 新增 findRelatedResources（JOIN capability 别名自关联 + 同类补充），service 新增 getRelatedResources，store 新增 relatedResources/relatedLoading + fetchRelatedResources，详情页新增 RelatedResources 区块（可点击溯源）。实测：能力最多资源（12 个标签）→ 8 条相关，shared=8/4/0 排序正确。
候选 4 完成 · 官方端点预设补充：新增通义千问 DashScope、OpenRouter、本地 Ollama（无需 Key）、豆包 Ark 四个预设，全部 OpenAI 兼容格式 + 悬浮提示。
- 验证：lint / tsc / build ✅；API related 实测 ✅（sandev-project-homepage 8 条同类、能力密集资源 8 条含共享排序）；浏览器实测详情页相关资源区块渲染 ✅；零 Demo 数据、原始 Harness 零修改 ✅。

### S1.30 Agents 真实化（方案 B）+ Hermes 文案中性化（2026-09-12，用户「选 B，并去掉页面 Hermes 字眼」）
**Agent 模型真实化（删除假枚举）**
- lib/types.ts：删除 MODEL_OPTIONS / ModelId 假枚举（豆包 Pro/Lite、GPT-4o、Claude Sonnet），ModelId 改为真实模型字符串，modelLabel 直接回显模型名。
- 新增只读端点 GET /api/v1/ai/models（service.listAvailableLLMModels → getEffectiveLLMConfig + listModels 真实拉取 /models；Mock 返回真实空态 models=null）；lib/api/ai.ts fetchAvailableModels + lib/services/ai.ts 双模式入口 + mock/ai.ts 空态实现。
- components/agents/agent-form.tsx：模型区改为真实端点模型 chips（默认选中生效模型）+ 刷新按钮；未配置/拉取失败时手动输入兜底并引导去 Settings；初始拉取仅异步 setState（满足 eslint set-state-in-effect）。

**Agent 运行真实化（去掉随机假运行）**
- 新增 lib/runtime/llm-provider.ts：createLLMProvider({ resolveConfig })，execute 经 lib/ai/chatCompletion 真实调用当前生效 LLM 配置；未配置 Key/BaseUrl 返回可读 provider_unavailable 错误（不造假数据）；usage 真实透传；stream() 仍契约桩。
- lib/runtime/contracts.ts：ProviderId 增加 "llm"；RuntimeRequest 增加 systemPrompt?: string。
- db/service.ts：realRuntime 注册 llm Provider（resolveConfig 延迟解析 getEffectiveLLMConfig）；runAgent 改为 provider:"llm" + systemPrompt 注入 + 落库真实 provider/usage。
- lib/ai/client.ts：ChatResult 增加 usage（解析 OpenAI 兼容响应 prompt/completion/total tokens）。
- POST /api/v1/agents/[id]/runs 支持 body.input；lib/services/http+mock/agents.ts runAgent 增加 input 参数；stores/workspace.ts runAgent(agentId, input?)。
- Agent 详情页：运行区新增「给 Agent 的指令」输入框（Enter 可提交）；运行成功后 fetchAgentRuns(agentId, true) 强制重拉明细（修 fetchAgentRuns 缓存守卫导致列表不刷新）；toast 去掉「（演示）」字样；空态文案同步更新。

**Hermes 文案中性化（UI 可见描述，12+ 处）**
- hermes-spotlight：本地运行配置 / 你的智能体人设 / 本机运行时读取的全局配置；hero-stats：本机主力资源；skill-gallery：精选本机技能；category-browser：本机技能；resource-detail：本地运行配置 + 提示改为复用本机 .env Key；llm-provider：本机自动发现 / 本机 .env / 等同本机 .env；dashboard 类型描述：本机 Profile / 本机 superpowers。
- lib/discovery/adapters/hermes.ts usage 元数据文案中性化 + SQLite 存量 1 条同步更新。
- 保留边界：真实 harness 名数据（badge）与真实文件原文（SOUL.md / SKILL.md 内容）属资源数据，不改（只读 + 可溯源）。

**验证结果**
- lint 0/0 ✅ / tsc ✅ / build（Real）✅；生产重启 HTTP 200 ✅。
- API：GET /ai/models 返回 19 个真实模型（glm-5.1 / deepseek-v4-flash-0731 等），configured=true ✅；真实运行闭环 succeeded（1715ms / 57 tokens；3113ms / 35 tokens，input/output tokens 真实落库，provider=llm）✅。
- 浏览器实测：新建页 19 个模型 chips + 刷新按钮 ✅；创建「客户支持助手」→ 详情页指令输入框 → 真实运行 → 运行历史实时刷新（2 次 · 成功率 100% · 85 tokens · 真实耗时）✅；dashboard 全站 UI Hermes=0（/resources /settings /agents /projects /task-intelligence 全 0；dashboard 仅剩 3 处真实 SOUL/SKILL 文件原文）✅；控制台 0 错误 ✅。
- 临时测试 Agent（PowerShell 编码乱码）已从 SQLite 清除；原始 Harness 文件零修改。


### S1.31 Agent 运行真实输出展示（2026-09-12，用户「继续继续」→ 候选 1）
- agent_run 表新增 output 列（migration 0008，ALTER TABLE ADD output text，可空兼容旧数据）；db/service runAgent 落库 result.output（真实 LLM 返回文本），mock/agents runAgent 同构透传；repository updateRun patch 支持 output。
- DTO/mapper/AgentRun 类型链路补 output 字段（http 与 mock 双模式一致）。
- Agent 详情页运行历史每行可点击展开（ChevronDown 旋转 + aria-expanded），展开显示完整输出（pre 等宽、max-h-64 滚动、长文本换行）；旧记录无输出时如实提示「S1.31 之前的旧记录」。
- **修复验证环境根因**：此前多次「改代码后 API 无效果」为 3000 端口被旧 next start 进程（pid 15980）占用、新进程 EADDRINUSE 所致（kill 过滤未匹配 `"next" start` 带引号命令行）；本次精确按端口/pid 清理后新 build 生效。
- 验证：lint 0/0 ✅ / tsc ✅ / build（清 .next 干净构建）✅；API 真实运行 3 次均 output 落库（如「您好，我是客户支持助手，随时为您高效解答问题。」36 tokens，provider=llm，input 22 / output 14）✅；tsx 直调源码确认链路（对照定位到旧进程）✅；浏览器实测展开 aria-expanded=true + 输出文本可见 ✅；原始 Harness 零修改 ✅。


### S1.32 移除 Cursor 残留（用户「cursor 相关的路径删了，是残余，现在没用过了」）
- lib/discovery/registry.ts：cursor / cursor-user 适配器从注册表移除（注释说明用户已停用 Cursor；adapter 文件保留，未来恢复时重新注册即可）。此后重新扫描不再探测 `.cursor` / `AppData\Roaming\Cursor\User`。
- 清理 SQLite 索引：DELETE discovered_resource where harness_id in ('cursor','cursor-user')（20 条：cursor 19 + cursor-user 1），外键级联清除 resource_analysis 38 条、resource_capability 129 条；resource_recommendation 无引用（预检 0）。
- 重新扫描（产品自身 scan 接口）刷新 harness_scans 快照：overview 不再包含 Cursor / Cursor User；资源总数 272 → 252（hermes 140 / doubao-skills 106 / codex 3 / project-agents 2 / claude 0）。
- 验证：lint 0/0 ✅ / tsc ✅ / build（清 .next 干净构建）✅ / API overview 无 cursor ✅ / 浏览器 /settings 无 Cursor、/resources 无 cursor harness（唯一 1 处「Cursor」为 hermes-skill-install 真实 SKILL.md 正文中的生态描述，属资源数据保留）✅ / 原始 Harness 文件零修改 ✅。


### S1.33 交互增强四合一（用户一次批准 4 个候选）
1. **Agent 表单模型分组 + 搜索**（components/agents/agent-form.tsx）：真实模型按厂商分组（DeepSeek/智谱 GLM/MiniMax/Kimi/通义千问/豆包/OpenAI/Anthropic/Google/开源/其他，按前缀推断），组标题含计数；顶部搜索框实时过滤（无匹配显示空态）；底部展示「N/total 个模型 · 当前选中」；手动输入兜底保留。
2. **运行失败错误面板**（app/(workspace)/agents/[id]/page.tsx + lib/format.ts）：新增 formatRunErrorCode 可读映射（provider_unavailable→Provider 不可用 等 9 类，未知码原样显示）；失败 run 展开区显示 errorCode 徽章 + 完整 errorMessage + 原始 code（role=alert）。真实验证：用不存在的模型跑一次真实失败（provider_unavailable / LLM API 错误 400）落库并展示。
3. **相关资源 × 使用建议联动**（db/repository.ts、db/service.ts、lib/api/resource-discovery.ts、components/resources/related-resources.tsx、resource-detail.tsx）：related 链路返回 usage（metadata.usage 为空时与详情页同口径回退 description，全部真实数据）；相关资源每项显示「使用建议：…」。**修复遗留 bug**：resource-detail.tsx 内联了一份早期 RelatedResources（同 Harness 简单版，props 是 harnessId/currentId/type）与 store 版（共享能力优先）重复，导致页面一直显示 store 残留旧数据——已删除内联版、统一用 store 版 `<RelatedResources resourceId={resource.id} />`，并清理 Share2/fetchDiscoveredResources 未使用 import。
4. **技能画廊打磨**（components/dashboard/showcase/skill-gallery.tsx）：分类 Tab 增加真实计数（全部 · 8 / software-development · 3 …）；active Tab 用 framer-motion layoutId 滑条指示 + aria-pressed；grid 以 category 为 key，切换分类时卡片重放入场动画。
- 验证：lint ✅ / tsc ✅ / build（Real）✅ / 浏览器实机 ✅（模型分组 7 组 19 个 + 搜索 kimi 过滤出 2 个；失败 run 展开显示「Provider 不可用 + code + 错误消息」；related 每条带真实使用建议且与 API 同源；画廊分类切换只显示对应分类真实技能）。新增验证用 Agent（模型 s1-33-not-exist-model）及其真实失败 run 保留在演示库，属真实数据。


### S1.34 任务分析输入区控件修复（用户截图指出）
- components/task-intelligence/task-intelligence-view.tsx：按钮/开关/示例三组控件此前挤在同一行且高度参差（h-8 / h-7 / 约 22px），窄屏换行混乱；现拆为两行：第一行「分析任务 + AI 增强开关」，第二行「示例 chips」（统一 h-7）。
- 开关打磨：轨道 h-4 w-7、滑块 size-3 用 top-1/2 -translate-y-1/2 精确垂直居中，开关位移对齐（开 14px / 关 2px），不再偏上。
- 验证：lint ✅ / tsc ✅ / build ✅ / 浏览器实机 ✅（第一行按钮+开关、第二行示例，视觉对齐）。


### S1.35 「AI 增强」开关滑块修复（用户截图指出）
- 根因：Tailwind v4 的 CSS transition（transition-transform / transition-[left]）在本项目 React 重渲染下触发 CSSTransition 卡死（currentTime 恒 0），滑块 left 被冻结在旧值 14px，导致开启态滑块贴在轨道右缘、切换不归位。
- 修复：去掉所有 CSS transition，改为纯类切换（开 left-[14px] / 关 left-[2px]），滑块位置由 JS 实测正确（开 14px、关 2px、往返正常、无动画卡死）。
- 验证：lint ✅ / tsc ✅ / build ✅ / 生产浏览器 DOM 实测 ✅；bu 自动化截图在该页面显示空白为渲染捕获环境问题（DOM 与 console 正常），不阻塞交付。


### S1.36 任务推荐评分修复（用户指出「候选资源没推荐好」）
- 根因：旧评分被「模板通用词 hits + 标签 confidence」主导——模板需求词（撰写/生成/平台/内容/创作…）对所有内容类技能几乎全命中，且命中 5 词即词法满分 0.65、confidence 权重 0.35 过重，导致不相关技能（电商选品、生成音频）与真正匹配技能同分挤入前排；用户任务原文词（小红书/文案）反向匹配全为 0。
- 修复（lib/task-intelligence/retriever.ts）：
  - 新增 userHits：真实用户任务原文词在能力文本中的命中，作为最强相关性信号；
  - 新评分 = 用户原文词 0.7 + 模板语义词 0.2 + 置信度微调 0.1；无任何用户真实信号直接淘汰；
  - other 分支同步改用用户词为主；
  - TASK_ANALYZER_VERSION bump 至 v2，旧 fingerprint 缓存失效重算。
- 实际效果（API + 浏览器实测「写一篇小红书文案」）：电商选品/seed-audio 等不相关项被淘汰；小红书图文笔记技能 doubao-newmedia-writing 升至 #2（0.9 分）；推荐从 8 项灌水收敛为 4 项高质量。数据周报→表格类第一、会议纪要→会议类第一，验证通用性。
- 验证：lint ✅ / tsc ✅ / build ✅ / API 200 ✅ / 生产浏览器实测 ✅。


### S1.37 Task Intelligence 推翻重设计（用户定三点 → 三态可决策出口）
- 定位变更：从「任务→拆解→能力需求→推荐」的分析报告，改为「任务 → 三个可决策出口」——有技能→复制预置问题去用；无技能→建议设计什么技能+创建提示词+直接生成按钮（仅文案，由用户决定是否创建）；只识别不执行。
- 新增模块（lib/task-intelligence/）：matcher.ts（三态判定，阈值 0.55/0.35 按真实数据标定）、preset-questions.ts（每技能 2~3 个嵌入用户任务的预置问题：直接执行/完整产出/按场景优化）、skill-proposal.ts（无匹配时的技能创建建议：建议名/描述/触发场景/工作流/自由度 + 创建提示词 + SKILL.md 草案，参考豆包 skill-creator-for-work 结构，确定性模板版不接 LLM）。
- 重构 components/task-intelligence/task-intelligence-view.tsx 结果区：态A 技能卡（预置问题选择+复制+复制来源路径+折叠证据）、态B 技能建议区块（创建提示词可复制+「直接生成完整方案」展开 SKILL.md 草案）、态C 边缘匹配提示；旧版拆解/证据/任务计划折叠进「查看分析详情」。
- 实测：态A「写一篇小红书文案」→4 技能卡带预置问题；态B「帮我预约明天下午的牙医」→automation-assistant 建议+创建提示词+SKILL.md 草案展开正常；不创建文件、不调外部 Harness、不接真实 LLM。
- 验证：lint ✅ / tsc ✅ / build ✅ / API 200 ✅ / 生产浏览器三态实测 ✅。


### S1.38 其他 Harness 能力描述完善化 + 噪声清除（用户提出「推荐全是豆包技能」）
- 背景：Task Intelligence 推荐几乎全来自 doubao-skills。数据核查：Hermes 实际被扫描（140 资源、548 能力标签）但排不上榜——根因是能力描述质量不均（部分 frontmatter 描述短/缺失）且章节标题噪声混入（"1. Confirm format (optional)"、"WeChat .silk voice messages (Windows)"），中文任务词命中吃亏。
- 分析器增强（lib/analysis/heuristic.ts，id heuristic-v1 → v3）：
  - 主能力描述兜底：description 为空/无意义/过短（<15 语义字符）时，从 SKILL.md 正文预览提取首个有意义段落（中文段优先），产出完整中文描述；
  - 完整的中文短描述（如「音频转文字:把语音消息和音频文件转写成文本」）不再判弱、予以保留（避免被英文正文覆盖）；
  - 标题噪声过滤：序号开头（"1. "、"0. "）、文件扩展名（.silk/.md/.json）、路径分隔符标题一律跳过；
  - 全部 harness 同一套规则公平重索引（fingerprint 幂等，v3 全量重跑：252 处理 / 250 成功 / 2 失败）。
- 实际效果：序号开头噪声标签归零；Hermes 能力描述与豆包同标准（如「Apple 备忘录(仅苹果电脑):通过 memo 命令创建、搜索、编辑备忘录」）；doubao 关键技能描述零回归；capability 总数 970 → 963（噪声清除所致）。
- 验证：lint ✅ / tsc ✅ / build ✅ / API 200 ✅ / 索引质量核查 ✅ / doubao 回归 ✅。
- 已知问题：Hermes 的 audio-transcription 等技能在中文任务下仍可能排不进前列——评分以中文词命中为主、模板词噪声仍存在、中英跨语言匹配是启发式天花板（待 LLM 语义匹配或后续评分调优）。


### S1.39 扫描即自动能力索引（开箱即用闭环）
- 背景：用户指出「转换不应只在特定命令时发生」——其他人使用本项目时，扫描动作本身就必须自动把技能描述转为可索引能力，且不影响原始 skill 内容。
- 修改（服务端闭环）：
  - db/service.ts `runResourceScan()` 末尾自动调用 `runIncrementalAnalysis()`——扫描即转换：新环境 / 新资源扫描后直接产出可检索能力标签，无需手动触发分析；
  - 幂等：指纹（sourcePath+mtime+metaHash）+ analyzerVersion 未变自动跳过；原始 Harness 文件全程只读；
  - 类型链同步：RunScanResult（lib/types.ts）+ RunScanResultDTO + toRunScanResult + Mock 空态加 `analysis` 字段（向后兼容）；
  - 前端反馈：store `runResourceScan` 返回扫描结果，资源页扫描成功 toast 显示「发现 N 个真实资源，自动索引 M 个能力」；
  - README 同步「扫描自动附带能力索引、原始文件零修改」说明。
- 验证：lint ✅ / tsc ✅ / build ✅；生产实测 POST /api/v1/resource-discovery/scan → scanRun completed、252 资源、7 harnesses、analysis {processed:2, skipped:250, analyzed:0, failed:2}（S1.38 已全量跑过故多数跳过，符合幂等预期）；原始 Harness 文件零修改。
- 已知问题：无新增；既有 2 个不可解析资源（failed=2）为历史已知。


### S1.40 扫描自动索引状态展示（资源页 + 能力索引页）
- 背景：S1.39 后「扫描即自动索引」已闭环，但刷新后没有持久可见的索引统计入口。
- 修改：
  - 资源页统计条新增「能力标签」卡：显示真实能力标签数（963）+ 上次自动索引时间（lastRunAt，来自 SQLite 聚合，刷新不丢），hint「扫描即自动索引」；
  - 能力索引页「分析器版本」卡新增 hint：上次分析时间 + 「扫描即自动索引」说明；
  - 全链路复用既有 getAnalysisStatus → AnalysisStatusDTO → toAnalysisStatusSummary（无新增 API / 表 / 字段）。
- 验证：lint ✅ / tsc ✅ / build ✅；生产实测 GET /api/v1/resource-analysis/status → {totalResources:252, analyzed:250, failed:2, capabilityCount:963, lastRunAt:…, analyzerVersion:heuristic-v3}；resources 页 200 ✅。
- 已知问题：无新增。


### S1.41 任务推荐双语扩展 + 候选池与并列排序修复（Hermes 等非豆包 Harness 进推荐榜）
- 背景：S1.38 后「转写音频」类中文任务推荐仍全是 doubao——根因①跨语言：中文任务词 vs 英文能力/资源名无法词形命中；②候选池 topN=6 过小，双语扩展后第一梯队同分并列（0.98×N）被按插入序截断；③测试任务 fingerprint 复用历史分析（同任务直接返回旧结果，曾误判为未生效）。
- 修改：
  - 新增 lib/task-intelligence/term-map.ts：AI/办公高频中英术语双向映射（audio↔音频、transcription↔转写、subtitle↔字幕、document↔文档等 ~60 条，克制收录避免噪声）；
  - retriever.ts：tokenizeTask 支持双语同义词扩展（默认关闭、向后兼容）；hay 加入 resourceName + expandText 双语扩展；候选池 topN 6→12；同分按 userHits（真实用户原文词命中数）次级排序；
  - reranker.ts：最终排序加次级键 score → userHits → harnessId → resourceName（确定性，非硬编码）；
  - lib/task-intelligence/types.ts：RetrievedItem 增加 userHits。
- 实际效果（全新措辞任务验证，heuristic）：
  - 「把录音整理成文字稿，再加时间轴标记」→ Hermes audio-transcription（0.72）第 4 名、wechat-voice-stt（0.63）第 5 名进榜；
  - 「转写这段音频，输出字幕文件」→ doubao byted 系列 0.83-0.93 靠前（长描述 forward 结构性优势，Hermes 排 7-8，可接受边界）；
  - 回归「统计本周店铺销售数据生成汇总」→ 数据类 doubao 正常推荐，无异常。
- 验证：lint ✅ / tsc ✅ / build ✅ / 生产 API 实测 ✅（reused:false 确认新计算）/ 回归 ✅ / 原始文件零修改 ✅。
- 已知问题：描述长度差异导致的 forward 分差仍是启发式天花板（简洁但精准的 Hermes 描述在模板词多的任务下可能排 7-8 名）；不做硬编码修正，后续可接 LLM 语义匹配治本。


### S1.42 资源列表类型/Harness 列宽修复（徽标粘连）
- 问题：资源列表「类型」列 Badge 与「Harness」列文字粘连（如「Prompt 提示词ermes 赫尔墨斯」）——类型列 w-16(64px) 放不下「Prompt 提示词」等长标签，溢出挤入下一列。
- 修改：components/resources/resource-table.tsx——类型列 w-16→w-24(96px) 且 Badge 加 max-w-full truncate 兜底；Harness 列 w-28→w-36(144px) 且加 title 完整文本提示；表头同步加宽。
- 验证：tsc ✅ / lint ✅ / build ✅ / 生产实测 DOM 测量类型徽标与 Harness 列边界不重叠 ✅ / 无页面级 console 错误（favicon 404 为历史既有、非本次改动）✅。
- 已知问题：无新增。



---

### S1.43 清理 S1.33 时代残留演示 Agent 数据（Agents 页左下角乱码卡片）

- 背景：用户在 Agents 页左下角发现一张异常卡片——名称显示乱码、模型为 s1-33-not-exist-model、0.0% 成功率。定位：该数据来自 S1.33 阶段（当时仍为演示数据策略）写入 SQLite 的历史残留，并非当前代码生成：seed 策略早已（S0）改为「不再种任何演示数据」，但历史库未清，导致刷新后仍显示。
- 数据核查（SQLite 直查）：gent 表 2 条——「客户支持助手」（deepseek-v4-flash-0731）与「?????? Agent」（name 存的就是乱码字符、model s1-33-not-exist-model、createdAt 2026-09-12T07:37）；gent_run 表 8 条（其中 1 条 failed run 属于该测试 Agent）；gent_capability / project_agent 均无关联。
- 处理：执行 
pm run db:reset（仅清空 6 张演示业务表，真实资源线不动）。
- 清空结果：agent 0 / agent_run 0 / capability_definition 0 / agent_capability 0 / project 0 / project_agent 0；真实资源线完整保留：discovered_resource 254 / resource_capability 3334 / resource_analysis 865 / harness_scan 198 / task_analysis 35 / task_plan 3。
- 页面验证：/agents 恢复真实空态「还没有 Agent · 创建第一个智能体，开始你的 AI 工作流」，乱码卡片与 s1-33-not-exist-model 消失。
- 验证：lint ✅ / tsc ✅ / build ✅ / 生产页面实测 ✅。
- 已知问题：无新增（早前已确认的悬浮控件为豆包浏览器注入、非项目代码，与本修复无关）。


---

### S1.44 新建 Agent 表单「系统提示词专业润色」

- 背景：用户在新建 Agent 时希望系统提示词能一键润色为专业版本。
- 实现：
  - 后端 `db/service.ts` 新增 `polishSystemPrompt(prompt)`：走真实 LLM（OpenAI 兼容 chat/completions，复用 `chatCompletion` + `getEffectiveLLMConfig` 优先级链）；System Prompt 为「资深提示词工程师」——只输出润色后正文、结构清晰（角色/职责/边界/流程/输出规范）、保持原意不臆造、语言与原文一致、空或无效输入如实拒绝（不伪造）；未配 Key 抛 `LLM_NOT_CONFIGURED`；输入为空抛 `VALIDATION_ERROR`；LLM 未返回有效结果如实报错。
  - 新端点 `POST /api/v1/ai/polish-prompt`：zod 校验 `{prompt≤4000}`，统一 `handleError`。
  - 前端 `components/agents/agent-form.tsx`：系统提示词 Textarea 下方新增「专业润色」按钮（Wand2 图标；空输入禁用；润色中显示 spinner +「润色中…」；成功回填润色结果并提示「已用 {model} 润色完成」；失败按 code 分支：LLM_NOT_CONFIGURED → 引导去 Settings → AI Provider，VALIDATION → 提示先输入，其余展示真实原因）。
  - `lib/api/server.ts handleError` 增强：`AiError`（LLM API_ERROR/TIMEOUT/NETWORK/PARSE_ERROR）→ HTTP 502 + 真实 message 透传，不再落入笼统 500「服务器内部错误」。
- 验证：API 冒烟——空输入 `{"prompt":"  "}` → 400 VALIDATION_ERROR「系统提示词为空」；正常输入「你是数据分析师，帮我写周报」→ 200 返回结构化专业提示词（角色定位/职责范围/工作流程/输出规范，deepseek-v4-flash-0731）；lint ✅ / tsc ✅ / build ✅ / 生产重启 /agents/new 页面按钮渲染 ✅。
- 已知问题：上游 LLM 端点偶发 503（限流/服务不可用）时会返回 502 + 具体错误文案，属外部依赖行为，非本项目缺陷。


---

### S1.45 个人资料页（真实身份 + 本机环境事实）

- 背景：Sidebar 底部用户菜单「个人资料」此前是 toast 占位；且用户区头像/昵称/邮箱（林晓 / linxiao@acme.ai / Owner · Acme AI）为硬编码假数据，违反「零演示数据」原则。
- 实现：
  - `db/schema.ts` 新增 `user_profile` 单行表（id="default"），`drizzle/0009_user_profile.sql` + journal 追加；`db/repository.ts` 新增 `getUserProfileRow` / `upsertUserProfile` / `countHarnessScans`。
  - `db/service.ts` 新增 `getProfile()`（DB 自定义信息 + 本机真实事实：os.userInfo/hostname/platform/release、DB 路径与大小、LLM 生效配置 source/model/configured、资源 254 / 扫描 198 计数）与 `saveProfile()`（avatarColor 枚举校验）。
  - 新端点 `GET/PUT /api/v1/profile`；`lib/api/profile.ts` + `lib/services/profile.ts` 客户端。
  - 新页面 `/profile`：`ProfileForm`（client）——头像 6 色渐变可换、昵称（留空回退本机用户名）/职位/简介可编辑、保存；本机环境事实卡（server 渲染只读）。
  - 消除硬编码假身份：Sidebar `UserMenu` 与 TopBar `AccountMenu` 改为 fetch profile（真实用户名/主机名），「个人资料」「偏好设置」改为跳转 /profile、/settings；命令面板移除 Acme AI/个人空间假工作区切换，改为只读「本机工作区」。
- 验证：db:migrate ✅ / db:check ✅ / GET 200（Administrator、DESKTOP-J8HRMN8、win32 x64、4.95MB、254 资源、198 扫描）✅ / PUT 保存与清空 200 ✅ / 非法配色 400 VALIDATION_ERROR ✅ / lint ✅ / tsc ✅ / build ✅ / 生产 /profile 页面渲染 ✅。
- 已知问题：无。


---

### S1.46 头像本地上传

- 背景：S1.45 个人资料页头像仅支持渐变配色 + 首字符，用户要求支持本地上传真实图片。
- 实现：
  - `db/schema.ts` `user_profile` 新增 `avatar_path`（migration 0010）；DB 只存 `data/avatars/` 相对路径，图片本体落文件系统（项目根 `data/avatars/`）。
  - `db/service.ts`：`uploadAvatar(dataUrl)`（正则解析 MIME → png|jpeg|webp 白名单、≤2MB、UUID 文件名、替换时删除旧文件、路径穿越防护——`deleteAvatarFileSafe` 限定 avatars 目录内）、`clearAvatar()`（删文件 + 清引用）、`getAvatarFile()`（供图片端点）；`getProfile` 返回 `avatarUrl`（`/api/v1/profile/avatar?v=<updatedAt>` 防缓存）。
  - 新端点 `POST/DELETE/GET /api/v1/profile/avatar`：上传/移除/读取（NextResponse 二进制流 + Content-Type + `Cache-Control: private, max-age=3600`；无头像 GET 404）。
  - `ProfileForm`：头像 hover 遮罩 +「上传头像」「移除」按钮 + 隐藏 file input（accept png/jpeg/webp）；前端类型/大小预检、上传中 loading、成功 toast 回显；无图时保留 6 色渐变 + 首字符回退。
  - Sidebar / TopBar 用户头像支持显示上传图片（有图显示 AvatarImage，无图回退渐变首字符）。
- 验证：db:migrate ✅ / db:check ✅ / 非法类型 400「头像格式不支持」✅ / 上传 200 + avatarUrl ✅ / GET 头像 200 image/png ✅ / 移除 200 + avatarUrl null ✅ / 移除后 GET 404 ✅ / avatars 目录文件随移除清理 ✅ / lint ✅ / tsc ✅ / build ✅ / 生产 /profile 页面「上传头像」渲染 ✅。
- 已知问题：无。


---

### S1.47 四项候选执行

- ① Git 提交 + push：S1.44（系统提示词润色）+ S1.45（个人资料页）+ S1.46（头像上传）一并提交为 `7812ef8`（`feat(S1.46): 个人资料页 + 头像本地上传 + 系统提示词专业润色`），已推送 GitHub `master`（`95cf5ea..7812ef8`）。`docs/AI Workspace 项目-QA测试方案与报告.md`（此前 QA 技能产物、非本次范围）未纳入提交，仍留在工作区，如需入库请告知。
- ② 资源详情页「使用建议 · 预设问题」：新增 `components/resources/suggested-prompts.tsx`——按资源类型（skill/agent/command/rule/prompt/mcp/plugin/other）8 组模板确定性生成 3 条预设问题，真实注入 `name` 与截断 `description`；点击复制，提示「去支持该 Skill 的 Harness 使用」。不依赖 LLM、零伪造。同时修复「相关资源」区块在页面重复渲染（page.tsx 与 resource-detail.tsx 各一处 → 保留 resource-detail 内一处）。
- ③ Agent 表单模型分组复核：厂商分组（vendorOf/groupModels）+ 搜索过滤 + 刷新按钮在 S1.33 已实现，本次清理 `vendorOf` 中 qwen 被「通义千问」分支提前拦截导致「开源模型」分支永不可达的冗余判断（开源分支改为 llama/mistral/gemma）。
- ④ 运行失败错误面板复核：Agent 详情页展开 failed 运行记录时展示错误卡（`formatRunErrorCode` 中文可读标签 + `errorMessage` + 原始 `code`）已实现（更早阶段）；本次仅复核 RUN_ERROR_LABELS 映射完整性。当前 `agent_run` 表 0 条记录，无真实 failed 样本可用于 UI 实测，面板代码路径已静态复核。
- 验证：lint ✅ / tsc ✅ / build ✅ / 生产重启 ✅ / `/resources/27c60e87…`（project-evaluation）预设问题 3 条渲染 + 相关资源仅出现 1 次 ✅ / `/agents/new` 模型分组 7 组共 19 个、默认选中 deepseek-v4-flash-0731 ✅ / Git 工作区干净（仅剩未纳入的 QA 文档）✅。
- 已知问题：无。


---

### S1.48 页面进入时自动扫描

- 背景：用户询问"新增技能等资源后是否自动刷新"，当前只有手动「重新扫描」。选择候选 1：打开页面时按时间阈值静默增量扫描。
- 实现：
  - `stores/workspace.ts`：新增 `maybeAutoScan` action + `AUTO_SCAN_INTERVAL_MS = 15min` + 模块级 `autoScanInFlight` 并发锁。逻辑：扫描中/已有自动扫描在跑则跳过；概览未加载先拉一次；从未扫描或距上次 `finishedAt` 超阈值 → 静默调用 `runResourceScan`，完成后 `dispatchEvent("aiw:rescan")`（复用 Dashboard / Resources 已有监听刷新链路）；失败静默，不打扰浏览。
  - `app/(workspace)/resources/page.tsx`：hydrate 完成后调用 `maybeAutoScan()`。
  - `app/(workspace)/dashboard/page.tsx`：`loadAll()` 完成后调用 `maybeAutoScan()`（deps 加入，消除 lint warning）。
- 验证：lint ✅ / tsc ✅ / build ✅ / 生产重启 ✅ / 打开 /resources 自动触发扫描：overview scanId `b89b9b89`(14:43Z) → `cda18ea4`(15:11Z)，totalResources 保持 254（幂等 upsert 无重复）✅ / 手动扫描按钮不受影响 ✅。
- 已知问题：无。


---

### S1.49 功能评估清单第一批

- 背景：用户要求「按清单开工」功能评估清单。先做收敛 3 项中的真实缺口（第 2 项「任务智能创建建议」经核查已在 S1.37 实现，本阶段纠正并跳过）。
- 实现：
  - `components/resources/analysis/capability-index-view.tsx`：新增搜索框（关键词匹配 capability / 资源名 / evidenceRef / 类别名）+ 类别下拉（真实 9 分类）+ 分页（100/页；搜索/过滤激活时切换平铺列表视图，否则保留原分组折叠视图；空态如实提示）。
  - 扫描变更提示：`db/schema.ts` discovered_resource 加 `createdAt`；`drizzle/0011_discovered_resource_created_at.sql`（ALTER）+ `0012_discovered_resource_created_idx.sql`（CREATE INDEX，单语句约束）；`db/repository.ts` upsert 不改写 createdAt + `countResourcesCreatedAfter`；`db/service.ts` runResourceScan 传入 createdAt 并统计 `addedResources`；`lib/types.ts` RunScanResult 加 `addedResources?`；`stores/workspace.ts` maybeAutoScan 扫描后有新增时 `toast.info`（无新增完全静默）；`resources/page.tsx` 手动扫描 toast 显示新增数。
- 验证：lint ✅ / tsc ✅ / build ✅ / migration 应用 ✅（journal 手写条目 + 单语句文件拆分）/ scan API `addedResources=0`、`totalResources=254` 幂等 ✅ / 浏览器实测：搜索「代码生成」52 条命中（分类名可搜）、类别过滤生效、空态「没有匹配（如实）」、无新增不误报 ✅。
- 已知问题：分页控件需过滤结果 >100 条才出现，单次搜索词实测未达阈值（真实能力标签为短文本）；逻辑为确定性 slice，未做真实触发。

### S1.50 四项候选执行

- 背景：用户「继续候选」批准四项：①提交推送 ②资源收藏（Pin）③导出 CSV/JSON ④预设问题逻辑统一。
- 实现：
  - ①GitHub 提交推送：`e4eaca8`（S1.47 资源详情预设问题 + Agent 表单）、`05a771a`（S1.48+S1.49 自动扫描 / 能力索引搜索分页 / 扫描变更提示），push 成功 `7812ef8..05a771a`（代理 `-c http.proxy` 须紧跟 git 命令）。
  - ②资源收藏 Pin：`stores/workspace.ts` persist 升 **v6**（partialize 增加 `pinnedResourcePaths`；migrate 旧版仅保留 timeRange，领域数据明确丢弃不合并）+ `toggleResourcePin(sourcePath)`；`resource-table.tsx` 行内 Pin/PinOff 按钮（amber 高亮）+ 名称旁 Pin 图标 + 当前页置顶排序；`resource-detail.tsx` 顶部「置顶/已置顶」按钮。语义：按 sourcePath 记录（稳定锚点，重扫 upsert/ID 变化不丢）；纯 UI 偏好不落库。
  - ③导出 CSV/JSON：`db/repository.ts` `listAllVisibleResources()`（排除用户隐藏）；`db/service.ts` `exportResources` / `exportCapabilities`（JSON 全量、CSV 引号/换行转义）；新 API `GET /api/v1/resource-discovery/export?format=csv|json` 与 `GET /api/v1/resource-capabilities/export?format=csv|json`（Content-Disposition 下载）；新公共组件 `components/shared/export-menu.tsx`（fetch blob + a.download，成功/失败 toast）；resources 页与 capabilities 页 PageHeader 接入。
  - ④预设问题统一：抽 `lib/prompts.ts`（`presetPromptsForResource` 类型模板 3 条 + `presetQuestionFromDescription` 描述转指令 + `cleanPromptDesc` 清洗截断 40 字），消除 `suggested-prompts.tsx`（8 组类型模板）与 `skill-suggestions.tsx`（presetQuestion 独立逻辑）两套模板漂移；两处调用点改为引用 lib，行为不变。
- 验证：lint ✅ / tsc ✅ / build ✅ / 生产重启（端口占用已杀净）✅ / export API：资源 JSON **253** 条（254 − 1 隐藏）、CSV 254 行（表头+253）、能力标签 JSON **970** 条（当前有效 isCurrent）、CSV 971 行 ✅ / 浏览器：列表 50 行均带 Pin 按钮、点击后 localStorage version=6 pinned=1、刷新后置顶保留且排序置顶优先、详情页「已置顶」按钮、取消置顶 pinned=0、导出菜单 CSV/JSON 项、任务智能页 console 无 error ✅。
- 已知问题：置顶排序仅作用于当前页（服务端分页 50 条/页），跨页置顶资源不会插到第 1 页顶部；导出为全量快照，未做增量导出。
- Git：S1.50 全部改动待提交（见下方「Git 状态」）。


### S1.51 四项候选执行（历史管理 / 索引分页·置顶 / 分布条·相邻导航 / 全局搜索）

- 背景：用户「继续候选」批准四项：①任务分析历史管理 ②能力索引分页下探 50/页 + 资源置顶跨页可见 ③Dashboard 真实资源分布条 + 资源详情上一条/下一条 ④命令面板全局搜索真实资源/能力。
- 实现：
  - ① 任务分析历史管理：`db/repository.ts` 新增 `listTaskAnalyses`（新→旧，limit 20）+ `deleteTaskAnalysisById`（按序删除 task_requirements / resource_recommendations / task_plans / task_analyses）；`db/service.ts` `deleteTaskAnalysis`（不存在抛 NOT_FOUND，统一错误契约）；API `DELETE /api/v1/task-intelligence/analyses/[id]`；`lib/api/task-intelligence.ts` `deleteTaskAnalysis`（http.del）；store 新增 `loadTaskAnalysis`（回看并清空 plan）+ `deleteTaskAnalysis`（列表移除 + 删除当前展示态时清空 current/plan，判定用 `analysisId`——RecommendationPlan 无 `id` 字段，首版误用已修正）；新组件 `history-panel.tsx`（任务摘要 / 状态 badge / 当前标记 / 相对时间 / hover 删除）；`task-intelligence-view.tsx` 挂载时拉历史。
  - ② 能力索引分页 + 置顶跨页：`capability-index-view.tsx` `INDEX_PAGE_SIZE` 100→50；`DiscoveredResourceQuery` 增 `ids?: string[]`，`listDiscoveredResources` 提供 ids 时按 sourcePath 精确取回（忽略分页/搜索、排除隐藏、last_modified DESC 排序）；`resources/route.ts` 解析逗号分隔 ids；client `ResourceListQuery.ids`；新组件 `pinned-strip.tsx`（从 store `pinnedResourcePaths` 拉全量置顶资源、横向小卡、PinOff 可取消、amber 边框）挂到 `resources/page.tsx`，跨页始终可见。
  - ③ Dashboard 分布条 + 详情相邻导航：新组件 `distribution-bars.tsx` 两个纯 CSS Bars 区块（资源类型分布：Skill 244/Rule 5/Plugin 3/Prompt 2；能力标签分类分布：9 类合计 970）；`dashboard/page.tsx` 加载 `fetchCapabilityIndex` 并入；`getAdjacentResources` 采用「取可见行 + 行内排序定位」（排序口径 last_modified DESC, name ASC，与列表一致；规避 drizzle `gt/lt` 列类型重载冲突——首版 SQL 条件写法报类型错误已改行内定位）；API `GET /api/v1/resource-discovery/resources/[id]/adjacent`；`resource-detail.tsx` 顶部「上一条/下一条」按钮（首/尾条 disabled，点击 router.push）。
  - ④ 命令面板全局搜索：整文件重写 `command-palette.tsx`——打开时懒加载 `fetchCapabilityIndex` 平铺为 FlatCapability（含 category）；输入防抖 280ms 走 `fetchDiscoveredResources({search,pageSize:6})`；分组依次「资源 → 能力标签 → 导航 → 工作区」；能力本地过滤（capability+category+resourceName），资源服务端过滤；点击跳 `/resources/[id]`；CommandInput 受控。lint 强制「effect 内不得同步 setState」已按要求改为异步回调内 set。
- 验证：lint ✅（0 error，3 warning 为既有未用变量）/ tsc ✅（0）/ build ✅（0）/ 生产重启（kill 3000 → npm run start，200）/ API 冒烟：adjacent 中间条目 prev/next 正确、列表首条 prev=null ✅、ids(sourcePath) 精确取回 3/3 ✅、analyses 创建→DELETE 200→列表消失 ✅、runs/stats 回归正常 ✅ / 浏览器实测：详情页上一条（首条正确 disabled）+ 下一条跳转 doubao-app-builder ✅、Dashboard 分布条渲染且 9 类能力合计 970 与能力索引一致 ✅、任务智能「最近分析 20 条 · 点击回看」+ 点击回看出现「当前」标记与完整详情 ✅、置顶资源后列表页「置顶资源 1 个 · 跨页可见」+ doubao-app-builder 卡片 ✅、能力索引 50/页分页控件 ✅。
- 已知问题：命令面板 dialog 在本机 WebView（computer_use）存在焦点获取限制（hotkey 被拒、dialog 闪开即关），面板分组/跳转逻辑已由代码 + API 层验证，真实浏览器交互待外部验证（环境限制，非代码缺陷）；置顶排序仍为服务端分页 50/页内的置顶优先，跨页不插入第 1 页（既定语义：PinnedStrip 解决跨页可见）。
- Git：本小节全部改动待提交（见下方「Git 状态」）。



### S1.52 技能画廊交互打磨（悬停预览内嵌化 / 移动端常驻复制）

- 背景：用户询问「技能画廊交互增强（分类切换 / 悬停预览）做了吗，没做可以做」。勘察结论：分类切换（真实 metadata.category + layoutId 动画 + 计数）、悬停预览（完整说明 + 复制使用方式）、卡片入场动画、复制反馈在早期阶段已实现，且数据链路正确（dashboard 拉 `harness=hermes,type=skill,parseable=true,pageSize=8` 的 8 个真实技能，「查看全部 → /resources?harness=hermes」同源）。未做的是两项打磨。
- 实现（`components/dashboard/showcase/skill-gallery.tsx`）：
  - ① 悬停预览由「卡片上方外弹（bottom-full）」改为「卡片内嵌覆盖」：`absolute inset-0 z-10` 覆盖层，hover 时显示完整说明（可滚动）+「复制使用方式」按钮，其余区域 `pointer-events-none` 穿透进详情链接；任何行、任何滚动位置均无方向溢出风险。
  - ② 移动端（无 hover）复制不可达 → 卡片标题行新增常驻复制按钮（`lg:hidden`，桌面由 hover 预览承载），点击复制 `【name】使用方式：…` 并显示 Check「已复制」反馈。
- 验证：lint ✅（0 error，3 既有 warning）/ tsc ✅ / build ✅ / 生产重启 ✅ / 浏览器实测：hover 后内嵌 overlay `visible=1` 且含「复制使用方式」+ 完整说明 ✅、分类切换 media → 仅 booru-image-api（计数 1）✅、移动端常驻复制按钮（aria-label「复制 project-evaluation 的使用方式」）存在 ✅。
- 已知问题：无新增；复制反馈为既有稳定逻辑（S1.47 已验）。
- Git：本小节改动待提交（见下方「Git 状态」）。

### S1.53 LLM Provider 端面设计（多端点 + 加密存储 + 厂商快捷模板）

- 背景：用户指令「端面设计保存暗文存放，可添加多个自定义和快捷选择厂商添加 API 端点」。原实现为单行 llm_provider_config 明文存 apiKey（等同 Hermes .env 行为），仅一个表单 + 9 个官方预设按钮（只填 base_url）。
- 领域设计：
  - 数据模型：新表 llm_provider_endpoint（多行命名端点）：id / name / base_url / model / api_key_enc（密文）/ is_default / created_at / updated_at；替代单行表语义，is_default 互斥标记「当前生效」，无默认标记时首条生效（getEffectiveLLMConfig 与列表同口径）。
  - 加密：lib/ai/crypto.ts AES-256-GCM，密钥从「hostname + username + platform + homedir + 固定 pepper」SHA-256 派生，密钥不落库；密文格式 1:<iv>.<ct>.<tag>；换机/换用户解密失败返回 null 不崩溃，UI 显示「需重填 Key」徽标。旧表保留不再写入；旧 default 行由 migrateLegacyProviderConfig 惰性迁移为首条端点（幂等：新表非空即跳过）。
  - 边界：Mock → Real 双模式不变；读取接口只回显掩码，绝不返回明文 Key。
- 实现：
  - Schema + migration：llm_provider_endpoint 表（0013）+ idx_endpoint_default（0014），journal 追加 idx 13/14。
  - Repository：listProviderEndpoints / getProviderEndpointRow / getDefaultProviderEndpointRow / insertProviderEndpoint / updateProviderEndpoint / deleteProviderEndpoint / setDefaultProviderEndpoint / countProviderEndpoints / migrateLegacyProviderConfig。
  - Service：getEffectiveLLMConfig 改为「默认端点（解密 Key）> env > hermes > default」；saveLLMProviderConfig 兼容入口写默认端点（无则创建）；clearLLMProviderConfig 删除全部端点；新增 listProviderEndpointsView / createProviderEndpoint / updateProviderEndpoint / deleteProviderEndpoint / ctivateProviderEndpoint / 	estProviderEndpoint(id)；getLLMProviderConfigView 增加 endpoints 列表（含掩码 Key / keyUndecryptable）。
  - API：/api/v1/ai/provider-config GET/PUT/DELETE 兼容扩展；新增 POST /endpoints、PUT/DELETE /endpoints/[id]、POST /endpoints/[id]/activate、POST /endpoints/[id]/test（错误码走统一 ApiError code 分支）。
  - Client：lib/api/ai.ts + lib/services/ai.ts 增加 createLLMEndpoint / updateLLMEndpoint / deleteLLMEndpoint / ctivateLLMEndpoint / 	estLLMEndpoint。
  - UI：components/settings/llm-provider.tsx 整文件重写——端点列表卡片（名称 / 生效徽标 / base_url / model / key 状态 / 设为生效·编辑·删除·测试）、新增/编辑表单（10 个厂商快捷模板一键填入 name+base_url+模型提示、自定义、API Key 密码框留空不修改）、测试指定端点成功后模型列表点击即保存到该端点、加密安全说明。
- 验证：lint ✅（0 error，3 既有 warning）/ tsc ✅ / build ✅ / 生产重启（migration 手动 
pm run db:migrate 应用 0013/0014 后 API 正常）✅ / API 冒烟全链路：POST 创建（key 加密落库，密文前缀 v1: 长度 81、无明文）✅ → 第二端点 isDefault=false ✅ → activate 切换互斥正确 ✅ → PUT 更新（key 未传保持不变）✅ → DELETE 默认端点后首条自动升默认 ✅ → GET 列表/effective 同源 ✅ → 清理测试数据恢复自动发现 ✅ / 浏览器实测：设置页「AI Provider（LLM 端点）」区块渲染、空态提示、厂商模板按钮与字段齐全 ✅。
- 已知问题：dev 环境从未自动跑 migration（next start 不执行 drizzle migrator），新增表需 
pm run db:migrate 手动执行——已在 README / IMPL 记录，属既有机制非本次引入；lint 3 个既有 warning 未处理（与本次无关）。
- Git：本小节改动待提交。

### S1.54 个人资料增强 + 技能画廊来源可追溯打磨

- 背景：用户候选「个人资料页头像 / 信息编辑增强」+「首页技能画廊分类切换进一步打磨」。
- 个人资料增强（components/profile/profile-form.tsx + 	opbar.tsx / sidebar.tsx）：
  - ① 两段式头像上传：选择本地图片后先本地预览（不立即上传），出现「使用此头像 / 取消」确认按钮，确认后才上传（此前选择即上传，无预览确认）。
  - ② 新增「展示效果预览」卡片（表单右侧）：实时模拟顶栏/侧栏效果——头像（上传图或配色渐变字母）+ 昵称（回退本机用户名）+ 职位 + 简介截断，编辑即时联动。
  - ③ 昵称/职位/简介字符计数徽章（n/40、n/80、n/300）。
  - ④ 保存联动：保存/上传/移除头像后 dispatch window profile-updated 自定义事件，TopBar 账户菜单与 Sidebar 用户区监听后重新 getProfile()（此前只在挂载时拉一次，保存后顶栏不刷新）。
  - ⑤ 保存按钮脏状态：无未保存修改时禁用并显示「已保存 / 暂无未保存的修改」。
- 技能画廊打磨（components/dashboard/showcase/skill-gallery.tsx）：
  - ① 卡片新增来源 Harness 徽标（与 category 徽标并列，HardDrive 图标 + source）。
  - ② 悬停预览层底部新增真实来源行（mono 字体 source · sourcePath，title 完整路径，可追溯真实文件）。
  - ③ 复制文本带来源（【name】使用方式（来自 source）：…）。
  - ④ 空分类空态文案；分类 Tab 补 focus-visible 焦点环。
- 验证：lint ✅（0 error，3 既有 warning）/ tsc ✅ / build ✅ / 生产重启 200 ✅ / 浏览器实测：profile 预览卡片 + 计数（2/40 等真实值）+ 两段式上传「新头像预览→使用此头像/取消」✅、取消后恢复原态 ✅、画廊双徽标（software-development + Hermes）✅、hover 预览层来源行 Hermes · C:\\Users\\Administrator\\.hermes\\skills\\software-development\\project-kickoff-workflow\\SKILL.md ✅。
- 已知问题：无新增；头像确认上传后需刷新图片缓存（avatar?v=updatedAt 已带版本号）。
- Git：本小节改动待提交。

### S1.55 Projects 改造：项目 = 使用场景组织单元（挂真实本机资源）

- 背景：用户判定原 Projects（Agent 组织壳 + 演示 Run 统计）「看着没啥实际用处」，批复「1.删除，2待定」。本阶段把 Project 重构为「使用场景组织单元」：项目下关联**本机真实扫描出的资源**（技能等），页面承载真实价值，替代原 Agent 关联与运行统计空壳。
- 领域模型：新增关系表 project_resource（projectId/resourceId/addedAt，unique uq_project_resource，FK cascade/restrict），只引用资源、不复制资源实体；Workspace → Project → ProjectResource → DiscoveredResource（真实扫描索引）。旧 ProjectAgent / Agent / Run 后端兼容保留（不删表不删接口），UI 删除相关区块。
- 数据层：schema 新增 project_resource + migration 0015（已应用）；repository 新增 getProjectResource / getProjectResourceByPair / insertProjectResource / deleteProjectResource / countProjectResources / projectResourceTypeDistribution / projectResourcesWithEntity；service 新增 attachResourceToProject（校验 Project/Resource 存在、已关联抛 CONFLICT）/ detachResourceFromProject / listProjectResourcesView（含完整 resource 实体）/ getProjectResource。
- API：GET /api/v1/projects 列表项追加 resourceCount + resourceTypes（服务端派生）；新增 GET+POST /api/v1/projects/[id]/resources（POST 批量 attach，幂等跳过已关联，返回与 GET 同构的 view 含 resource）；DELETE /api/v1/projects/[id]/resources/[resourceId]（只删关系，NOT_FOUND 走 ApiError）。
- 前端：DTO ProjectDTO 扩展 resourceCount/resourceTypes? + 新增 ProjectResourceDTO（复用现有 DiscoveredResourceDTO，清掉误加的重复定义）；mapper toProject 扩展 + toProjectResource；HTTP service fetchProjectResources / attachResourcesToProject / detachResourceFromProject；store 新增 projectResourcesById + fetchProjectResources（幂等缓存）/ attachProjectResources（成功后重拉并刷新 resourceCount/updatedAt）/ detachProjectResource。
- UI：列表页卡片改为「N 个技能 + 前 3 类型徽标 + 最近更新」（删除 agent 数/运行/成功率）；详情页重写为「项目摘要（关联技能数 / 类型分布徽标 / 创建时间+最近更新）+ 关联技能网格（真实资源卡：分类/类型/来源 Harness 徽标 + 描述 + sourcePath mono 行 + hover 移除按钮 + 移除确认 Dialog）+ ResourcePicker（搜索真实技能 → 勾选 → 批量添加，已关联自动隐藏）」；新建项目弹窗 wording 改为使用场景（placeholder「写小红书笔记 / 数据分析 / RSS 资讯」）。删除已无引用组件 agent-picker.tsx、projects-overview.tsx。
- 验证：
  - lint ✅（0 error，4 既有 warning）/ tsc ✅ / build ✅ / db:migrate 0015 应用 ✅ / 生产重启全页面 200 ✅。
  - API 冒烟（Python 真实请求）：POST attach 2 个真实技能 200 ✅ → GET 列表 total=2（browser-record-replay / html）✅ → 项目统计 resourceCount=2、resourceTypes=[{skill,2}] ✅ → 幂等重复 POST 200 不重复插入 ✅ → DELETE 200 → 还原 0 ✅。期间发现 PowerShell `\"` 不转义导致 curl JSON 非法误报 INTERNAL_ERROR（工具链问题，非代码缺陷，改用 Python 请求验证通过）。
  - 浏览器实测（生产）：/projects 列表「1 个技能 + skill·1 徽标」✅ → 详情页摘要（关联技能 1 / Skill·1 / 创建时间）✅ → 真实资源卡含真实 sourcePath（C:\...\browser-record-replay\SKILL.md）✅ → Picker 打开列真实技能（html / doubao-app-builder / Hermes 技能）✅ → 勾选 ppt 添加成功 toast「已添加1个技能」→ 页面实时 3 个资源、类型分布 Skill·3 ✅ → 移除确认弹窗（取消/确认移除）✅ → console 无错误 ✅ → 测试数据已还原（项目恢复 0 资源）。
  - 修复的问题：① zustand selector `s.projectResourcesById[projectId] ?? []` 在缓存未填充时每次返回新数组引用 → React #185 无限重渲染页面崩溃；改为模块级 EMPTY_RESOURCES 稳定引用修复。② POST /resources 原返回 row（无 resource 字段）→ 前端 mapper 访问 d.resource 抛 TypeError 误报「添加失败」；改为返回与 GET 同构的 view。③ useMemo 条件调用（详情页 typeDistribution 在 early-return 后）→ 移到 hooks 区。
- 已知问题：lint 4 个既有 warning 未处理（与本次无关）；/capabilities 路由 404 为旧页面早已移除（导航无入口，非本次回归）；dev 环境不自动跑 migration（既有机制）。
- Git：本小节改动待提交（push 前排除本地 QA 文档）。

### S1.56 代码智囊团：通用代码协作 Agent 模板加入 Agents 页面

- 背景：用户指令「设计几个通用的代码 agent 智囊团加入到 agent 页面中，审批，写代码等分工合作的 agent，还有候选工作」。当前 agent 表 0 条真实数据，Agents 列表为空态，无任何预置角色；同时页面遗留「重置演示数据」按钮（文案称恢复 5 个演示 Agent，实际 seed 已不建 agent，且 clearAll 会清空含真实扫描索引在内的全部表——与真实数据主线冲突且有数据风险）。
- 领域设计：
  - 模板为**静态前端常量**（lib/agents/templates.ts，不落库、不是假数据），点击「创建」才通过 store.createAgent → Service → SQLite 成为真实 Agent 记录，可再进表单/详情编辑模型与提示词。
  - 5 个角色覆盖标准软件交付链路：架构师（拆解/方案）→ 实现工程师（写代码/修 bug）→ 代码审查员（审查/安全）→ 测试工程师（用例/回归）→ 发布审批人（把关/批准）；每个模板含 role 标签、description（一句话职责）、suggestedTasks（3 条候选工作）、systemPrompt（可直接使用的完整中文专业提示词，不绑定厂商/模型）。
  - 创建去重：按已创建 Agent 的 name 判断，同名模板按钮显示「已创建」并禁用，避免重复创建。
- 实现：
  - 新增 lib/agents/templates.ts（AgentTemplate 类型 + CODE_BRAINTRUST_TEMPLATES 5 条 + getAgentTemplate）。
  - 新增 components/agents/agent-templates.tsx（卡片网格：角色徽标（按角色着色）/名称/职责/候选工作列表/创建按钮，创建中 loading、成功 toast、失败错误提示、已创建禁用态）。
  - 修改 app/(workspace)/agents/page.tsx：空态与非空态都展示模板区；空态文案改为引导从智囊团创建；**移除「重置演示数据」按钮**及其 Dialog/state/handleReset（清理与真实数据主线冲突且有清库风险的遗留入口）。
- 验证：
  - lint ✅（0 error，4 既有 warning）/ tsc ✅ / build ✅ / 生产重启 /agents 200 ✅。
  - 浏览器实测（生产）：模板区 5 卡全部渲染（角色/职责/候选工作 3 条/创建按钮）✅；点击「创建此 Agent」→ toast「已创建」→ 按钮变「已创建」禁用 → 列表区「共 1 个 Agent」✅；SQLite 落库（代码架构师 / model=auto / status=idle / systemPrompt 完整）✅；console 无错误 ✅；测试数据已清理还原（agent 表回 0）。
- 已知问题：lint 4 个既有 warning 未处理（与本次无关）；创建默认 model="auto"（用户未配置模型端点时显示原样，可在 Agent 表单选择真实模型）；Agent 详情页暂未提供「应用模板提示词」编辑入口（可走 /agents/new 或后续增强）。
- Git：本小节改动待提交（push 前排除本地 QA 文档）。

### S1.57 壁纸/背景对比度增强：保证任意壁纸下文字可读

- 背景：用户反馈「换壁纸的时候页面的字大都看不清了」。根因排查（appearance-layer.tsx + globals.css）：①玻璃模式（data-glass=on）下大面积卡片 bg-surface-1 仅 72% 不透明 + 毛玻璃模糊，亮壁纸直接透到文字下层；②「磨砂度」雾化层为白色 rgba(255,255,255,glassFrost)，会把背景进一步提亮，深色主题白字对比度骤降。
- 修复（对全部页面生效，不新增设置项、不改变壁纸语义）：
  - appearance-layer.tsx：壁纸模式下新增「对比度保护层」——深色主题黑遮罩 rgba(6,6,10,0.52)（压暗亮壁纸），浅色主题白遮罩 rgba(255,255,255,0.55)（提亮暗壁纸）；流体模式同样加轻度保护层（0.22 黑 / 0.30 白）；雾化层改为按主题：深色主题用黑色雾 rgba(0,0,0,glassFrost*0.92)（磨砂同时暗化），浅色主题保持白雾。
  - globals.css：玻璃卡片不透明度 72% → 82%（color-mix），在保留毛玻璃质感的前提下提高卡片内文字对比度。
- 验证：
  - lint ✅（0 error，4 既有 warning）/ tsc ✅ / build ✅ / 生产重启 200 ✅。
  - 浏览器实测（生产）：模拟最坏场景（壁纸模式 + 亮度 62 + 磨砂 45 + 玻璃开），Dashboard 标题/副标题/统计数字（254/252/4/142/244）/扫描时间等全部 OCR 稳定识别、无报错 ✅；按默认值恢复参数（bgBrightness 50 / wallpaperOpacity 100 / glassBlur 16 / glassFrost 20）后壁纸模式文字依旧全部可读 ✅；用户原有壁纸（本机初音壁纸）未被修改 ✅。
- 已知问题：lint 4 个既有 warning 未处理（与本次无关）；深色主题下磨砂层由白雾改为黑雾，视觉上「磨砂发白」质感变弱（换取对比度，属有意取舍）。
- Git：本小节改动待提交（push 前排除本地 QA 文档）。

### S1.58 任务分析推荐阈值收紧：<80% 视为未找到 → 3 个技能创建建议

- 背景：用户两次反馈「候选资源推荐不行、50 多分的推荐跟问题关联性不大」。原 MATCH_HIGH=0.55 会把低相关（50~70 分）资源当「找到」展示推荐。本轮用户明确规则：**低于 80% 相似度一律视为未找到**，改为生成几个技能创建建议（含创建提示词 + SKILL.md 草案），供复制到 Hermes / 豆包等平台创建技能。
- 领域决策：
  - MATCH_HIGH 0.55 → 0.80（MATCH_LOW 0.35 保留）；classifyMatch 三态语义不变：matched=有真实可用技能（≥80%）→ 推荐 + 预置问题；low-confidence / no-match（<80%）→ 一律走创建建议，不再展示低相关推荐。
  - 建议生成从 1 条扩展为 3 个角度（generateSkillProposals）：standard「直接解决该类任务」/ workflow「沉淀为可复用工作流」/ expert「专家角色 + 规则约束 + 质量门」，各带独立 name 后缀（-assistant / -workflow / -expert）、触发场景、工作流、自由度与可复制的创建提示词、SKILL.md 草案。纯确定性模板生成，不接 LLM。
- 实现：
  - lib/task-intelligence/matcher.ts：MATCH_HIGH = 0.8。
  - lib/task-intelligence/skill-proposal.ts：新增 ProposalVariant / variantSpecs / generateSkillProposals()（返回 3 变体），generateSkillProposal() 保留兼容（返回 [0]）；SkillProposal 增加 angle/variant 字段。
  - components/task-intelligence/task-intelligence-view.tsx：SkillProposalBlock 改为多卡（ProposalCard 单卡组件，建议 1/2/3 + 角度标题）；推荐区仅 match.state==="matched" 渲染（去掉 low-confidence 边缘推荐与 amber 提示）；建议区改为 state!=="matched" 渲染；徽标文案「已找到 N 个可用技能（相似度 ≥ 80%）」/「未找到匹配技能（相似度 < 80%，已生成下方创建建议）」；创建提示词文案改为「复制后到 Hermes / 豆包等平台创建」。
- 验证：
  - lint ✅（0 error，4 既有 warning）/ tsc ✅ / build ✅ / 生产重启 200 ✅ / console clean ✅。
  - API 冒烟（真实 analyze）：低相关任务「帮我制定一份接下来四周的健身训练计划」top=0.72 → 页面显示「未找到匹配技能（相似度 < 80%）」+ 3 张建议卡（task-assistant-assistant / -workflow / -expert，各含触发场景/工作流/创建提示词复制/SKILL.md 草案）✅；高相关任务「帮我写一篇小红书种草文案」top=1.0/0.95/0.91 → 徽标「已找到 3 个可用技能（相似度 ≥ 80%）」+ 候选推荐（#1 doubao-ecommerce-proposal 100 分）+ 预置问题复制 ✅。
- 已知问题：lint 4 个既有 warning（与本次无关）；建议名基于任务类型通用前缀（如 task-assistant-*），对内容创作/数据分析等有专门 profile 的任务会使用对应前缀；低置信区间（0.35~0.80）不再展示任何推荐（用户明确要求）。
- Git：本小节改动待提交（push 前排除本地 QA 文档）。

### S1.59 角色模板库重构：已添加状态联动 + 分组模板 + GitHub 专业提示词

- 背景：用户反馈代码智囊团模板区「不要直接平铺创建入口，应显示已添加的情况」，且提示词设计得不好、希望能参考 GitHub 上的专业提示词。当前 agent-templates 平铺 5 个模板卡（每卡「创建此 Agent」），模板仅覆盖代码角色且 systemPrompt 为早期简版。
- 领域决策：
  - 模板区改为「角色模板库」：与已创建 Agent 按 name 联动——已添加的角色显示真实 Agent（状态徽标 + 关联信息 + 「查看详情」跳转 /agents/[id]），未添加的角色显示模板信息 + 「添加此角色」按钮；同名不重复创建。
  - 模板库分两组：代码协作（架构师/实现/审查/测试/审批 5 个，覆盖软件交付链路）+ 通用角色（内容创作/数据分析/翻译/研究助理/写作润色 5 个）。
  - systemPrompt 参照 GitHub 公开专业提示词结构重写（角色定位 / 能力范围 / 工作准则 / 执行流程 / 输出格式 / 边界与自检），参考：awesome-prompts（GPTs Store 500+）、leaked-system-prompts（Cursor/Claude 等产品级提示词）、Production-grade system prompt for agentic AI（210+ 论文：防幻觉/防谄媚/工具误用/注入防御）。模板仍为静态前端资产，点击「添加」才通过 createAgent 落库。
- 实现：
  - lib/agents/templates.ts：重构为 AGENT_TEMPLATES（10 个模板，含 group 字段）+ TEMPLATE_GROUPS + templatesOfGroup；提示词全部升级为结构化专业版本；保留 CODE_BRAINTRUST_TEMPLATES 兼容导出（= 代码组）；「代码架构师」名称保留以兼容用户已创建的 Agent（避免改名导致已添加状态丢失）。
  - components/agents/agent-templates.tsx：改为按分组渲染 + 已添加/未添加双态卡（已添加：绿色徽标 + 关联 Agent + 查看详情；未添加：模板信息 + 添加按钮）；组头显示「已添加 n/total」。
  - app/(workspace)/agents/page.tsx：AgentTemplates 改为接收 agents 完整对象数组。
- 验证：
  - lint ✅（0 error，4 既有 warning）/ tsc ✅ / build ✅ / 生产重启 200 ✅ / console clean ✅。
  - 浏览器实测（生产，真实数据）：代码协作组已添加 5/5（用户已创建的 5 个代码角色正确匹配为「已添加」+ 查看详情跳转 /agents/98d7a268…）；通用角色组 0/5 全部显示「添加此角色」；「代码架构师」改名回退后恢复匹配（此前改名导致 4/5）；点击查看详情进入真实 Agent 详情页 ✅。
- 已知问题：lint 4 个既有 warning（与本次无关）；「已添加」按模板 name 匹配（用户若手动改名创建，模板区会显示为未添加，属预期）；Agent 编辑（updateAgent/deleteAgent）仍缺失（下一步候选）。
- Git：本小节改动待提交（push 前排除本地 QA 文档）。
