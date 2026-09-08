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
| 2026-09-08 | v1.0 | V1 Architecture Review + Scope Freeze（纯审查，零代码修改） | 全量架构审查：领域模型 6 实体无复制/无第二数据源/生命周期无冲突/DB 适配良好；数据流 UI→Store→Selector→Service 合规（唯一例外为纯函数 composeCapabilityViews）；技术债务分级 P0=无 / P1=5 项（分页契约/错误模型/DTO 策略/id 策略/seed-migrate 流程）；Mock→Real 演进判定为 Service 契约足以替换；结论「Mock 边际收益已递减，推荐现在转向 Phase 4 真实后端设计」；V1 范围冻结：已具备 6 类闭环、明确延后 9 类功能 | ✅ 已完成，待审批（输出《V1 Architecture Review》） |

## 当前阶段

**V1 Architecture Review + Scope Freeze（Phase 3 第七阶段，纯审查）**（已完成；**不自动进入下一阶段**，待审批）

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

## 二、已完成内容（V1 Architecture Review / 纯审查，零代码修改）

### 1. 审查范围与核验事实
- [x] 领域模型 6 实体（Agent / AgentRun / CapabilityDefinition / AgentCapability / Project / ProjectAgent）：职责分离一致（资产 / 关系两层），**无数据复制、无隐藏第二数据源**（组件外无 localStorage）、生命周期无冲突（四组状态语义独立；Capability 两维状态正交）
- [x] 数据流 UI → Store → Selector → Service：所有写操作经 Store actions；唯一组件直连 Service 为 `capability-list.tsx` 导入纯函数 `composeCapabilityViews`（只读派生，P3 归属问题）
- [x] 单一时间窗口：`selectRunsInRange` 全站唯一
- [x] 18 个 Service 契约逐个判定可替换性（Agents 4 / Capabilities 9+1纯 / Projects 5）

### 2. 技术债务分级
- [x] **P0：无**（架构健康，无阻塞项）
- [x] **P1（接后端前必须）5 项**：分页契约 / 统一错误模型 / DTO 与 Domain 分离策略 / id 服务端生成策略 / seed-migrate 同步流程文档化
- [x] **P2（可后续）4 项**：dashboard periodStats 窗口计算收敛 / Definition 时间戳 / 嵌套 Link 限制 / 单 Store 切片评估
- [x] **P3（可忽略）4 项**：composeCapabilityViews 归属 / uid 非 UUID / seed 相对时间不随日期平移 / 重置演示数据为演示专用

### 3. 结论与建议
- [x] Mock 边际收益已递减；推荐**现在转向 Phase 4 真实后端设计**（API 契约 + DB Schema → 替换 Service 为 HTTP 客户端，前端零改动验证），而非继续堆前端
- [x] V1 范围冻结：已具备 6 类闭环；明确延后 9 类（Project Archive/Restore/Edit、Capability Versioning、Settings、Tasks、Collaboration、权限、能力图谱等）；以后值得做：真实 AI Runtime、能力图谱、版本管理
- [x] 产出 `docs/V1-Architecture-Review.md`（完整审查报告，含架构图/评估/债务/演进建议/冻结清单）

## 三、验证结果（V1 Architecture Review）

| 检查项 | 结果 |
| --- | --- |
| 代码修改 | ✅ 零修改（审查产物仅新增 `docs/V1-Architecture-Review.md`） |
| lint / tsc / build | ✅ 无需执行（无代码改动；上一阶段全绿基线保持） |
| 事实核验 | ✅ 基于代码事实（services 18 签名 / store persist v4 / 页面数据访问面 / 无第二数据源） |

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
| D34 | **Dashboard 项目维度全部复用既有 Selector**（selectProjectStats / selectRunsInProjectWindow → selectRunsInRange），不新增统计实现 | ✅ 落地：Dashboard 与 Project Detail 同源同口径（2/38/87% 双向一致） |
| D35 | **Project Detail「最近运行」复用 ActivityList**（纯展示组件，同 props 契约） | ✅ 落地：零重复渲染逻辑，空态/状态徽章沿用 |
| D36 | **Agents 项目关联只展示不改架构**：AgentCard 新增可选 `projectsOf` 徽章行（≤2 +N），列表结构与信息层级不变 | ✅ 落地：5 卡片徽章正确；避免嵌套 Link（卡片外层已是链接） |
| D37 | **V1 Scope Freeze**：停止堆前端模块；P0 债务 = 无；P1 5 项（分页/错误模型/DTO/id/seed-migrate 流程）在接后端前修复；延后 9 类功能 | ✅ 审查结论（见 docs/V1-Architecture-Review.md） |
| D38 | **真实后端切入点判定**：Mock 边际收益已递减，推荐 Phase 4 转向真实后端设计（先契约后实现，前端零改动） | ✅ 审查结论，待用户审批 |

## 五、发现的问题（V1 Architecture Review）

1. **dashboard/page.tsx 内联 `periodStats` 重复窗口计算**（P2）：与 selectRunsInRange 同口径但违反 DRY；接后端前收敛为 Store Selector。
2. **`capability-list.tsx` 直连 Service 导入纯函数**（P3）：`composeCapabilityViews` 只读派生，无违规行为；归属上应移至 lib。
3. **seed / migrate 隐性契约**（P1 流程性）：seed 增字段必须同步 migrate 补丁，否则版本漂移；需文档化。
4. **seed 相对时间特性**（P3）：seed 用 `now - N*DAY` 生成，跨天访问窗口内数字衰减；演示特性，接真实数据后消失。
5. **AgentCard 嵌套 Link 限制**（P2）：项目徽章不可点击；未来若需点击需重构卡片结构。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 真实后端尚未启动（Mock 收益递减中） | P1 | 推荐 Phase 4 真实后端设计（待审批） |
| 分页 / 错误模型 / DTO 未定稿 | P1 | Phase 4 契约先行，避免接后端时重构 |
| runAgent 为随机数（非真实 AI） | P1 | 真实 AI Runtime 属「以后值得做」，Phase 4 可先桩实现 |
| Settings 等占位模块 | P3 | 明确延后 |
| 浏览器截图工具链不稳定 | P3 | 新标签路线稳定可用；不影响功能验证 |

## 七、下一步计划

1. **等待审批**：批准下一步方向。候选（供用户选择，不擅自扩大范围）：
   - 方案 A（推荐）：**Phase 4 真实后端设计**——REST API 契约文档 + DB Schema + 分页/错误模型定稿（先纯设计文档，再实现替换 Mock，前端零改动验证）
   - 方案 B：**先清 P1/P2 前端债务**（窗口计算收敛 / Definition 时间戳 / seed-migrate 流程文档化）再进后端
   - 方案 C：**Settings 业务化**（用户偏好 + 工作区设置，纯前端）
   - 方案 D：其他（用户指定）
2. 执行任何内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。

## 八、待审批事项

- [ ] **A19**：批准《V1 Architecture Review》结论（P0=无 / P1 5 项 / 推荐 Phase 4 真实后端）
- [ ] **A20**：确认下一阶段方向（候选见「七、下一步计划」）
