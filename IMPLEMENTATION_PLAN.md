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
| 2026-09-08 | v0.3 | Phase 2 — 核心闭环（Dashboard + Agents） | Zustand 状态管理、Mock 服务层、演示数据、Dashboard 业务化、Agents 列表/新建/详情、模拟运行与数据回流、轻量 SVG 趋势图；lint/tsc/build/交互验证全绿 | ✅ 已完成，待审批进入 Phase 3 |

## 当前阶段

**Phase 2 / P2 — 核心闭环（Dashboard + Agents）**（已完成；**不进入 Phase 3**，待审批）

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

## 二、已完成内容（Phase 2 / P2）

- [x] **领域类型契约** `lib/types.ts`：`Agent / AgentRun / NewAgentInput / AgentCapabilities`、模型目录 `MODEL_OPTIONS`、时间范围 `TIME_RANGE_OPTIONS`、状态联合类型；界面层只依赖本契约
- [x] **演示数据层** `lib/mock-data/seed.ts`：5 个 Agent（覆盖 active/idle/error/paused 状态）+ 30 天窗口内的确定性伪随机运行记录（各 Agent 按不同频次生成，汇总 92 条，86/14 成功/失败权重）；数据标注「演示数据」，时间基于运行时生成，任意日期打开「最近 30 天」均有数据
- [x] **Mock 服务层** `lib/services/agents.ts`：`fetchAgents / fetchRuns / createAgent / runAgent` 全部 async + 模拟延迟（260ms / 1.4s）；签名与未来真实 API 一致，接入后端时仅替换本文件
- [x] **Zustand store** `stores/workspace.ts`：单一数据源（agents + runs + timeRange + hydrated）；actions（hydrate 幂等加载 / setTimeRange / createAgent / runAgent）；派生 Selectors（时间范围过滤、按日聚合、单 Agent 统计）均实时计算不落库
- [x] **轻量自研 SVG 趋势图** `components/charts/trend-chart.tsx`：柱状（每日运行量）+ 折线（每日成功率），零第三方图表依赖；静态可读 + 桌面 hover 增强；网格/轴/图例完整
- [x] **Dashboard 业务化** `app/(workspace)/dashboard/page.tsx`：指标卡（活跃 Agent / 本月运行 / 成功率 / Tokens 用量）真实计算并与「上一等长时段」对比（+x% 真实差值）；趋势图 + 最近活动接入 store；时间范围下拉真实切换（今天/7 天/30 天）；快捷操作改为真实跳转；加载态骨架
- [x] **Agents 列表页** `app/(workspace)/agents/page.tsx`：卡片网格（名称/模型/状态徽章/描述/运行次数/成功率/最近运行/Tokens），点击进入详情；空状态
- [x] **新建 Agent 页** `app/(workspace)/agents/new/page.tsx` + `AgentForm`：名称（必填）/模型选择（4 选项卡片）/描述/系统提示词；提交后创建 → toast → 跳转详情
- [x] **Agent 详情页** `app/(workspace)/agents/[id]/page.tsx`：配置（状态/模型/创建时间/最近运行/系统提示词只读）+ 已装配能力（Skills/Memory/Rules/Tools 只读展示 + 数量）+ 运行历史（状态徽章/摘要/时长/Tokens/消息数）+「运行」按钮触发模拟运行并实时回流；未找到状态
- [x] **共享组件重构**：`components/dashboard/` 拆分为 metric-card / activity-list / quick-actions（删除旧 dashboard-placeholders.tsx）；`components/agents/` 新增 status-badge / agent-card / agent-form
- [x] **格式化工具** `lib/format.ts`：千分位 / Tokens 缩写 / 百分比 / 时长 / 相对时间 / 日期时间，统一口径

## 三、验证结果（Phase 2 / P2）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 0 警告 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误 |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；13 条路由：12 静态 + `/agents/[id]` 动态） |
| 生产运行 | `npm run start`（localhost:3000） | ✅ 正常运行 |
| 交互验证（浏览器自动化，1440 桌面视口） | Dashboard 数据渲染 / Agents 列表 / 新建 / 详情 / 运行 / 回流 / 移动端 | ✅ 全部通过，见下方明细 |

**交互验证明细（生产环境实测）**：
- Dashboard：指标真实计算（活跃 3/共 5 个、本月运行 92、成功率 91.3%、Tokens 1.8M）、趋势图柱+线渲染、最近活动 7 条、快捷操作跳转正常
- 新建闭环：填写表单 → 创建 → toast「Agent 已创建」→ 跳转 `/agents/agent-xxx`，详情页配置/装配能力/空运行历史全部正确
- 运行触发：运行历史 0→1、成功率 100.0%、配置区「最近运行」同步变为「刚刚」、toast「运行完成」
- Dashboard 回流（客户端导航，内存态保留）：本月运行 92→93、成功率 91.3%→91.4%、最近活动首条即新运行记录；**全页刷新会重置内存态（P2 约定行为，已确认）**
- 移动端（390×844）：汉堡菜单出现、顶栏压缩、单列布局、数据完整渲染
- 生产控制台：**0 error**（仅 1 条 Next.js 自身 link-preload 提示，属框架无害 warning）

