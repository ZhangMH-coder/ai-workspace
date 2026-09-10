# AI Workspace

**本机 AI Harness 资源展示平台** —— 真实发现、索引并展示你电脑上已安装的 AI 工具链资源（Hermes / Doubao / Cursor / Claude / Codex 等）的技能、人设、规则与插件。

> **方向说明**：本项目早期按「AI SaaS 工作台」构建（Agents / Projects / Capabilities / Runs），后经 S0 清理，**删除全部演示假数据与冗余产物**，转型为「真实本地 AI 资源工作台」：所有展示内容均来自本机只读扫描的真实文件，零 Demo 数据、零伪造资源。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| **Resource Discovery** | 扫描本机 AI Harness（Hermes / Doubao / Cursor / Claude / Codex 等）真实目录，发现 SKILL.md、SOUL.md 人设、config 配置、插件等资源，统一索引（name / type / sourcePath / usage / parseable），**全程只读** |
| **Resource Intelligence** | 对真实资源做能力归纳，生成可追溯的 ResourceCapability（每条能力带 evidenceRef + evidenceSnippet，可回溯到真实文件） |
| **Task Intelligence** | 中文任务 → 拆解 → 能力需求 → 从真实能力标签检索候选资源 → 推荐（含推荐理由） |
| **Capability Planning** | 将推荐资源组织为可验证的任务计划（步骤 / 依赖 / 备选 / 确定性校验） |
| **酷炫展示首页** | Dashboard 呈现真实资源统计、Hermes 运行配置（默认模型 / Provider / 可用模型）、人设、精选技能画廊 |

## 页面结构

| 路由 | 内容 |
| --- | --- |
| `/dashboard` | 展示首页：真实资源统计 + 类型分类 + Hermes 配置与人设 + 精选技能 |
| `/resources` | 资源列表（搜索 / 类型 / Harness 筛选，每行带一行「如何使用」） |
| `/resources/[id]` | 资源详情（含「如何使用」卡片，可追溯到 sourcePath 真实文件） |
| `/resources/capabilities` | 资源能力索引（全部可追溯 ResourceCapability） |
| `/task-intelligence` | 任务分析：输入任务 → 拆解 → 能力检索 → 推荐 → 计划 |
| `/agents` `/projects` `/settings` | 早期业务模块骨架（S0 已清空数据，仅保留页面，暂不扩展） |

## 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 22 | 开发与 CI 实测 22.23 |
| npm | ≥ 10 | 默认包管理器 |
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

首次进入 `/resources` 页为「尚未扫描」空态，点击「扫描本机资源」按钮即触发扫描——扫描的是**运行者自己电脑**上的真实 Harness 目录。无远程服务器、数据只存本地库。

## SQLite 初始化（migration / seed / reset）

数据文件：`data/ai-workspace.db`（目录不存在会自动创建；可用环境变量 `DATABASE_URL` 覆盖路径）。

环境变量（全部可选）：参见 `.env.example`（`DATABASE_URL` 数据路径、`NEXT_PUBLIC_USE_MOCK` 模式开关）。

| 命令 | 职责 | 何时使用 |
| --- | --- | --- |
| `npm run db:init` | 从零初始化：应用 migration（幂等）+ 建表 | 新环境第一次启动 / 容器启动入口 |
| `npm run db:migrate` | 仅应用 `drizzle/` 下的版本化 migration | schema 有变更时（先 `db:generate`） |
| `npm run db:seed` / `npm run db:reset` | **清空业务表**（项目不再灌演示数据） | 数据重置 |
| `npm run db:generate` | 依据 `db/schema.ts` 生成 migration | schema 变更唯一通道（禁止手改） |
| `npm run db:check` | 校验 migration 已应用且 schema 与迁移一致 | 提交前 / CI |

> 扫描结果（`discovered_resources` 等真实资源表）**不属于**业务表，`db:reset` 不清空；如需重扫直接点页面「重新扫描」。

## Real / Mock 双模式

