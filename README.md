# AI Workspace

现代化 AI SaaS 工作台 —— 深色高级视觉风格的 Agent / Capability / Project 管理产品。

> **V1 Final（Frozen）**（P5-2 封版）：功能已冻结，从干净环境可重复部署、重复验证、重复启动。后续仅做文档修正与已知问题修复，不新增业务功能。

## 功能边界

### 已实现（V1 能力）

| 模块 | 能力 |
| --- | --- |
| **Dashboard** | 指标卡（活跃 Agent / 运行量 / 成功率 / Tokens，含环比）、30 天运行趋势图（柱+线，键盘可读）、最近活动、项目维度摘要（可点入详情）、时间范围切换（今天 / 7 天 / 30 天） |
| **Agents** | 列表（状态 / 模型 / 所属项目 / 运行统计）、创建、详情（运行历史 / 配置 / 已装配能力管理） |
| **Capabilities** | 资产中心（All / Skills / Memory / Rules / Tools 统一模型与筛选）、资产详情（Used by / 装配概览）、资产生命周期（创建 / 编辑 / 归档 / 恢复，软删除语义） |
| **Projects** | 项目列表 + 创建、项目详情（摘要 / 关联 Agent / 最近运行）、Agent Picker 关联 / 解绑（确认 Dialog） |
| **Runs** | 运行记录与统计：SQLite 服务端聚合（`/api/v1/runs/stats?from&to`），Dashboard / Project / Agent 同源同口径 |
| **AI Runtime（P5-2 最小实施）** | `runAgent` 经 `Service → Runtime 编排 → CapabilityLoader → MockProvider → Run 持久化`；Run 五态状态机（queued / running / succeeded / failed / cancelled，终态不可逆、并发 409）；Capability 按 enabled+active 装配实时构建执行上下文；失败结构化落库（error_code / error_message / token usage / model / provider）；Streaming / Tool / Memory 仅保留契约未实现 |
| **数据层** | SQLite（better-sqlite3 + Drizzle）为事实数据源；Zustand 客户端状态仅缓存统计与明细；localStorage 仅保存 UI 偏好（timeRange） |
| **Mock / Real 双模式** | 编译期开关 `NEXT_PUBLIC_USE_MOCK=1` 切换为内存演示模式（可回滚，数字与 Real 一致） |

### 明确未实现（有意延后，非遗漏）

Authentication / Multi-user / Permissions / 真实 LLM Provider（P5-2 已实现 MockProvider 最小 Runtime，未接 OpenAI / DeepSeek / Anthropic 等真实 Adapter）/ Streaming·SSE / Tool Calling / Memory Retrieval / Capability Versioning / Marketplace / Project Tasks / 协作成员 / 文件管理 / Kanban / 评论 / Settings 业务化 / 云数据库部署。

## 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 22（开发与 CI 实测 22.23） | 含 `node:` 内置模块与原生模块兼容 |
| npm | ≥ 10 | 默认包管理器（registry 建议 npmmirror：`npm config set registry https://registry.npmmirror.com`） |
| Docker（可选） | ≥ 24 + Compose v2 | 仅 Docker 部署需要 |
| 操作系统 | Windows / macOS / Linux | 路径含空格时命令需引号包裹 |

## 安装

```bash
git clone <repo-url> ai-workspace
cd ai-workspace
npm install
```

## 开发启动

```bash
npm run dev
# 打开 http://localhost:3000
```

开发模式（Real）会自动读取 `data/ai-workspace.db`；若尚未初始化数据库，见下方「SQLite 初始化」。

## SQLite 初始化（migration / seed / reset）

数据文件：`data/ai-workspace.db`（目录不存在会自动创建；可用环境变量 `DATABASE_URL` 覆盖路径）。

环境变量（全部可选）：参见仓库根目录 `.env.example`（`DATABASE_URL` 数据路径、`NEXT_PUBLIC_USE_MOCK` 模式开关）。

| 命令 | 职责 | 何时使用 |
| --- | --- | --- |
| `npm run db:init` | **从零初始化**：应用 migration（幂等）+ 空库时 seed | 新环境第一次启动 / 容器启动入口 |
| `npm run db:migrate` | 仅应用 `drizzle/` 下的版本化 migration | schema 有变更时（先 `db:generate`） |
| `npm run db:seed` / `npm run db:reset` | 清空业务表并重灌演示数据（保留 migration 历史） | 演示数据重置 |
| `npm run db:generate` | 依据 `db/schema.ts` 生成 migration | schema 变更唯一通道（禁止手改） |
| `npm run db:check` | 校验 migration 已应用且 schema 与迁移一致 | 提交前 / CI |

> **防漂移规则**：Schema 变更只走 `db:generate` → `db:migrate`；seed 幂等 upsert 不物理删用户数据（`db:reset` 例外）；`db:check` 纳入 CI 质量门禁。

## Real / Mock 双模式

- **Real（默认）**：SQLite 为事实数据源，写操作真实落库，刷新从数据库恢复。
- **Mock**：编译期开关，内存演示数据（与 Real 数字同源一致，作为回滚通道）：

```powershell
# PowerShell
$env:NEXT_PUBLIC_USE_MOCK='1'
npm run build
npm run start
```

> Mock 为编译期环境变量，切换模式必须重新 `build`（注意 `.next` 缓存）。
>
> **边界说明**：Mock 模式仅切换**前端**数据流（页面 / Store 走内存演示数据，数字与 Real 同源一致）；服务端 API 端点（`/api/v1/*`）始终连接 SQLite。因此浏览器页面数字为 Mock 数据，直接请求 API 得到的是 Real 数据——两者并存是设计意图（Mock 作为前端回滚通道）。

