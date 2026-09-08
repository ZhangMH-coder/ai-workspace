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
| 2026-09-08 | v0.8 | Phase 3 第五阶段 — Projects 业务化（方案 B：最小业务闭环） | 领域模型先定稿（Workspace → Project → ProjectAgent → Agent → AgentCapability/Run；只引用不复制）、Agent ↔ Project 多对多、Run 归属 Agent 统计全派生、Capability 经 Agent 间接关联、persist v3 → v4 + migrate（向后兼容）、`/projects` 列表 + 新建 + `/projects/[id]` 详情（项目摘要 + 关联 Agent 列表 + Picker + 解绑确认）、30 天口径复用 `selectRunsInRange`（与 Dashboard 完全同源）、实时响应 Store 变化；lint/tsc/build/生产交互验证全绿 | ✅ 已完成，待审批进入下一阶段 |

## 当前阶段

**Phase 3 第五阶段 — Projects 业务化（方案 B：最小业务闭环）**（已完成；**不自动进入下一阶段**，待审批）

---

## 一、环境检查记录（2026-09-08，Phase 2 实测更新）

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

## 二、已完成内容（Phase 3 第五阶段 / P3-5）

### 1. 领域模型与架构审查（先定稿后编码）
- [x] **Project 定位**：业务组织上下文，层级 `Workspace → Project → (ProjectAgent) → Agent → (AgentCapability) → Capability`，`Agent → (AgentRun) → Run`；**只引用不拥有**任何数据副本
- [x] **Agent ↔ Project 多对多**（经 `ProjectAgent` 中介表，只引用 agentId）；Agent 为工作区级资产可跨项目复用
- [x] **Capability 经 Agent 间接关联**（不建 ProjectCapability 直接关系）；**Run 天然属于 Agent**（agentId 外键），**不给 Run 加 projectId**，项目级统计全部派生
- [x] **Project 生命周期**：`status: "active" | "archived"`（软删除语义同 Capability，预留；本阶段仅 active，不实现归档/恢复 UI）
- [x] 契约：`Project{id,name,description,status,createdAt,updatedAt}`（updatedAt 在关联/解绑时刷新，用于「最近活跃」排序）；`ProjectAgent{id,projectId,agentId,addedAt}`

### 2. Service / Store
- [x] `lib/services/projects.ts`（新）：`fetchProjects`（GET /projects）/ `fetchProjectAgents`（GET /projects/:id/agents）/ `createProject`（POST，默认 active）/ `attachAgentToProject`（POST /project-agents）/ `detachAgentFromProject`（DELETE），全部 async + 220ms + 类型化返回；Mock 只做往返不持有状态，未来替换 Real API 单文件
- [x] `stores/workspace.ts`：persist **version 3 → 4**；`partialize` 增加 `projects`/`projectAgents`（持久化）；`migrate` 阶梯式 v1→v2→v3→v4 自动补 seed（向后兼容）；actions `createProject`（返回新项目供跳转）/ `attachAgentToProject`（幂等 + 刷新 updatedAt）/ `detachAgentFromProject`（幂等 + 刷新 updatedAt）
- [x] **派生 Selectors**（全部实时计算不落库）：`selectAgentsInProject`（join 按名称排序）/ `selectRunsInProject`（join runs，无 projectId 冗余）/ `selectRunsInProjectWindow`（**复用 `selectRunsInRange` 统一窗口，不重复实现日期计算**）/ `selectProjectStats`（agentCount/totalRuns/successRate/totalTokens/recent30dRuns/recent30dSuccessRate）/ `sortProjectsByActivity`
- [x] seed：3 个项目（官网改版 / 客服提效 / 数据分析平台，全部 active）+ `seedProjectAgents` 多对多关系；**不新增 Agent/Run 数据**（不复制）

### 3. UI（最小闭环）
- [x] `/projects` 列表：项目卡片（名称/描述/Active 状态/Agent 数/最近 30 天运行与成功率/最近活跃）+ 空态 +「新建项目」+ 按活跃排序
- [x] `components/projects/project-form-dialog.tsx`（新）：名称/描述表单，空名称禁用，Loading/Error toast，创建成功回调跳转详情
- [x] `/projects/[id]` 详情：项目摘要卡（Agent 数/总运行/成功率/Tokens 全派生 + 最近 30 天同口径行）+ 关联 Agent 列表（名称/模型/状态/运行数/成功率/加入时间 + 解绑）+ 未找到空态 + 未关联空态
- [x] `components/projects/agent-picker.tsx`（新）：搜索已有 Agent（名称/描述）、已关联 Badge 禁用、未关联可关联、空态、busy 态
- [x] 解绑 Dialog 确认（Agent 本身不受影响，可随时重新关联）