## 四、技术决策记录（ADR 简表，Phase 2 更新）

| 编号 | 决策 | 理由 / 状态 |
| --- | --- | --- |
| D1 | **本地工程实现**，不使用应用生成器沙箱 | 用户要求固定技术栈、自持源码、本地环境检查、逐阶段审批 |
| D2 | Next.js 16 **App Router** + RSC + 客户端交互岛屿 | 实际脚手架版本为 16.3.4（最新稳定） |
| D3 | **Zustand** 状态管理（单一全局 store，后续按领域拆分） | ✅ **Phase 2 已落地**：`stores/workspace.ts`，内存态（刷新重置），单一数据源 |
| D4 | 服务层抽象 + Mock 实现 | ✅ **Phase 2 已落地**：`lib/services/agents.ts` async 签名与未来 API 一致，替换即接真后端 |
| D5 | **深色优先**设计 Token（CSS 变量，`.dark` 正式用色 + `:root` 浅色预留） | 用户指定深色 AI SaaS 风格；token 体系保留扩展点 |
| D6 | 轻量自研 SVG 图表，不引入重型图表库 | ✅ **Phase 2 已落地**：`trend-chart.tsx` 纯 SVG（柱+线），零依赖；保留 Recharts 扩展点 |
| D7 | Geist Sans / Geist Mono 自托管（geist 包） | 规避 next/font/google 在国内构建拉取失败 |
| D8 | npm 为默认包管理器 | create-next-app 原生默认、稳定 |
| D9 | 演示数据集中存放 `lib/mock-data` | ✅ **Phase 2 已落地**：`seed.ts` 确定性伪随机 + 「演示数据」显式标注 |
| D10 | shadcn style 采用 **radix-nova**（统一 `radix-ui` 包 + `cn` 包） | 新版 CLI 默认生态；**注意 CommandDialog 不含 `<Command>` 包裹层，消费方需自行包裹** |
| D11 | 聚合统计实时计算（Selectors），不落库 | ✅ P2：totalRuns/successRate/tokens 等由 runs 派生，新建/运行后 Dashboard 自动联动 |
| D12 | 路由：`/agents` 列表、`/agents/new` 新建、`/agents/[id]` 详情 | 语义化 REST 风格，未来可扩展 `/agents/[id]/edit` 等 |

## 五、发现的问题（Phase 2）

1. **全页刷新重置内存态**（P2 约定行为，非缺陷）：Zustand store 为内存态，硬刷新后回到种子数据；客户端导航（侧栏/卡片点击）时状态与回流完整保留。已在产品内以「刷新即重置」为预期行为。
2. **详情页 TS 收窄陷阱**（已修复）：`handleRun` 闭包内直接引用 `agent.id` 触发 TS18048（函数声明提升导致收窄失效），改为闭包外参数 `agentId` 传入解决——lint/tsc 全覆盖下才暴露的类型层问题。
3. **浏览器自动化截图会话损坏**（仅影响预览，不影响产品）：本会话 `Target.attachToTarget` 后原标签 `Page.captureScreenshot` 挂起（DOM 操作正常）；新开标签截图正常，P2 全部预览截图取自新标签。旧标签废弃。
4. **生产控制台存在 1 条 link-preload warning**：Next.js 16 + Turbopack 自身对预载 CSS 的提示，无 error，不影响功能。
5. Phase 1 遗留问题（路径空格 / npm 镜像 / PowerShell / shadcn CLI 交互 / CommandDialog 结构）仍在，处理方式不变。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 内存态刷新重置 | 低 | P2 约定行为；Phase 3+ 如需持久化再引入 localStorage 或真实后端 |
| 演示数据为确定性伪随机 | 低 | 已标注「演示数据」；真实 API 接入后整体替换 |
| 趋势图 hover 在触屏无等效（有静态图例） | 低 | 核心结论静态可读，触屏不影响理解 |
| 种子 run 成功率 86% 与「新增 Agent 成功率高」的口径差异 | 低 | 实时计算口径一致；文案已按实际数据呈现 |
| Phase 3+ 依赖版本组合（图表/表格库等） | 中 | 进入 Phase 3 时按里程碑逐个引入并验证 |

## 七、下一步计划

1. **等待审批**：批准进入 Phase 3。候选方向（供用户选择，不擅自扩大范围）：
   - 方案 A：Skills / Memory / Rules / Tools 中任一模块的独立页面（延展核心闭环之外的组织层）
   - 方案 B：Projects 页面业务化（项目列表 + 与 Agent 关联）
   - 方案 C：设置页业务化（工作区信息 / 偏好 / 外观）
   - 方案 D：打磨与收尾（状态持久化、更多交互细节、无障碍）
2. 执行任何 Phase 3 内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P2 收尾待办**：Git 提交（用户批准范围内执行）。

## 八、待审批事项

- [ ] **A6**：批准进入 Phase 3，并确认 Phase 3 具体范围（候选见「七、下一步计划」，请用户明示优先级）
