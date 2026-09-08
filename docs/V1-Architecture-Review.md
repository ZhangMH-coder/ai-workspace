# V1 Architecture Review — AI Workspace

> 阶段：V1 Architecture Review + Scope Freeze（Phase 3 第七阶段，纯审查不编码）
> 日期：2026-09-08 · 状态：等待审批
> 范围：领域模型 / 数据流与状态管理 / Mock→Real 演进 / 一致性 / UX 闭环 / 技术债务分级 / 真实后端切入点 / V1 范围冻结

---

## 1. 当前架构图（现状）

```
┌────────────────────────────────────────────────────────────────┐
│  UI 层（Next.js App Router，10 条路由）                          │
│  Dashboard · Agents(+new/+[id]) · Capabilities(+[id])           │
│  Projects(+[id]) · Settings(占位) · CommandPalette · AppShell   │
└──────────────┬─────────────────────────────────────────────────┘
               │ 只读：组件订阅 store + 派生 Selector
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Zustand Store（唯一权威数据源，persist v4 / localStorage）       │
│  agents · runs · capabilityDefinitions · agentCapabilities      │
│  projects · projectAgents · timeRange                           │
│  actions（14）：create/run/attach/detach/setEnabled/            │
│  create/update/archive/restore(×3 域)/resetDemoData             │
│  Selectors：selectRunsInRange（统一窗口）/ selectDailyStats /    │
│  selectAgentStats / selectProjectStats / 项目 join 系列          │
└──────┬───────────────────────────────┬─────────────────────────┘
       │ hydrate/reset 读取             │ 写操作（async，wait 后 set）
       ▼                               ▼
┌─────────────────────┐   ┌──────────────────────────────────────┐
│ Mock Service 层      │   │ seed（演示初始数据，非运行时权威）      │
│ agents(4) ·          │   │ 5 Agent · 26+ runs · 18 Def ·        │
│ capabilities(9+1纯)  │   │ 49 装配 · 3 Project · N 关系           │
│ projects(5)          │   └──────────────────────────────────────┘
└─────────────────────┘
```

- **单一数据源成立**：运行时权威 = Store；seed 仅在 hydrate（无持久化）/ resetDemoData / migrate 补丁时出现。
- **单一时间窗口成立**：`selectRunsInRange`（含今天 N 自然日）为唯一窗口函数，全站复用。

## 2. 领域模型评估

| 实体 | 职责 | 判定 |
| --- | --- | --- |
| `Agent` | 工作区级可复用资产（含运行行为触发） | ✅ 清晰 |
| `AgentRun` | 天然归属 Agent（agentId 外键），无 projectId | ✅ 清晰；避免大表冗余 |
| `CapabilityDefinition` | 能力资产 + lifecycle（active/archived 软删除） | ✅ 清晰 |
| `AgentCapability` | 装配关系（agentId+capabilityId+enabled） | ✅ 关系与资产分离 |
| `Project` | 业务组织上下文 + status（active/archived 预留） | ✅ 清晰 |
| `ProjectAgent` | 项目↔Agent 多对多中介（只引用 id） | ✅ 清晰 |

**结论**：
- 实体职责分离一致（资产 / 关系两层心智模型，与真实 DB 的关系表天然对应）。
- **无数据复制**：所有关系仅引用 id；localStorage 检查无重复副本。
- **无隐藏第二数据源**：组件外无 localStorage / sessionStorage / 全局变量持有业务数据。
- **无生命周期冲突**：Capability lifecycle / Project status / Agent status / Run status 语义独立，互不推导；Capability 两维状态（生命周期落模型、使用状态派生）正交。
- **DB 适配性**：关系表结构（agent_capabilities / project_agents / agent_runs.agentId）可直接映射 SQL；`selectRunsInRange` 窗口逻辑可平移为 SQL `WHERE started_at >= ? AND < ?`。

## 3. 数据流与状态管理评估

**UI → Store → Selector → Service → Mock 链路**：
- ✅ 所有**写操作**均经 Store actions → Service（页面不直接写领域数据）。唯一组件直连 Service 的是 `capability-list.tsx` 导入**纯函数** `composeCapabilityViews`（只读派生组装，无副作用）——P3 级归属问题，非违规。
- ✅ Selector 依赖单向、无循环；派生不落库。
- ✅ persist / seed 职责分离（见架构图）；`resetDemoData` 保证演示可重新初始化。
- ⚠️ **migration 长期演进**：阶梯式 v1→v2→v3→v4 补丁模式稳定，但存在隐性契约——**seed 增字段必须同步 migrate 补丁**，否则新旧版本漂移。需文档化（P1 流程性）。

## 4. 技术债务分级

### P0（阻塞后续开发）
**无。** 当前架构健康，无阻塞项。

### P1（进入真实后端前必须）
1. **列表分页契约**：当前全量拉取（runs 未来规模最大）。真实 API 必须定义分页（`?page&pageSize&from&to`），前端列表/趋势需同步改造。
2. **统一错误模型**：当前 `throw Error` + toast；真实 API 需 `ApiError{code,message,field?}` 契约与边界处理。
3. **DTO 与 Domain 分离策略**：当前 Model 即 Domain。接后端前需定稿「API 响应类型（DTO）」层，避免响应字段与领域字段耦合。
4. **id 生成策略**：当前前端 `uid()` 生成；真实后端应由服务器生成（POST 返回实体——现有契约已兼容）。
5. **seed / migrate 同步流程文档化**：防版本漂移。

