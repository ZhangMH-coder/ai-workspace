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
| 2026-09-08 | v0.4 | Phase 3 第一阶段 — 状态持久化 + 工程细节 + Capability 能力层 | Zustand persist（刷新不丢数据 + 可重置回 seed）、趋势图可读性/键盘/空态/异常态增强、无障碍细节（skip-link / reduced-motion / focus-visible / 对比度）、Capability 三层数据模型 + Service 边界 + 详情页只读展示、Dashboard 三处时间窗口口径统一；lint/tsc/build/生产交互验证全绿 | ✅ 已完成，待审批进入 Phase 3 第二阶段 |

## 当前阶段

**Phase 3 第一阶段 — 状态持久化 + 工程细节收尾 + Capability 能力层设计落地**（已完成；**不自动进入第二阶段**，待审批）

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

## 二、已完成内容（Phase 3 第一阶段 / P3-1）

### 1. 状态持久化（Zustand persist）
- [x] `stores/workspace.ts` 接入 `zustand/middleware.persist`：localStorage key `ai-workspace-store`（version 1），`partialize` 仅持久化 agents / runs / timeRange（hydrated 标志与 actions 不落盘）
- [x] `hydrate()` 幂等：有持久化数据直接使用；空则从 Mock seed 回填；演示环境可重新初始化
- [x] `resetDemoData()`：一键拉回 seed 并同步 set（timeRange 复位 "30d"）；Agents 页新增「重置演示数据」入口（Dialog 二次确认 + toast + 防重复提交）
- [x] 验证：创建 Agent → 硬刷新 → 数据保留；重置 → 恢复 5 个 seed Agent（实测通过）

### 2. 趋势图增强（`components/charts/trend-chart.tsx`）
- [x] 默认聚焦最近一天，详情条静态可读（运行/成功/失败/成功率；失败 > 0 用 danger 色），不再依赖 hover
- [x] 容器可聚焦（tabIndex=0 + role=group + aria-label），←/→ 键盘切换每日数据
- [x] 透明命中区 rect 置于最上层：整列可点、扩大触控目标
- [x] 空状态：`totalRuns === 0` 展示 BarChart3 引导「去 Agents 触发运行」
- [x] 左/底部提示行说明图例与键盘操作；SVG 文字颜色统一 `fill-ink-3`
- [x] 时间范围切换由父级 `key={timeRange}` 重挂载重置焦点（消除 useEffect setState 反模式，通过 lint 新规则）

### 3. 无障碍细节
- [x] `app/(workspace)/layout.tsx`：skip-link「跳到主内容」→ `#main-content`（sr-only，聚焦时 fixed 显示）
- [x] `page-transition.tsx`：`useReducedMotion()`——减弱动效时不位移
- [x] sidebar 导航、agent-card、activity-list、quick-actions、agent-form 模型选择等补 `focus-visible:ring-2 ring-brand/50`
- [x] `globals.css`：`--ink-3` 由 `#6e6e78` 提亮至 `#7c7c88`（弱文本对比度达标）
- [x] 生产 DOM 实测：skip-link 存在且 focus 显示、`main#main-content` 存在、趋势图 tabindex=0 + aria-label 完整

### 4. Capability 能力层（数据模型 + Service 边界，核心设计）
- [x] `lib/types.ts`：新增 `CapabilityType`（skill | memory | rule | tool）、`CAPABILITY_TYPE_OPTIONS`、`CapabilityDefinition`（**定义/资产**：id/type/name/description）、`AgentCapability`（**Agent 装配关系**：id/agentId/capabilityId/enabled/createdAt）；**Agent 移除 Phase 2 的 `capabilities` 数字简写字段**，模型层不再硬编码四类能力
- [x] `lib/mock-data/seed.ts`：`seedCapabilityDefinitions`（16 条资产：skill×4 / memory×3 / rule×5 / tool×4）+ `seedAgentCapabilities`（34 条装配，含 2 条 `enabled:false` 用于停用展示）；Definition 与 Agent 解耦（如 skill-doc-summary 被 4 个 Agent 复用）
- [x] `lib/services/capabilities.ts`（新建 Service 边界）：`fetchCapabilityDefinitions` / `fetchAgentCapabilities(agentId)`（async + 220ms 延迟，未来换真实 API 只替换本文件）；纯函数 `composeCapabilityViews` 组装按类型分组的只读视图，悬空引用容错跳过；写操作契约（create/archive/attach/detach/setEnabled）在文件头注明后续阶段
- [x] `components/agents/capability-list.tsx`（新建）：数据驱动只读展示——按 `CAPABILITY_TYPE_OPTIONS` map 分组、`TYPE_ICONS` 图标映射（不硬编码四模块逻辑）；每组「启用数/总数」、状态点、名称、描述、「已停用」Badge、空态与加载骨架
- [x] `app/(workspace)/agents/[id]/page.tsx`：能力区由硬编码四行替换为 `<CapabilityList agentId>`，Badge「只读 · Phase 3」
- [x] **架构设计文档** `docs/Capability 架构设计.md`：领域关系模型（Definition ↔ AgentCapability ↔ Agent）、「定义/资产 vs 装配关系」归属分层、类型契约、Service 边界与 Mock→Real 替换路径、页面信息架构（当前只读 → 后续能力库/装配编辑）、演示数据说明

### 5. Dashboard 时间窗口口径统一（本次收尾根因修复）
- [x] 根因：`selectDailyStats` 起点为「今天 0 点 −(N−1) 天」（含今天共 N 个自然日），而 `periodStats`/`selectRunsInRange` 起点多推一天（N+1 天跨度），导致「本月运行 92 vs 趋势图 91」
- [x] 修复：三处统一为「**含今天在内的 N 个自然日**」窗口 `[今天 0 点 −(N−1) 天, 明天 0 点)`，指标卡 / 趋势图 / 最近活动 / 成功率 / Tokens 全部同源同口径
- [x] 实测：干净环境（清 localStorage）下「本月运行 91 = 趋势图 91 次」，成功率 91.2%（8 次失败）同窗口

