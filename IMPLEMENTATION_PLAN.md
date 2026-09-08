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
| 2026-09-08 | v0.6 | Phase 3 第三阶段 — Capability Asset Hub（方案 A 重定义） | 统一能力资产中心（非四个独立页面）：All/Skills/Memory/Rules/Tools 筛选（URL 驱动）、资产列表（名称/类型/描述/状态/使用数）、资产详情（基本信息 + Used by + 装配概览）、旧占位路由重定向、共享图标/徽章组件去重；Definition 只读；Hub 与 Agent 详情同一 Store 数据源实时联动；lint/tsc/build/生产交互验证全绿 | ✅ 已完成，待审批进入 Definition 写操作阶段 |

## 当前阶段

**Phase 3 第三阶段 — Capability Asset Hub（方案 A 重定义）**（已完成；**不自动进入 Definition 写操作阶段**，待审批）

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

## 二、已完成内容（Phase 3 第三阶段 / P3-3）

### 1. Capability Asset Hub（统一资产中心，方案 A 重定义）
- [x] **导航整合** `lib/navigation.ts`：智能体分组由 4 项（Skills/Memory/Rules/Tools）合并为 1 项 **Capabilities**（Blocks 图标）——命令面板/顶栏自动同步
- [x] **统一信息架构**：`/capabilities` Hub 列表 + `/capabilities/[id]` 资产详情；列表内 All / Skills / Memory / Rules / Tools 筛选（URL query 驱动，可分享可刷新，role=tablist + aria-selected）
- [x] **列表** `app/(workspace)/capabilities/page.tsx`：16 个资产按类型分组排序，每行展示名称/描述/类型徽章/状态（派生：使用中/未使用）/被装配数（N 个 Agent）；统计「16 个资产 · 48 个装配」；空态；骨架
- [x] **详情** `app/(workspace)/capabilities/[id]/page.tsx`：基本信息（类型/状态/描述/能力标识/装配数）+ **Used by**（装配该资产的 Agent 列表：名称/模型状态徽章/装配时间/装配状态「已启用|已停用」，点击跳 Agent 详情）+ 装配概览（总使用/已启用/已停用）；未使用空态 + 未找到空态
- [x] **旧路由重定向** `next.config.ts`：`/skills|/memory|/rules|/tools` → `/capabilities?type=…`（permanent），四个旧占位页已删除
- [x] **共享组件去重**：新增 `lib/capability-meta.ts`（CAPABILITY_TYPE_ICONS 唯一来源）与 `components/capabilities/capability-type-badge.tsx`（类型徽章），Agent 详情装配列表/面板/Hub 共用，消除重复
- [x] **Definition 保持只读**：无创建/编辑/删除/归档；数据完全来自现有三层模型 + Service + Zustand

### 2. 关键验证（Definition 独立资产合理性）
- [x] 文档摘要被 **5 个 Agent** 复用（支持/撰稿/调研/数据/运维），Used by 全量列出 + 装配状态
- [x] **Hub 与 Agent 详情同源联动**：在 Agent 详情停用「网页搜索」→ Hub 详情页立即反映客户支持助手「已停用」、装配概览变为 2 启用/1 停用（同一 Store，零额外同步）
- [x] 硬刷新后停用状态保留（持久化 v2）；Agent 详情装配面板回归正常
- [x] 类型筛选：`/capabilities?type=skill` 仅显示 Skills 4 项；旧路由 `/skills` 301 → 同 URL
- [x] 生产控制台 0 error

## 三、验证结果（Phase 3 第三阶段 / P3-3）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 0 警告 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误（清 .next 缓存后） |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；10 条路由 + 4 条重定向；`/capabilities` Static + `/capabilities/[id]` Dynamic） |
| 生产运行 | `npm run start`（localhost:3000） | ✅ 正常运行（最终构建已重启） |
| Hub 列表 | 16 资产 · 48 装配 · 类型分组 · 状态/使用数 | ✅ 通过 |
| 类型筛选 | All/Skills/Memory/Rules/Tools + URL 驱动 | ✅ 通过 |
| 资产详情 | 基本信息 + Used by（5 Agent 复用）+ 装配概览 | ✅ 通过 |
| 同源联动 | Agent 停用 → Hub 详情实时「已停用」+ 概览 2/1 | ✅ 通过 |
| 持久化 | 硬刷新保留停用状态 | ✅ 通过 |
| 旧路由 | /skills 等 301 重定向到 /capabilities?type=… | ✅ 通过 |
| 回归 | Agent 详情装配管理（面板/启停/解绑）正常 | ✅ 通过 |
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

## 五、发现的问题（Phase 3 第三阶段）

1. **seed 装配条数记录修正**：Hub 统计暴露实际为 **48 条**（5 Agent 合计 11+10+4+13+10=48），此前 v0.4/v0.5 文档沿用「34 条」为记忆误差；已在本版修正为实际口径。
2. **删除旧路由后 `.next` 缓存残留类型引用**（工具链）：tsc/build 报已删除页面 module 找不到 → 清 `.next` 缓存后全绿；Next 16 对路由增删需清理开发缓存。
3. **useSearchParams 需 Suspense 边界**：Hub 列表页按 Next 16 约定在 Suspense 内使用，页面保持 Static + 客户端筛选，无 CSR bailout。
4. 既有遗留不变（截图旧标签挂起走新标签；link-preload 无害 warning）。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| Definition 资产仍只读（无 CRUD/归档） | 低 | 属下一阶段；写契约在 Service 文件头已预留 |
| 资产「状态」为派生展示（未落模型） | 低 | 与只读模型一致；若未来引入 archived 再演进 |
| Hub 筛选未做跨类型多选/搜索 | 低 | 本阶段信息架构按用户建议（All/四类单选）；搜索可在后续增强 |
| 浏览器截图工具链不稳定 | 低 | 新标签路线稳定可用 |
| P2 遗留 link-preload warning | 低 | Next.js 16 框架提示，无 error |

## 七、下一步计划

1. **等待审批**：批准进入 **Definition 写操作阶段**（用户已预告「不要自行进入」）。候选方向（供用户选择，不擅自扩大范围）：
   - 方案 A：**Definition 资产管理**（创建/编辑/归档/恢复，接 Service 写契约 + persist v3）——资产可演进，Hub 与装配闭环完整
   - 方案 B：**Hub 增强**（资产搜索/排序、跨类型筛选、Definition 被归档后装配的悬空态展示）
   - 方案 C：**Projects 业务化**（项目列表 + 与 Agent/Capability 关联）
   - 方案 D：其他（用户指定）
2. 执行任何内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P3-3 收尾待办**：Git 提交（用户批准范围内执行）。

## 八、待审批事项

- [ ] **A11**：批准进入 Definition 写操作阶段，并确认具体范围（候选见「七、下一步计划」）
- [ ] **A12**：Capability 架构文档（`docs/Capability 架构设计.md`）是否需要补 Hub 设计章节（资产中心信息架构 / 派生状态 / 旧路由合并）