### P2（可后续处理）
1. `dashboard/page.tsx` 内联 `periodStats` 重复实现了窗口计算（与 selectRunsInRange 同口径但 DRY 违约）——收敛为 Store Selector。
2. `CapabilityDefinition` 缺 createdAt/updatedAt（审计/排序缺字段，需 migrate）。
3. `AgentCard` 嵌套 Link 限制：项目徽章不可点击（未来如需点击需重构卡片结构）。
4. 单一 Store 职责偏重（7 域 + 14 actions）——规模增长前可拆 slices（zustand 原生支持），当前不阻塞。

### P3（纯优化/可忽略）
1. `composeCapabilityViews` 纯函数归属：从 service 移至 lib（归属整洁）。
2. `uid()` 非 UUID 格式（接后端即废弃，无影响）。
3. seed 相对时间（`now - N*DAY`）不随日期平移：跨天访问窗口内数字衰减——演示数据特性，接真实数据后消失。
4. 「重置演示数据」为演示专用功能：真实产品不存在，保留并标注或接后端移除。

## 5. Mock → Real API 演进建议

**逐个 Service 判定（是否足以自然替换 REST）**：

| Service | 读 | 写 | 判定 |
| --- | --- | --- | --- |
| Agents | fetchAgents/fetchRuns | createAgent/runAgent | ✅ 契约足以替换；runAgent 语义未来由真实 AI Runtime 实现（异步 + 状态回调） |
| Capabilities | fetch ×2 + compose（内存 join） | attach/setEnabled/detach/create/update/archive/restore | ✅ 写契约贴近 REST；⚠️ 内存 join 需后端提供聚合端点或接受「全量拉取+前端 join」（分页后需重新评估） |
| Projects | fetch ×2 | create/attach/detach | ✅ 契约足以替换 |

**关键结论**：
- Service 层「async + 类型化返回 + 写操作返回确认实体」的设计正确，替换真实 HTTP 客户端时 Store/组件零改动（这是本架构最大的演进红利）。
- **现在不改、未来接后端会产生高成本重构的点**：分页（runs 列表/趋势）、错误模型、DTO 层——均建议在写后端前定稿契约。

## 6. 真实后端切入点

**「继续保持 Mock 的收益还剩多少？」**
- 当前收益：零依赖演示、交互闭环已验证、6 个阶段快速迭代。
- 边际收益已明显递减：核心前端闭环（外壳 / Dashboard / Agents / Capability 资产生命周期 / Projects + 维度观察）已完备，继续堆前端模块（Settings 等）不再验证任何新架构能力。

**「什么时候停止堆前端，开始设计真实 API / Database？」**
- **现在。** 触发信号已出现：需要真实 AI 调用（runAgent 目前是随机数）、需要共享/服务端状态（localStorage 单机）、数据真实性成为验证瓶颈。
- 建议 **Phase 4 = 真实后端设计**（先 API 契约文档 + DB Schema → 再以 Next.js Route Handlers + SQLite/Prisma 替换 Mock，前端零改动验证），而非继续新增前端模块。

## 7. V1 范围冻结

### V1 已具备
- 产品外壳：AppShell / Sidebar / TopBar / Command Palette / 深色设计体系 / 响应式
- Dashboard 全闭环：指标 / 趋势 / 项目维度 / 最近活动 / Quick Actions
- Agents 全闭环：列表 / 新建 / 详情 / 运行触发 / 能力装配管理
- Capability 资产生命周期：Hub / 详情 / 创建 / 编辑 / 归档（软删除）/ 恢复 / 冻结规则
- Projects 最小闭环 + 维度观察：列表 / 新建 / 详情 / 关联 Agent / 项目统计 / 最近运行
- 统一状态层：Zustand + persist v4 + migrate + 单一窗口口径 + Mock Service 边界

### V1 还缺（真实产品必需，但不属于本轮）
- 真实后端 / 数据库 / 真实 AI Runtime
- 分页与统一错误模型
- Settings 业务化

### 明确延后（不默认开发）
- Project Archive / Restore / Edit（领域字段已预留 status）
- Capability Versioning（Definition 编辑频率低，当前无版本需求）
- Settings / Tasks / Collaboration / 权限 / 能力图谱

### 以后才值得做（数据基础已具备）
- 真实 AI Runtime（runAgent 语义化 + 异步状态）
- 能力图谱（项目 × Capability 经 Agent join 已有数据基础）
- Capability 版本管理（若编辑频率上升）

## 8. 下一阶段推荐路线

**推荐：进入 Phase 4 — 真实后端设计**（替代继续堆前端）：
1. P4-1：REST API 契约文档（对照现有 18 个 Service 签名）+ DB Schema + 分页 / 错误模型定稿
2. P4-2：轻量后端实现（Next.js Route Handlers + SQLite/Prisma）替换 Mock，前端零改动验证
3. P4-3（可选）：AI Runtime 桩（异步运行 + 轮询）

备选（若用户坚持继续前端）：Settings 业务化（用户偏好 + 工作区设置）——价值明确但优先级低于后端。

---

*审查基于当前代码事实（lib/services/*、stores/workspace.ts、lib/types.ts、app/(workspace)/*、components/*）；未做任何代码修改。*
