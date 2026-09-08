# Capability 能力层架构设计（Phase 3）

> 状态：**设计已定稿**——第一阶段只读展示已落地；第二阶段装配关系编辑已落地（本文件第八章起）。
> 关联代码：`lib/types.ts`（契约）、`lib/services/capabilities.ts`（Service 边界）、`lib/mock-data/seed.ts`（演示资产）、`stores/workspace.ts`（单一数据源）、`components/agents/capability-list.tsx`（列表）、`components/agents/capability-picker.tsx`（装配面板）。

---

## 一、设计目标

1. **复用**：同一个能力（如「网页搜索」）可被任意多个 Agent 装配，不复制内容、不各自维护。
2. **可替换数据源**：界面层只依赖 Service 函数签名与类型契约，Mock → Real API 时只换 `lib/services/*` 实现。
3. **不硬编码**：Agent 页面不内嵌 Skills/Memory/Rules/Tools 的业务逻辑，只消费「已解析的装配视图」。
4. **演进预留**：后续独立能力库页面（Skills/Memory/Rules/Tools）管理的是「定义资产」；Agent 详情管理的是「装配关系」——两套界面共用同一数据模型。

## 二、领域关系模型

```
CapabilityDefinition (能力资产, 1)  ────────< (N) AgentCapability (装配关系) >──────── (1) Agent
  id / type / name / description              id / agentId / capabilityId / enabled       id / name / model / ...
```

- **多对多中介**：Agent 与 Definition 之间通过 `AgentCapability` 连接，装配关系携带「是否启用」等上下文，不复制 Definition 内容。
- **归属分层**：
  - **定义/资产**（全局、可复用）：`CapabilityDefinition`——能力库里有什么；
  - **装配关系**（属于某个 Agent）：`AgentCapability`——这个 Agent 用了什么、启没启用。
- **悬空引用容错**：Definition 归档/删除后，`composeCapabilityViews` 跳过无法解析的装配项，前端不因脏数据崩溃。

## 三、类型契约（lib/types.ts）

```ts
type CapabilityType = "skill" | "memory" | "rule" | "tool";

interface CapabilityDefinition {
  id: string;
  type: CapabilityType;
  name: string;
  description: string;
}

interface AgentCapability {
  id: string;
  agentId: string;      // → Agent.id
  capabilityId: string; // → CapabilityDefinition.id
  enabled: boolean;
  createdAt: string;
}
```

- `CAPABILITY_TYPE_OPTIONS` 提供类型展示元数据（label/description），未来新增类型只扩枚举与选项，不改页面。

## 四、Service 边界（lib/services/capabilities.ts）

| 函数 | 职责 | Phase 3 状态 |
| --- | --- | --- |
| `fetchCapabilityDefinitions()` | 拉取全部能力资产 | ✅ 已实现（Mock） |
| `fetchAgentCapabilities(agentId)` | 拉取某 Agent 的装配关系 | ✅ 已实现（Mock） |
| `composeCapabilityViews(definitions, assemblies)` | 纯函数：组装为按类型分组的只读视图 | ✅ 已实现 |
| `createCapabilityDefinition / attachCapability / setCapabilityEnabled …` | 资产与装配的写操作 | 预留契约，后续阶段 |

**替换路径**：未来接真实后端时，仅将本文件函数体替换为 HTTP 调用，签名与返回类型不变；store、页面、组件零改动。

## 五、页面信息架构

**当前（Phase 3）**：

```
Agent 详情页
└─ 已装配能力（只读卡片）
   └─ CapabilityList(agentId)
      ├─ 按类型分组（Skills / Memory / Rules / Tools，map 驱动）
      └─ 每项：名称 + 描述 + 启用状态（点/徽章）
```

**演进（后续阶段，不在本阶段实现）**：

```
能力库（独立页面，管理 Definition 资产）
  /skills /memory /rules /tools
  ├─ 列表 / 新建 / 编辑 / 归档
  └─ 查看「被哪些 Agent 装配」

Agent 详情页（管理装配关系）
  └─ 已装配能力（可编辑）
     ├─ 搜索资产库并装配
     ├─ 启用/停用
     └─ 解绑
```

两套页面共用同一 Service 与契约，互不重复实现。

## 六、为什么这样设计

| 关注点 | 方案 | 理由 |
| --- | --- | --- |
| 复用 | Definition 独立于 Agent | 同一资产多 Agent 装配，避免复制与漂移 |
| 替换 | Service 签名即边界 | Mock→Real API 单点替换 |
| 解耦 | 页面消费组装视图 | Agent 页不写四类能力的分支逻辑 |
| 扩展 | CapabilityType 枚举 + 选项表 | 新增类型不动页面结构 |
| 容错 | 悬空引用跳过 | 脏数据不崩溃，符合前端边界原则 |

## 七、演示数据说明

`lib/mock-data/seed.ts` 提供 16 个能力定义（Skills 4 / Memory 3 / Rules 5 / Tools 4）与各 Agent 的装配关系（含 2 条 `enabled: false` 用于展示停用状态）。数据为演示用途，接入真实 API 后整体替换。


---

