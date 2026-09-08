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
| 2026-09-08 | v0.5 | Phase 3 第二阶段 — Capability 装配关系编辑（方案 B） | Agent 详情页装配管理：搜索可用能力、装配、启用/停用、解绑（Dialog 确认）、三态区分、Service 写操作契约（贴近 REST）、persist v2（装配持久化 + migrate）、单一 Store 数据源实时一致、空态/加载/失败态完备；lint/tsc/build/生产交互验证全绿 | ✅ 已完成，待审批进入下一阶段 |

## 当前阶段

**Phase 3 第二阶段 — Capability 装配关系编辑（方案 B）**（已完成；**不自动进入下一阶段**，待审批）

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

## 二、已完成内容（Phase 3 第二阶段 / P3-2）

### 1. 装配关系编辑（Agent 详情页内，方案 B）
- [x] **Service 写操作契约** `lib/services/capabilities.ts`：`attachCapability({agentId, capabilityId})` / `setCapabilityEnabled({id, enabled})` / `detachCapability(id)`——全部 async + 模拟延迟 + 类型化返回，对应 REST 语义（POST / PATCH / DELETE），Mock 只做往返不持有状态，接入真实 API 仅替换本文件
- [x] **Store 演进** `stores/workspace.ts`：新增 `capabilityDefinitions`（资产，hydrate 回填，只读不持久化）+ `agentCapabilities`（装配，持久化）；persist **version 1 → 2** + migrate（旧数据自动补 seed 装配）；新增 actions `attachCapability`（幂等）/ `setCapabilityEnabled`（目标不存在抛错）/ `detachCapability`（幂等删除）；`resetDemoData()` 一并重置装配
- [x] **装配面板** `components/agents/capability-picker.tsx`（新建）：搜索框（自动聚焦、名称/描述过滤）、按类型分组、**三态区分**（未装配→「装配」按钮 / 已装配启用→「已启用」Badge 禁用 / 已装配停用→「已停用」Badge +「启用」按钮）、空搜索空态、操作 loading + toast、操作后面板与列表实时同步
- [x] **CapabilityList 升级为可编辑** `components/agents/capability-list.tsx`：改从单一 Store 读取（不再自持 fetch）；条目操作「停用/启用」+「解绑」（Trash2 → Dialog 二次确认，说明可重新装配）；空状态改为「尚未装配能力 + 装配能力按钮」；三态视觉（品牌色点/中性点+Badge）
- [x] **详情页** `app/(workspace)/agents/[id]/page.tsx`：Badge「只读 · Phase 3」→「可管理 · Phase 3」，头部「+ 装配能力」按钮，管理装配面板状态
- [x] **架构文档** `docs/Capability 架构设计.md` 第八章：三态模型（存在性 + 单一 enabled，不引入多布尔）、写契约、Store 演进、页面信息架构与交互规范、一致性保证、验证清单

### 2. 验证闭环（生产环境实测）
- [x] 装配：面板打开 → 搜索 → 装配「数据可视化建议」→ toast + 列表实时出现（Skills 3/3 → 4/4）
- [x] 停用 → 「已停用」Badge + 「启用」按钮；重新启用 → toast 恢复
- [x] 解绑：Trash2 → Dialog 确认 → toast + 列表移除（Skills 回 3/3）
- [x] 持久化：重装配 → 硬刷新 → 装配保留（4/4）；重置演示数据 → 装配恢复 seed（3/3）
- [x] Dashboard 回归正常；生产控制台 0 error

## 三、验证结果（Phase 3 第二阶段 / P3-2）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 0 警告 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误 |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；13 条路由：12 静态 + `/agents/[id]` 动态） |
| 生产运行 | `npm run start`（localhost:3000） | ✅ 正常运行（最终构建已重启） |
| 装配 | 搜索 → 装配 → 列表实时出现 + toast | ✅ 通过 |
| 停用/启用 | 已停用 Badge + 启用按钮 → 恢复 | ✅ 通过 |
| 解绑 | Dialog 确认 → 列表移除 | ✅ 通过 |
| 三态区分 | 面板中未装配/已启用/已停用各自呈现 | ✅ 通过 |
| 持久化 v2 | 重装配 → 硬刷新保留；migrate 旧数据 | ✅ 通过 |
| 重置恢复 | resetDemoData → 装配回 seed（34 条口径） | ✅ 通过 |
| 一致性 | 列表/面板/Store 实时同源；Dashboard 回归 | ✅ 通过 |
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

## 五、发现的问题（Phase 3 第二阶段）

1. **浏览器自动化 find 定位失败**（仅工具链，不影响产品）：`bu.find("装配能力")` 在深滚动页面返回空，改用 DOM querySelector 按文本定位按钮后稳定；截图/交互验证全部完成。
2. **面板占位元素无障碍修正**（已修复）：「已启用」行原用 `opacity-0` 幽灵按钮占位（仍可聚焦，属 a11y 缺陷），改为 `aria-hidden` 定宽 span，对齐且不可聚焦。
3. 第一阶段遗留项不变（截图旧标签挂起走新标签；link-preload 无害 warning）。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 装配编辑仅限 Agent 详情页内 | 低 | 符合本阶段范围；四类独立资产页/Definition CRUD 属后续阶段 |
| Definition 资产不持久化（seed 恒定） | 低 | 本阶段只读；Definition CRUD 阶段再引入持久化与版本迁移 |
| 写操作失败无注入入口（演示默认成功） | 低 | 失败路径 UI 完备（toast + 不落地 + 可重试）；真实 API 接入后自然生效 |
| 浏览器截图工具链不稳定 | 低 | 新标签截图路线稳定可用 |
| P2 遗留 link-preload warning | 低 | Next.js 16 框架提示，无 error |

## 七、下一步计划

1. **等待审批**：批准进入下一阶段。候选方向（供用户选择，不擅自扩大范围）：
   - 方案 A：四个能力模块（Skills / Memory / Rules / Tools）**只读资产列表页**（Definition 统一信息架构 + 展示被哪些 Agent 装配）
   - 方案 B：**Definition 资产管理**（创建/编辑/归档，接 Service 写契约）——资产可演进后闭环更完整
   - 方案 C：**Projects 业务化**（项目列表 + 与 Agent/Capability 关联）
   - 方案 D：其他（用户指定）
2. 执行任何内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P3-2 收尾待办**：Git 提交（用户批准范围内执行）。

## 八、待审批事项

- [ ] **A9**：批准进入下一阶段，并确认具体范围（候选见「七、下一步计划」）
- [ ] **A10**：Capability 架构文档（`docs/Capability 架构设计.md`）第八章装配编辑方案的评审确认