- **Real（默认）**：SQLite 为事实数据源，资源扫描结果真实落库，刷新从数据库恢复。
- **Mock**：编译期开关，前端走内存空态（**不伪造扫描结果**），作为回滚通道：

```powershell
# PowerShell
$env:NEXT_PUBLIC_USE_MOCK='1'
npm run build
npm run start
```

> Mock 为编译期环境变量，切换模式必须重新 `build`。Mock 模式下资源页为真实空态（「尚未扫描」），不允许伪造数据。

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

- **数据库持久化**：宿主 `./data` 目录绑定挂载至容器 `/app/data`（`DATABASE_URL=/app/data/ai-workspace.db`），容器重建 / 重启后数据保留。
- **启动流程**：容器 `CMD` = `npm run db:init && npm run start`。
- **数据文件位置**：宿主 `./data/ai-workspace.db` ↔ 容器 `/app/data/ai-workspace.db`。
- **Mock 模式容器**：`docker-compose.yml` 中设 `NEXT_PUBLIC_USE_MOCK=1` 后 `docker compose build`。

## 数据文件位置

| 项 | 路径 |
| --- | --- |
| SQLite 数据库 | `data/ai-workspace.db`（+ `-wal` / `-shm`；已被 .gitignore 排除，不进 Git） |
| Migration 版本化 SQL | `drizzle/` |
| Schema 定义 | `db/schema.ts` |
| 资源发现 Adapter | `lib/discovery/adapters/`（hermes / doubao / cursor / claude / codex 等） |
| 能力 / 任务 / 计划 | `lib/resource-intelligence/`、`lib/task-intelligence/`、`lib/task-planning/` |
| 展示首页组件 | `components/dashboard/showcase/` |
| 迭代计划 | `IMPLEMENTATION_PLAN.md` |

## 架构简述

```
UI 组件（React 19 + Tailwind + shadcn/ui + Framer Motion，深色设计体系）
  ↓
Store / 页面数据层（Zustand；资源线数据走 lib/services/resource-discovery）
  ↓
API Client（lib/api/*：DTO/Domain 分离、统一 ApiError）
  ↓
Route Handler（app/api/v1/*）
  ↓
Service / Repository（db/service.ts、db/repository.ts）
  ↓
SQLite（better-sqlite3 + Drizzle；WAL + foreign_keys=ON）
```

**真实资源线（数据流）**：本机文件系统 → 各 Harness Adapter 只读扫描 → `discovered_resources` 索引 → HeuristicAnalyzer 能力归纳 → `resource_capability`（可追溯 evidenceRef）→ 任务拆解与能力检索 → 推荐计划。全程原始 Harness 文件零修改。

**扫描语义**：`by sourcePath upsert` + 扫描后孤儿清理（adapter 排除的路径 / 已消失的源自动移除索引），重复扫描不产生重复资源。

## CI 质量门禁

`.github/workflows/ci.yml`（GitHub Actions，push / PR 触发）：

1. `npm ci`（干净依赖）
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run db:init` + `npm run db:check`（`DATABASE_URL` 指向 CI 独立路径 `./data/ci.db`）
5. `npm run build`

本地等价命令：`npm run ci`。

## 当前真实数据基线（2026-09 实测）

- 扫描结果：**270 个资源 / 267 个可解析**（其中 Hermes 140：135 技能 + 2 插件 + 2 人设 + 1 主配置）
- 已识别 Harness：Hermes（主力）、Doubao（105 技能）、Cursor、Codex、Claude（已收敛会话记录噪声）、其它少量残留
- 资源类型：skill 258 / plugin 4 / prompt 2 / rule 6 / other 1（未解析条目均如实标记 parseable=false 并保留真实路径）

## 明确未实现（有意延后）

- 真实 LLM 接入（OpenAI / DeepSeek / Anthropic 等 Provider Adapter）
- Skill / Agent 执行、MCP 调用、Streaming
- Harness 文件修改 / 部署（当前严格只读）
- Capability 版本管理、Marketplace
- Agents / Projects / Settings 业务化（骨架保留）
- Authentication / Multi-user / Permissions