## 八、Phase 3 第二阶段：装配关系编辑（方案 B）

### 8.1 目标与范围

验证 `CapabilityDefinition → AgentCapability → Agent` 三层关系可形成**真实可操作的闭环**：
搜索可用能力 → 装配 → 启用/停用 → 解绑，全部写入同一 Store 数据源，详情页实时反映。

**本阶段不做**：四类能力独立资产列表页、Definition 增删改、市场/库、Projects、Settings、真实后端。

### 8.2 三态模型（不引入多个布尔）

| 状态 | 表达方式 |
| --- | --- |
| 未装配 | 不存在 `(agentId, capabilityId)` 的 `AgentCapability` 记录 |
| 已装配启用 | 存在且 `enabled === true` |
| 已装配停用 | 存在且 `enabled === false` |

三态由「记录存在性 + 单一 `enabled` 布尔」完整表达；**禁止**用多个易冲突的布尔字段表达同一生命周期（如 `isAttached` / `isEnabled` / `isActive`）。

### 8.3 Service 写操作契约（贴近未来 Real API）

```ts
// 对应 REST 语义
attachCapability(input: { agentId; capabilityId }): Promise<AgentCapability>   // POST /agent-capabilities
setCapabilityEnabled(input: { id; enabled }): Promise<{ id; enabled }>         // PATCH /agent-capabilities/:id
detachCapability(id: string): Promise<void>                                     // DELETE /agent-capabilities/:id
```

- 全部 async + 模拟延迟 + 类型化返回 + 抛错路径（网络/校验失败）。
- Mock 实现只负责「往返 + 构造/确认实体」，**不持有状态**；数据落地唯一入口是 Store actions。
- 失败注入不设随机：演示体验稳定优先；失败路径由组件 `try/catch` 完备处理（toast + 状态不落地），真实 API 场景直接可用。

### 8.4 Store 演进（保持单一数据源）

- 新增 `capabilityDefinitions: CapabilityDefinition[]`（资产，hydrate 回填，本阶段只读不持久化）
- 新增 `agentCapabilities: AgentCapability[]`（装配，**持久化**；persist version 1 → 2，migrate 对旧数据回填 seed 装配）
- 新增 actions（全部 async，内部走 Service，成功后 `set` 更新本地）：
  - `attachCapability(agentId, capabilityId)` —— 幂等（已存在直接返回）
  - `setCapabilityEnabled(id, enabled)` —— 目标不存在则抛错
  - `detachCapability(id)` —— 幂等删除
- `resetDemoData()` 一并重置 definitions + agentCapabilities 回 seed
- 派生：组件经 `composeCapabilityViews(definitions, agentCapabilities)` 组装视图（纯函数），任何消费方（详情页 / 未来 Dashboard 展示）同源。

### 8.5 页面信息架构与交互规范

**Agent 详情页 — 已装配能力（可编辑）**
- 头部：标题 + Badge「可管理 · Phase 3」+ 「+ 装配能力」按钮
- 分组列表（沿用第一阶段 map 驱动分组）：
  - 已装配启用：品牌色状态点；hover 出现「停用」按钮
  - 已装配停用：中性状态点 + 「已停用」Badge；「启用」按钮
  - 解绑：`Trash2` 图标按钮 → Dialog 二次确认（破坏性操作，说明可重新装配）→ 移除
- 空状态：「尚未装配能力」+ 「装配能力」按钮（不再是"后续开放"文案）
- 写操作中：目标按钮 spinner + disabled；成功/失败 toast

**装配面板 `CapabilityPicker`（Dialog）**
- 打开：详情页「+ 装配能力」（或空状态按钮）；打开即聚焦搜索框
- 搜索：按名称/描述本地过滤（不额外建索引，16 条资产规模足够）
- 列表按类型分组（skill → memory → rule → tool），三类状态各自呈现：
  - 未装配 → 「装配」按钮
  - 已装配启用 → 「已启用」Badge + 装配按钮禁用（不可重复装配）
  - 已装配停用 → 「已停用」Badge + 「启用」按钮（直接恢复）
- 空搜索：「未找到匹配的能力」空态
- 全部操作实时写 Store → 面板与列表同步刷新（无需关闭面板）

### 8.6 一致性保证

装配状态只经 Store actions 变更；列表、面板、未来任何消费方都从同一 Store 读取。Dashboard 无能力展示字段，无需改动即天然一致（验证时回归确认）。

### 8.7 验证清单

1. lint / tsc / build 全绿
2. 生产交互：装配（搜索 → 装配 → 列表出现启用项）→ 停用 → 重新启用 → 解绑（Dialog 确认）→ 面板三态区分
3. 硬刷新后装配状态保留（持久化 v2）
4. 重置演示数据恢复 seed 装配（34 条）
5. 详情页列表与面板实时一致；控制台 0 error


---

## 九、Phase 3 第三阶段：Capability Asset Hub（方案 A 重定义）

### 9.1 目标

把 `CapabilityDefinition` 资产层真正呈现，让用户理解「系统有哪些能力资产、类型、状态、被哪些 Agent 使用」，并进一步验证 Definition 作为独立资产的复用价值。