## 三、验证结果（Phase 3 第一阶段 / P3-1）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 0 警告 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误 |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；13 条路由：12 静态 + `/agents/[id]` 动态） |
| 生产运行 | `npm run start`（localhost:3000） | ✅ 正常运行（最终构建已重启） |
| 持久化 | 创建 Agent → 硬刷新 → 保留 | ✅ 通过 |
| 重置演示数据 | Dialog 确认 → 6→5 个 Agent、toast 提示 | ✅ 通过 |
| 口径一致 | 指标 91 = 趋势图 91（清 localStorage 干净环境） | ✅ 通过 |
| Capability 详情 | agent-support 3/2/4/2 分组展示、agent-data「已停用」徽章 | ✅ 通过（与 seed 装配口径一致） |
| 无障碍 DOM | skip-link / main / 趋势图 tabindex+aria / 命中区 30 | ✅ 通过 |
| 生产控制台 | console 0 error | ✅ 通过 |

## 四、技术决策记录（ADR 简表，Phase 3 第一阶段更新）

| 编号 | 决策 | 理由 / 状态 |
| --- | --- | --- |
| D13 | **Zustand persist 持久化**（`partialize` 白名单 + version 1 + `createJSONStorage(localStorage)`） | ✅ 落地：仅持久化数据字段，hydrated 标志与 actions 不落盘；`resetDemoData` 保证演示可重新初始化 |
| D14 | **统一自然日窗口口径**（指标/图表/活动共用 `[今天 0 点 −(N−1) 天, 明天 0 点)`） | ✅ 落地：三处数字同源同口径，杜绝「92 vs 91」类展示差异；写为 Selector 注释契约 |
| D15 | **Capability 三层模型**（Definition 资产 / AgentCapability 装配 / Agent） | ✅ 落地：定义与 Agent 解耦、多对多复用、enabled 属装配关系；页面只消费组装视图，不硬编码四类能力逻辑 |
| D16 | **Capability Service 边界**（`lib/services/capabilities.ts`） | ✅ 落地：async 签名与未来真实 API 一致，Mock→Real 单文件替换；compose 纯函数容错悬空引用 |
| D17 | 趋势图焦点重置用**父级 `key={timeRange}` 重挂载**，弃用 useEffect setState | ✅ 落地：满足 `react-hooks/set-state-in-effect` 新 lint 规则，行为等价（切范围回最新一天） |

## 五、发现的问题（Phase 3 第一阶段）

1. **ESLint 新规则 `react-hooks/set-state-in-effect`**（趋势图 useEffect 内同步 setState）→ 改为父级 `key={timeRange}` 重挂载，行为等价且通过规则。
2. **类型契约演进残留**（`lib/services/agents.ts` 仍构造已删除的 `capabilities` 字段）→ 移除；tsc 全量检查暴露，已修复。
3. **Dashboard 时间窗口口径不一致**（根因已修复）：`selectDailyStats` 起点「今天 0 点 −(N−1) 天」与 `periodStats`/`selectRunsInRange`「−N 天」不一致 → 统一为「含今天在内的 N 个自然日」窗口，三处数字同源（干净环境实测 91 = 91）。
4. **浏览器自动化截图会话损坏**（P2 遗留，仅影响预览工具链）：旧标签截图通路挂起，P3 交互验证全部走新标签，正常完成；产品与验证不受影响。
5. **成功/失败运行的时间戳基于运行时生成**：seed 的 `daysAgo` 覆盖 0–29，窗口边缘存在 ±1 条归属差异的天然可能（统一口径后随当日时间自然收敛），已按「口径契约」处理，不视为缺陷。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| localStorage 持久化的数据版本（version 1） | 低 | persist version + migrate 钩子已就位，字段变更时可平滑迁移 |
| Capability 写操作（创建/装配/启停）尚未实现 | 低 | 属 Phase 3 第二阶段范畴，契约已在 Service 文件头声明 |
| 浏览器截图工具链不稳定（旧标签挂起） | 低 | 统一走新标签截图；不影响产品运行与验证结论 |
| 演示数据为确定性伪随机 | 低 | 已标注「演示数据」；真实 API 接入后整体替换 |
| P2 遗留：生产控制台 1 条 link-preload warning | 低 | Next.js 16 框架自身提示，无 error，不影响功能 |

## 七、下一步计划

1. **等待审批**：批准进入 **Phase 3 第二阶段 — Capability 能力层细化**。候选方向（供用户选择，不擅自扩大范围）：
   - 方案 A：四个能力模块（Skills / Memory / Rules / Tools）的**只读资产列表页**（基于 Definition 数据模型，统一信息架构）
   - 方案 B：Agent 详情的**装配关系编辑**（搜索资产库装配 / 启停 / 解绑，接 Service 写契约）
   - 方案 C：Capability 架构文档的「演进设计」继续细化（悬空引用策略 / 版本化 / 审计日志）
   - 方案 D：其他（用户指定）
2. 执行任何内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P3-1 收尾待办**：Git 提交（用户批准范围内执行）。

## 八、待审批事项

- [ ] **A7**：批准进入 Phase 3 第二阶段，并确认具体范围（候选见「七、下一步计划」）
- [ ] **A8**：Capability 架构设计文档（`docs/Capability 架构设计.md`）的评审与方向确认（复用模型 / 装配编辑 / 能力库页面形态）
