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
| 2026-09-08 | v0.7 | Phase 3 第四阶段 — Definition 资产管理（方案 A：资产生命周期） | 生命周期两维状态分离（lifecycle 落模型 Active/Archived；Used/Unused 派生不落字段）、创建/编辑/归档（软删除）/恢复全走 Service 写契约、persist v3 + migrate（v1/v2 平滑升级补资产）、归档后不可新装配（Picker 禁用 + Store 校验双保险）、已归档装配保留展示并冻结（不悬空）、Hub/Asset Detail/Agent Detail/Picker 四处同源、Hub 搜索 + 排序（低成本体验增强）、Loading/Success/Error/Empty 完备；lint/tsc/build/生产交互验证全绿 | ✅ 已完成，待审批进入下一阶段 |

## 当前阶段

**Phase 3 第四阶段 — Definition 资产管理（方案 A：资产生命周期）**（已完成；**不自动进入下一阶段**，待审批）

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

## 二、已完成内容（Phase 3 第四阶段 / P3-4）

### 1. 领域规则与生命周期模型（先明确后编码）
- [x] **两维状态分离**：`CapabilityDefinition.lifecycle: "active" | "archived"`（`CapabilityLifecycle` 类型 + `CAPABILITY_LIFECYCLE_OPTIONS`）落模型；**使用状态 Used/Unused 为派生值**（装配数 > 0），不写入 Definition
- [x] **归档 = 软删除**：Definition 保留在资产库（仅 lifecycle 变更），不物理删除、不自动解绑 AgentCapability
- [x] **已归档装配不悬空**：composeCapabilityViews 不再跳过 archived 定义（仅完全悬空引用跳过）；Agent 详情/Used by 均展示「已归档」标记
- [x] **归档后不可新装配**：Picker 中 archived 定义显示「已归档」禁用（无装配按钮）+ Store `attachCapability` 校验抛错（双保险）
- [x] **已归档装配冻结**：Agent 详情中 archived 能力行「已归档 | 冻结」（禁用启停/解绑）；恢复后重新可管理
- [x] **创建/编辑/归档/恢复全部经 Service → Store**，页面不直接修改领域数据

### 2. 模型 / Service / Store
- [x] `lib/types.ts`：`CapabilityLifecycle` + `CapabilityDefinition.lifecycle` + `NewCapabilityInput` / `UpdateCapabilityInput` 契约
- [x] `lib/mock-data/seed.ts`：16 条定义补 lifecycle: "active"；新增 2 条 archived 示例——`skill-rss-digest`（archived + 被 writer 装配 1 条，验证 archived+used 与冻结展示）、`tool-legacy-http`（archived + 无装配，验证 archived+unused）；装配 48 → **49**（修正：seed 实际为 48 条，非此前文档记录的 34）
- [x] `lib/services/capabilities.ts`：新增 `createCapability`（POST）/ `updateCapability`（PATCH）/ `archiveCapability`（PATCH lifecycle=archived）/ `restoreCapability`（PATCH lifecycle=active），全部 async + 220ms 延迟 + 类型化返回；文件头契约注释更新
- [x] `stores/workspace.ts`：persist **version 2 → 3**；`partialize` 增加 `capabilityDefinitions`（可写持久化）；`migrate` v1/v2 → v3 补 seed 定义副本（v1 同时补装配）；新增 actions `createCapability` / `updateCapability` / `archiveCapability`（幂等）/ `restoreCapability`（幂等）；`attachCapability` 增加 archived 拒绝校验

### 3. UI（Hub / Asset Detail / Agent Detail / Picker 四处同源）
- [x] `components/capabilities/capability-lifecycle-badge.tsx`（新）：Active（brand 点）/ Archived（灰点）徽章
- [x] `components/capabilities/capability-form-dialog.tsx`（新）：创建/编辑共用 Dialog（类型 radiogroup + 名称 + 描述；空名称禁用提交；loading + toast；key 重挂载初始化避免 effect setState）
- [x] Hub 列表：两维状态（生命周期徽章 + 派生使用状态）+ **搜索**（名称/描述本地过滤）+ **排序**（名称/使用数）+ 「新建能力」入口 + archived 汇总说明行 + 空态细分（无匹配/类型为空）
- [x] Hub 详情：生命周期字段 + 使用状态（派生）字段分离；编辑 / 归档 / 恢复操作（归档/恢复 Dialog 确认 + 影响说明）；archived 顶部横幅（软删除语义说明）；Used by 行「已归档」标记；未使用空态按 archived 差异化提示
- [x] Agent 详情装配列表：archived 行「已归档 | 冻结」（启停/解绑禁用，aria-hidden 占位对齐）
- [x] Picker：archived 定义 `opacity-60` + 「已归档」Badge，无装配按钮