## 构建

```bash
npm run build          # 生产构建（Real 模式）
npm run lint           # ESLint（0 error / 0 warning 为标准）
npx tsc --noEmit       # TypeScript 类型检查
npm run ci             # 本地等价质量门禁：lint + tsc + build
```

## 生产启动

```bash
npm run build
npm run start          # http://localhost:3000
```

首次部署请先执行 `npm run db:init`（或由容器入口自动执行）。

## Docker 启动

```bash
docker compose up -d --build
# 打开 http://localhost:3000
docker compose ps      # healthcheck 状态
docker compose logs -f ai-workspace
```

**容器说明（P4-4 契约）**：

- **数据库持久化**：宿主 `./data` 目录绑定挂载至容器 `/app/data`（`DATABASE_URL=/app/data/ai-workspace.db`）。**数据库不会写入临时容器层**——容器重建 / 重启后数据正常保留；删除卷映射（`./data`）才会丢数据。
- **启动流程**：容器 `CMD` = `npm run db:init && npm run start`——首次启动自动 migration + 空库 seed；后续启动 migration 幂等、数据存在时跳过 seed（不覆盖用户数据）。
- **数据文件位置**：宿主 `./data/ai-workspace.db` ↔ 容器 `/app/data/ai-workspace.db`（+ WAL 附属文件）。
- **镜像构建**：多阶段（deps → build → runner），生产镜像仅含 `--omit=dev` 依赖（tsx 保留供 db 运维脚本）；better-sqlite3 优先 prebuilt，缺失时镜像内 g++ 编译兜底。
- **Mock 模式容器**：`docker-compose.yml` 中设 `NEXT_PUBLIC_USE_MOCK=1` 后 `docker compose build`（编译期变量）。

## 数据文件位置汇总

| 项 | 路径 |
| --- | --- |
| SQLite 数据库 | `data/ai-workspace.db`（+ `-wal` / `-shm`） |
| Migration 版本化 SQL | `drizzle/` |
| Schema 定义 | `db/schema.ts` |
| Seed 数据 | `db/seed.ts`（Real）/ `lib/mock-data/seed.ts`（Mock，天级时间锚） |
| Runtime 契约与实现 | `lib/runtime/`（contracts / capability-loader / mock-provider / runtime） |
| 设计文档 | `docs/P4-1-Backend-Architecture-API-Design.md`、`docs/V1-Architecture-Review.md`、`docs/P5-1-AI-Runtime-Architecture-Contract.md` |
| 迭代计划 | `IMPLEMENTATION_PLAN.md` |

## 架构简述

```
UI 组件
  ↓  React 19 + shadcn/ui + Framer Motion（深色设计体系）
Zustand Store（客户端状态：hydrate 缓存统计与明细；persist 仅 timeRange）
  ↓
Service 层（lib/services/*：双模式入口 Mock/HTTP 同名函数契约）
  ↓
API Client（lib/api/*：DTO/Domain 分离、统一 ApiError 7 码、Page 分页契约）
  ↓
Route Handler（app/api/v1/*：zod 校验、Service 业务规则、统一错误映射）
  ↓
Service / Repository（db/service.ts、db/repository.ts：领域规则 + SQL 聚合）
  ↓
AI Runtime（lib/runtime/*：Runtime 编排 → CapabilityLoader → Provider 注册表 → Run 状态机；P5-2 唯一 Provider 为 MockProvider）
  ↓
SQLite（better-sqlite3 + Drizzle；WAL + foreign_keys=ON；Repository 直接聚合统计）
```

**领域模型**：`Workspace → Project → ProjectAgent → Agent → AgentCapability / CapabilityDefinition → AgentRun`。Project 只引用 Agent 不复制数据；项目级统计全部经 `ProjectAgent → Agent → Run` 派生；Capability 经 Agent 间接关联 Project。

**时间窗口口径（全局唯一实现）**：`windowBoundsForRange(days)` = 「含今天 N 个自然日」= `[今天 0 点 −(N−1) 天, 明天 0 点)`；Dashboard / Project / Agent 统计一律通过 `/api/v1/runs/stats?from&to`（显式边界）服务端聚合，前端无第二套日期计算。

## CI 质量门禁

`.github/workflows/ci.yml`（GitHub Actions，push / PR 触发）：

1. `npm ci`（干净依赖，不依赖本地 node_modules）
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run db:init` + `npm run db:check`（`DATABASE_URL` 指向 CI 独立路径 `./data/ci.db`，**不依赖本地已有数据库状态**）
5. `npm run build`

本地等价命令：`npm run ci`（lint + tsc + build）。

## 已知边界与说明

- `runAgent` 已迁移至 AI Runtime 最小实施（P5-2）：经 `Runtime 编排 → MockProvider（86% 成功演示语义）→ Run 持久化`；接真实 LLM 仅需新增 Provider Adapter（注册于 `lib/runtime/runtime.ts` 的 ProviderRegistry），Service / Store / UI 零改动。
- 统计 `daily` 数组按 started_at 的 UTC 日期聚合（totals 与 daily 求和严格一致）；显式 from/to 为事实输入。
- 30 天窗口数字（如运行量 88）为 seed 天级时间锚下的稳定正确值；同日内 `db:reset` 完全可复现，跨日整体平移不改变窗口内集合。
- 截图工具链 / 自动化会话中的 Radix 下拉菜单点击等属工具层限制，不影响产品交互（见 IMPLEMENTATION_PLAN.md）。
