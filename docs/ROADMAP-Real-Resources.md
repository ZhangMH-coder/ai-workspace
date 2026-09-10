# AI Workspace — 真实资源方向路线图（ROADMAP）

> 文档状态：**S0 已完成**（2026-09-10）
> 方向声明：AI Workspace = **本机真实 AI 资源工作台**。只展示真实存在的本地资源与真实能力分析，零演示数据、零伪造。

---

## 1. 方向与定位

本产品只做一件事：**把你电脑里真实存在的 AI 资源（Skill / Agent / Rule / Prompt / MCP / Command）摸清、分析、编成索引，并在网页上呈现**，最终帮助你"看到有什么、知道怎么用、理解能做什么、规划怎么组合"。

一切数据必须来自本机真实文件，可追溯到 `sourcePath`；不可解析的如实标记，不造假。

---

## 2. 现状问题清单（2026-09-10 实测核实）

### 2.1 虚假数据（必须清理）

| 位置 | 内容 | 问题 |
|---|---|---|
| `lib/mock-data/seed.ts` | 演示用假 Agent（客户支持助手/市场调研员等）、假 Project、假 Run、假 CapabilityDefinition | db:init / db:reset 时灌入数据库，前端展示为"真实数据" |
| 页面 `dashboard` | 假统计卡片、趋势图、最近活动（30 天 88 次运行等） | 全是 seed 造数 |
| 页面 `agents` / `agents/new` | 假 Agent 列表/详情/装配 | 全是 seed 造数 |
| 页面 `capabilities` | 假 CapabilityDefinition 资产管理 | 全是 seed 造数 |
| 页面 `projects` | 假项目 + 关联 + 统计 | 全是 seed 造数 |
| 页面 `settings` | 占位页 | 无实际内容 |
| 对应 API | `/api/v1/agents`、`/projects`、`/capability-definitions`、`/runs`、`/demo` 等 | 服务这些假数据的读写 |

### 2.2 真实数据（保留并作为主线）

| 数据 | 数量（实测） | 说明 |
|---|---|---|
| discovered_resources | 145 | 6 个 Harness 真实扫描，sourcePath 可溯源 |
| resource_capabilities | 487 | 真实能力标签，全部带 evidenceRef + sourcePath |
| task_analysis / task_plan | 3 条分析 / 2 个计划 | 真实任务分析结果 |

### 2.3 冗余文件（待清理）

| 位置 | 内容 | 处理 |
|---|---|---|
| `docs/previews/*.png`（40+ 张） | 早期演示截图（p1–p52） | 删除 |
| `docs/工程化方案与技术架构说明.md`、`docs/Capability 架构设计.md`、`docs/V1-Architecture-Review.md`、`docs/P4-1-*.md` | 早期业务方向的方案文档 | 删除（P5-1 Runtime 契约仍在使用，保留） |
| `start-real.log` / `start-mock.log` | 运行日志 | 删除 |
| `tsconfig.tsbuildinfo` | 构建缓存 | 删除 |

---

## 3. 新阶段规划（每阶段完成 → 同步更新本文档 + IMPLEMENTATION_PLAN.md → 汇报 → 等审批）

### S0 清理瘦身（✅ 已完成 2026-09-10）

- ✅ 移除 seed 假数据源；`db:init / db:reset` 不再种任何演示数据
- ✅ 清空库中已存在的假 agents / projects / runs / capability_definitions 数据（6 表实测归 0）
- ✅ 页面保留（agents/projects/capabilities/settings 骨架保留，展示空态）；假数据 API 保留但数据为空
- ✅ Dashboard 已连接真实资源概览数据（145 资源 / 128 可解析 / 6 Harness），待 S1 细化页面
- ✅ 删除冗余文件：docs/previews 截图 40+、工程化方案/Capability 架构设计/V1-Review/P4-1 旧文档、start-*.log、tsconfig.tsbuildinfo
- ✅ 验收：网页上无任何演示数据；资源线 145 资源 / 487 当前能力标签零回归；lint/tsc/build（Real+Mock）/8 页面 200 全绿

### S1 真实资源浏览器完善（✅ Hermes 适配已确认优先 2026-09-10）

- **第一优先：新增 Hermes Harness Adapter**（用户主战场，实测 135 技能 / 27 类 / 2 插件，格式 SKILL.md 可复用现有解析器；当前 6 个适配器无 Hermes，需新增发现 + 解析 + 展示）
- 资源列表：Harness 分组、类型筛选、搜索、状态（已解析/未解析）筛选
- 资源详情：真实文件路径、解析状态、能力标签、证据片段
- 验收：Hermes 135 技能 + 2 插件真实入库可浏览；全部 Harness 资源可搜索、可追溯

### S2 能力使用说明书（executionHint 升级）

- 从每个资源的真实文件内容（SKILL.md 等）提取结构化说明：这是什么、在哪个 Harness、怎么触发、使用场景、注意事项
- 不可解析/无说明的资源如实标记，不编造
- 验收：每个能力标签可展示真实来源的"用法说明"，可追溯到 evidenceRef → sourcePath

### S3 任务理解与计划（沿用已完成能力，做一致性检查）

- 保留 task-intelligence 页面（真实任务分析 + 任务计划）
- 检查与 S0/S1 的数据一致性，确保无假数据回流
- 验收：任务推荐全部来自真实能力标签

### S4 执行边界与说明书落地（候选，需后续单独审批）

- Phase 5 前置研究已输出方案（ExecutionTarget / 确认门 / 执行意图桥）
- 本阶段仅按后续审批决定是否实施

---

## 4. 纪律

- 每阶段：方案 → 审批 → 实现 → 验证 → 更新本文档与 IMPLEMENTATION_PLAN.md → 汇报 → 停
- 所有数字来自真实测试；零 Demo 数据；原始 Harness 文件只读
- 汇报统一使用"简洁 Markdown 交付汇报"格式