### 4. 验证闭环（生产环境实测）
- [x] 干净环境 Hub：18 个资产（16 active + 2 archived）· 49 个装配；DOM 实测 16 Active + 2 Archived 徽章
- [x] 创建「周报生成器」→ toast + 列表实时 19 资产；**硬刷新保留**（persist v3）
- [x] 编辑 → 名称/描述更新 + toast（仅元信息，lifecycle 不变）
- [x] 归档 → Dialog 确认 → Archived 徽章 + 软删除横幅 + 「恢复」按钮
- [x] 恢复 → Active + 「归档」按钮回归
- [x] archived+used：RSS 详情（生命周期 Archived / 使用状态 使用中 / Used by 内容撰稿助手 + 「已归档」标记）
- [x] archived+unused：遗留 HTTP 回调详情（未使用 + 空态「该能力已归档，不可再被新 Agent 装配」）
- [x] Agent 详情（writer）：RSS 订阅汇总行「已归档 | 冻结」；active 能力启停回归正常
- [x] Picker：搜索「遗留」→ 显示「已归档」且无「装配」按钮
- [x] **migrate 实测**：注入 version 2 旧数据（无 definitions/装配）→ 自动升级 version 3 + definitions 回填 18 条 + 页面正常（当前详情页空态符合预期，旧数据不含新建定义）
- [x] 生产控制台 0 error

## 三、验证结果（Phase 3 第四阶段 / P3-4）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 0 警告 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误 |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；10 条路由 + 4 条重定向） |
| 生产运行 | `npm run start`（localhost:3000） | ✅ 正常运行（最终构建已重启） |
| 两维状态 | 18 资产：16 Active + 2 Archived；使用状态派生 | ✅ 通过（DOM 实测） |
| 创建 | Dialog → toast → 列表实时 19 资产 | ✅ 通过 |
| 持久化 v3 | 硬刷新保留新建定义 | ✅ 通过 |
| 编辑 | 名称/描述更新 + toast | ✅ 通过 |
| 归档/恢复 | Dialog 确认 → Archived/Active 互切 + 横幅 | ✅ 通过 |
| 归档不可装配 | Picker 禁用 + Store 校验（双保险） | ✅ 通过 |
| 归档不悬空 | Agent 详情「已归档 | 冻结」；Used by 带标记 | ✅ 通过 |
| 冻结管理 | archived 装配禁启停/解绑；恢复后可管理 | ✅ 通过 |
| migrate | v2 注入 → version 3 + definitions 回填 18 | ✅ 通过 |
| 同源一致 | Hub / Detail / Agent / Picker 四处实时联动 | ✅ 通过 |
| 生产控制台 | console 0 error | ✅ 通过 |

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

## 五、发现的问题（Phase 3 第四阶段）

1. **seed 装配条数最终修正为 49**：P3-3 确认实际 48 条；本阶段新增 1 条 archived 装配示例（writer × RSS）→ 49。此前 v0.4/v0.5 的「34 条」为记忆误差，已彻底修正。
2. **React 受控输入 + 浏览器自动化原生赋值**（工具链，非产品缺陷）：`el.value = ...` 直赋不触发 React onChange（受控 value tracker），按钮保持禁用；改用 `HTMLInputElement.prototype.value` 原生 setter + `input` 事件后正常。人工操作无此问题。
3. **lint 新规则 `react-hooks/set-state-in-effect`**：表单初始化曾用 effect 内同步 setState 被拦截 → 改为 Dialog 打开时 `key` 重挂载初始化（无 effect），符合规则。
4. **migrate 后旧详情页空态属预期**：注入 v2 数据不含新建定义，详情页显示「未找到」是正确行为（非 bug）。
5. 既有遗留不变（截图新标签视口偏小；link-preload 无害 warning）。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 生命周期无版本管理（archived 后不可追溯历史版本） | 低 | 明确不在本阶段范围；未来 Capability 版本管理阶段再演进 |
| Definition 无 created/updatedAt 时间戳 | 低 | 当前未用；如需排序/审计再补字段 + persist migrate |
| Hub 列表生命周期徽章在窄屏（<lg）隐藏 | 低 | 响应式密度取舍；详情页与搜索均可见；大屏全量展示 |
| 浏览器截图工具链不稳定 | 低 | 新标签路线稳定可用 |
| P2 遗留 link-preload warning | 低 | Next.js 16 框架提示，无 error |

## 七、下一步计划

1. **等待审批**：批准进入下一阶段。候选方向（供用户选择，不擅自扩大范围）：
   - 方案 A：**Capability 版本管理**（生命周期 + 版本演进，或 Definition 编辑历史）
   - 方案 B：**Projects 业务化**（项目列表 + 与 Agent/Capability 关联）
   - 方案 C：**Settings 业务化**（工作区设置 + 用户偏好）
   - 方案 D：**Dashboard/Agents 增强**（更多指标卡、Agent 详情能力图谱等）
   - 方案 E：其他（用户指定）
2. 执行任何内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P3-4 收尾待办**：Git 提交（用户批准范围内执行）。

## 八、待审批事项

- [ ] **A13**：批准进入下一阶段，并确认具体范围（候选见「七、下一步计划」）
- [ ] **A14**：Capability 架构文档（`docs/Capability 架构设计.md`）第十章「资产生命周期管理」评审确认
