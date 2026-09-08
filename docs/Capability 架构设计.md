# Capability 能力层架构设计（Phase 3 第一阶段）

> 状态：**设计已定稿，只读展示已落地**；独立 CRUD 页面为后续阶段，不在本文档范围内实现。
> 关联代码：`lib/types.ts`（契约）、`lib/services/capabilities.ts`（Service 边界）、`lib/mock-data/seed.ts`（演示资产）、`components/agents/capability-list.tsx`（只读视图）。

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