### 9.2 统一信息架构（四类共用，不复制页面）

```
Capabilities
├─ All            /capabilities
├─ Skills         /capabilities?type=skill
├─ Memory         /capabilities?type=memory
├─ Rules          /capabilities?type=rule
└─ Tools          /capabilities?type=tool
```

- 单一路由 `/capabilities`（列表）+ `/capabilities/[id]`（详情）；筛选由 URL query 驱动（可分享、可刷新）
- 旧占位路由 `/skills|/memory|/rules|/tools` 301 重定向到对应筛选 URL
- 侧栏四项合并为一项 **Capabilities**（`lib/navigation.ts` 唯一来源，命令面板/顶栏自动同步）

### 9.3 资产列表与详情

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| 名称 / 描述 | `CapabilityDefinition` | 直接展示 |
| 类型 | `CapabilityDefinition.type` | 共享徽章组件（图标 + 标签） |
| 状态 | **派生**（装配数 > 0 = 使用中，否则未使用） | 不加冗余模型字段，实时计算 |
| 被装配数 | `AgentCapability` 计数 | N 个 Agent |

详情页 = 基本信息（类型/状态/描述/标识/装配数）+ **Used by**（装配该资产的 Agent 列表：装配时间、Agent 状态、装配「已启用/已停用」，点击跳 Agent 详情）+ 装配概览（总使用/已启用/已停用）。

### 9.4 共享收敛

- `lib/capability-meta.ts`：`CAPABILITY_TYPE_ICONS` 唯一来源（Agent 装配列表 / 装配面板 / Hub 共用）
- `components/capabilities/capability-type-badge.tsx`：类型徽章共享组件

### 9.5 一致性

Hub / 资产详情 / Agent 详情装配管理读同一 Store（definitions + agentCapabilities + agents）。实测：Agent 详情停用能力后，Hub 详情页装配概览立即从 2/1 变为「已停用」项（零额外同步）。


---

## 十、Phase 3 第四阶段：Definition 资产生命周期管理（方案 A）

### 10.1 领域规则（先于编码定稿）

| 规则 | 内容 | 实现 |
| --- | --- | --- |
| R1 | 生命周期状态 Active/Archived **落模型**；使用状态 Used/Unused **派生**（装配数 > 0），两者正交互不推导 | `CapabilityDefinition.lifecycle`；`usedByCount` 实时计算 |
| R2 | 归档 = **软删除**：Definition 保留（仅 lifecycle 变更），不物理删除、不自动解绑 AgentCapability | archive 只 PATCH lifecycle |
| R3 | 已归档装配不悬空：Definition 仍在资产库，Agent 详情 / Used by 可识别并展示「已归档」 | composeCapabilityViews 仅跳过完全悬空的引用 |
| R4 | 归档后不可被新 Agent 装配；已有装配**保留展示并冻结管理**（禁启停/解绑） | Picker UI 禁用 + Store attach 校验（双保险）；列表冻结 |
| R5 | 恢复后重新可装配、装配关系恢复可管理 | restore PATCH lifecycle=active |
| R6 | 创建/编辑/归档/恢复全部经 Service 层，页面不直接修改领域数据 | store actions 唯一落地入口 |
| R7 | 保持三层模型（Definition / AgentCapability / Agent），禁止扁平化 | 无字段复制，装配仅引用 capabilityId |

### 10.2 Service 写契约（对应 REST）

| 操作 | 契约 | REST |
| --- | --- | --- |
| 创建 | `createCapability({type,name,description}) → CapabilityDefinition`（lifecycle=active） | POST /capability-definitions |
| 编辑 | `updateCapability({id,type,name,description}) → CapabilityDefinition`（仅元信息） | PATCH /capability-definitions/:id |
| 归档 | `archiveCapability(id) → {id, lifecycle:"archived"}` | PATCH lifecycle=archived |
| 恢复 | `restoreCapability(id) → {id, lifecycle:"active"}` | PATCH lifecycle=active |

### 10.3 Store 演进（persist v2 → v3）

- `partialize` 增加 `capabilityDefinitions`（由「seed 回填只读」升级为「可写持久化」，创建/编辑/归档刷新不丢）
- `migrate`：v1/v2 → v3 自动补 seed 定义副本（v1 同时补装配）；v3 数据原样保留
- 写 actions 幂等处理（重复归档/恢复直接返回）；目标不存在抛错（Error 态）

### 10.4 两维状态与 UI 映射

| 资产 | 生命周期（模型） | 使用状态（派生） | UI |
| --- | --- | --- | --- |
| 网页搜索 | active | used | Active 徽章 + 使用中 + N Agent |
| RSS 订阅汇总 | archived | used | Archived 徽章 + 使用中 + 已归档标记 + 冻结 |
| 遗留 HTTP 回调 | archived | unused | Archived 徽章 + 未使用 + 空态引导 |

### 10.5 验证口径

干净环境 18 资产（16 active + 2 archived）· 49 装配；创建/编辑/归档/恢复闭环；硬刷新持久化；migrate v2 注入实测；四处（Hub / Asset Detail / Agent Detail / Picker）同源一致；lint/tsc/build 全绿。