## 三、验证结果（Phase 3 第五阶段 / P3-5）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 0 警告 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误 |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；11 条路由：新增 /projects/[id] Dynamic） |
| 生产运行 | `npm run start`（localhost:3000，version 4 构建） | ✅ 正常运行 |
| 干净环境 | localStorage.clear → /projects：3 个 seed 项目 + 新建按钮 | ✅ 通过 |
| 创建项目 | Dialog 填表 → toast「已创建项目」→ **自动跳转详情** | ✅ 通过 |
| 关联 Agent | Picker 搜索「客户支持」→ 关联 → 详情 Agent 数 0→1、统计出现 | ✅ 通过 |
| 解除关联 | Dialog 确认 → toast + Agent 数归 0 + 空态 | ✅ 通过 |
| 实时响应 | attach/detach 后摘要、列表即时更新（单一 Store 源） | ✅ 通过 |
| Agent 数正确 | 新建项目 1 / 客服提效 2（DOM 实测） | ✅ 通过 |
| 30 天口径一致 | **localStorage 重算（含今天 30 自然日）= 页面 DOM 数字**（客服提效 38 次 87%；新建项目 26 次 81%）；与 Dashboard `selectRunsInRange` 同一函数 | ✅ 通过 |
| 硬刷新持久化 | v4：新建项目 + 关联关系刷新后保留；解绑结果刷新后保留 | ✅ 通过 |
| 多对多 | agent-support 同时属于客服提效 + 新建项目，两处统计一致（26 次/81%） | ✅ 通过 |
| 只引用不复制 | localStorage 检查：仅 projects/projectAgents 新增，agents/runs/definitions 无重复副本 | ✅ 通过 |
| Dashboard 回归 | /dashboard 正常渲染，console 0 error | ✅ 通过 |
| 生产控制台 | 各页面 console 0 error | ✅ 通过 |

## 四、技术决策记录（ADR 简表，Phase 3 第一阶段更新）

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

## 五、发现的问题（Phase 3 第五阶段）

1. **OCR 误读数字**（工具链，非产品缺陷）：截图 OCR 将「26 次」误读为「28 次」，经 DOM 文本 + localStorage 重算复核为 26，数据正确；验证以 DOM/重算为准，不信 OCR。
2. **浏览器自动化填受控表单**：与 P3-4 相同模式（原生 value setter + input 事件），新建项目表单沿用该技巧通过。
3. **截图命名修正**：首张详情页截图误命名为列表名，已重命名（p4-project-detail.png）。
4. 既有遗留不变（截图新标签视口偏小；link-preload 无害 warning）。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| Project 归档/恢复 UI 未实现（status 字段已预留） | 低 | 明确不在本阶段范围；后续「Project 生命周期管理」阶段可做 |
| Project 无编辑（改名/描述）入口 | 低 | 本阶段最小闭环不含；后续低成本补 |
| Project 无创建/关联时间维度筛选（如按时间过滤 Agent 统计） | 低 | 派生统计已具备数据基础，按需演进 |
| 浏览器截图工具链不稳定 | 低 | 新标签路线稳定可用 |
| P2 遗留 link-preload warning | 低 | Next.js 16 框架提示，无 error |

## 七、下一步计划

1. **等待审批**：批准进入下一阶段。候选方向（供用户选择，不擅自扩大范围）：
   - 方案 A：**Project 生命周期管理**（归档/恢复 + 编辑，复用 Capability 生命周期心智）
   - 方案 B：**Capability 版本管理**（生命周期 + 版本演进 / 编辑历史）
   - 方案 C：**Dashboard/Agents 增强**（项目维度看板、Agent 能力图谱等）
   - 方案 D：**Settings 业务化**（工作区设置 + 用户偏好）
   - 方案 E：其他（用户指定）
2. 执行任何内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P3-5 收尾待办**：Git 提交（用户批准范围内执行）。

## 八、待审批事项

- [ ] **A15**：批准进入下一阶段，并确认具体范围（候选见「七、下一步计划」）
- [ ] **A16**：Capability/架构文档（`docs/Capability 架构设计.md` 第十一章「Projects 领域模型」）评审确认
