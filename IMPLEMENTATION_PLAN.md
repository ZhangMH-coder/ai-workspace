# IMPLEMENTATION_PLAN.md — AI Workspace 实现迭代计划

> 项目：AI Workspace — 现代化 AI SaaS 工作台（前端 Demo）
> 技术栈：Next.js + React + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons + Framer Motion
> 维护规则：每完成一个阶段或一次重要修改，**必须先更新本文件再汇报**；未经用户审批不得擅自进入下一阶段或扩大需求范围。

---

## 版本与更新日志

| 日期 | 版本 | 阶段 | 变更摘要 | 状态 |
| --- | --- | --- | --- | --- |
| 2026-09-08 | v0.1 | Phase 0 — 分析与方案 | 环境检查、需求分析、完整方案文档、里程碑规划 | ✅ 已交付并通过 P1 审批 |
| 2026-09-08 | v0.2 | Phase 1 — 产品外壳与基础视觉体系 | 脚手架、设计 Token、App Shell、Dashboard 骨架页 + 7 模块占位页；修复命令面板 StoreContext 崩溃；lint/tsc/build/交互验证全绿 | ✅ 已完成，待审批进入 Phase 2 |

## 当前阶段

**Phase 1 / P1 — 产品外壳与基础视觉体系**（已完成；**不进入 Phase 2**，待审批）

---

## 一、环境检查记录（2026-09-08，Phase 1 实测更新）

| 检查项 | 结果 | 说明 / 影响 |
| --- | --- | --- |
| 工作目录 | `D:\AI workspace` | **路径含空格，命令与脚本需引号包裹** |
| Node.js | v22.23.2 ✅ | 满足要求 |
| npm | 10.9.8 ✅ | 默认包管理器 |
| pnpm | 11.22.0 ✅ | 备选 |
| Git | 2.54.0.windows.1 ✅ | Phase 1 已 `git init`；首次提交待收尾执行 |
| npm registry | `https://registry.npmmirror.com` | 实测 create-next-app / shadcn 拉包均可用 |
| Shell | PowerShell 5.1 | 不支持 `&&`，命令以分号或独立调用执行 |
| 实际版本组合 | next 16.3.4 / react 19.2.8 / tailwindcss ^4 / eslint-config-next 16.3.4 / framer-motion ^13.2.0 / geist ^1.7.2 / radix-ui ^1.6.7 / lucide-react ^1.42.0 / cmdk ^1.1.1 | 构建通过（见验证结果） |

## 二、已完成内容（Phase 1 / P1）

- [x] **脚手架**：`git init`；`create-next-app`（App Router / TypeScript / Tailwind v4 / ESLint / Turbopack / import alias `@/*`，无 src 目录）；`framer-motion` + `geist`（自托管字体，规避国内构建拉取 Google 字体失败）
- [x] **shadcn/ui 初始化**：新版 CLI 非交互方式 `init -y -b radix -p nova`（style: radix-nova，统一 `radix-ui` 包、`cn` 来自 "cn" 包）；安装 18 个基础组件（button/card/badge/input/label/skeleton/separator/sheet/dropdown-menu/avatar/tooltip/command/dialog/scroll-area/kbd/sonner/input-group/textarea）；`sonner.tsx` 移除 next-themes 依赖固定 dark；`lib/utils.ts` 仅导出 `cn`
- [x] **设计 Token**：`app/globals.css` 全量重写（shadcn v4 结构，`.dark` 正式用色）——背景 `#0a0a0c`、卡片 `#101014`、popover `#1b1b21`、主色 violet `#8b5cf6` / indigo `#6366f1`、ring 半透明 violet；扩展语义 token（surface-1/2/3、ink/ink-2/ink-3、brand-soft、success/warning/danger/info）；border `rgba(255,255,255,0.08)`；深色细滚动条
- [x] **App Shell 四件套**：
  - `lib/navigation.ts` 导航唯一来源（概览组 Dashboard/Projects、智能体组 Agents/Skills/Memory/Rules/Tools、底部 Settings）
  - `sidebar.tsx`：桌面 248px 展开 / 76px 折叠（Tooltip 提示）、移动端 Sheet 280px、底部 Settings + 用户菜单 + 折叠按钮
  - `topbar.tsx`：移动端菜单、工作区切换、⌘K 搜索入口、通知下拉、账户下拉
  - `command-palette.tsx`：cmdk CommandDialog，导航/工作区两组命令、底部快捷键提示、键盘操作（Esc 关闭由 Dialog 处理）
  - `page-transition.tsx`：Framer Motion 页面切换（fade + y8）
  - `(workspace)/layout.tsx`：h-svh flex 布局、全局 ⌘K/Ctrl+K 监听、TooltipProvider、Toaster（右下）
- [x] **页面**：`/` → redirect `/dashboard`；Dashboard 骨架页（PageHeader + 时间范围下拉 + 4 个 MetricCardSkeleton + ChartPlaceholder 网格背景 + ActivityPlaceholder + QuickActions，交互均 toast「后续阶段开放」）；7 个模块占位页（ModulePlaceholder 统一）
- [x] **品牌**：`app/icon.svg` 自绘渐变 Logo；删除模板 favicon 与 public 占位 SVG
- [x] **命令面板崩溃修复**（交互验证中发现并修复）：新版 shadcn（radix-nova）`CommandDialog` 不再内置 `<Command>` 包裹层，`command-palette.tsx` 原先直接放置 `CommandInput/CommandList` 导致 cmdk StoreContext 缺失、打开面板即抛 `Cannot read properties of undefined (reading 'subscribe')`；已显式包裹 `<Command>` 修复
- [x] **项目名修正**：`package.json` / `package-lock.json` 顶层 name 由 `scaffold-tmp` 改为 `ai-workspace`

## 三、验证结果（Phase 1 / P1）

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| ESLint | `npm run lint` | ✅ 0 错误 |
| TypeScript | `npx tsc --noEmit` | ✅ 0 错误 |
| 生产构建 | `npm run build` | ✅ 通过（Turbopack；12 条路由全部静态生成：`/`、`/dashboard`、`/agents`、`/skills`、`/memory`、`/rules`、`/tools`、`/projects`、`/settings`、`/_not-found`、`/icon.svg`） |
| 生产运行 | `npm run start`（localhost:3000） | ✅ 正常运行 |
| 交互验证（浏览器自动化） | 折叠侧边栏 / 打开命令面板 / 移动端视口 | ✅ 折叠后图标轨正常；命令面板打开后**控制台 0 错误**（修复前为 1 条 Uncaught TypeError）；移动端（<sm）显示汉堡菜单、单列布局 |
| 生产控制台 | 干净重载 /dashboard | ✅ 0 错误（dev 环境存在 Next.js 检器 `data-inspector-id` 注入导致的 hydration 提示，属开发期特性噪声，不影响生产） |

## 四、技术决策记录（ADR 简表，Phase 1 更新）

| 编号 | 决策 | 理由 / 状态 |
| --- | --- | --- |
| D1 | **本地工程实现**，不使用应用生成器沙箱 | 用户要求固定技术栈、自持源码、本地环境检查、逐阶段审批 |
| D2 | Next.js 16 **App Router** + RSC + 客户端交互岛屿 | 实际脚手架版本为 16.3.4（最新稳定）；路由/布局结构清晰 |
| D3 | **Zustand** 状态管理（按领域拆分 store） | 预留在 Phase 2+ 引入；**P1 未引入任何状态管理**（遵守 P1 边界） |
| D4 | 服务层抽象 + Mock 实现 | 预留在 Phase 2+；**P1 未实现 Mock 服务 / 数据层** |
| D5 | **深色优先**设计 Token（CSS 变量，`.dark` 正式用色 + `:root` 浅色预留） | 用户指定深色 AI SaaS 风格；token 体系保留扩展点 |
| D6 | 轻量自研 SVG 图表 + 轻量 DataTable，不引入重型图表库 | Phase 2+ 落地；保留 TanStack Table / Recharts 扩展点 |
| D7 | Geist Sans / Geist Mono 自托管（geist 包） | 规避 next/font/google 在国内构建拉取失败 |
| D8 | npm 为默认包管理器 | create-next-app 原生默认、稳定 |
| D9 | 演示数据集中存放 `lib/mock-data` | Phase 2+ 落地；P1 不实现 |
| D10 | shadcn style 采用 **radix-nova**（统一 `radix-ui` 包 + `cn` 包） | 新版 CLI 默认生态；**注意 CommandDialog 不含 `<Command>` 包裹层，消费方需自行包裹**（本次已踩坑并修复） |

## 五、发现的问题（Phase 1）

1. **路径含空格**：`D:\AI workspace`，所有命令需引号；README 与 CI 需注意。
2. **npm 源为镜像**：`registry.npmmirror.com`，实测可用；若个别包缺失再项目级切换。
3. **Shell 为 PowerShell 5.1**：不支持 `&&`。
4. **新版 shadcn CLI 交互变化**：`--base-color` 参数已废弃、preset 交互会卡住；最终 `init -y -b radix -p nova` 非交互成功。
5. **新版 shadcn CommandDialog 结构变更**（已修复，见「已完成内容」最后一条）——交互验证价值实证：仅靠 lint/tsc/build 无法发现此类运行时问题。
6. **浏览器自动化环境限制**（仅影响预览验证，不影响产品）：截图 WebView 固定 634×628 物理尺寸、键盘输入焦点被宿主拦截、命令面板在旧版本上会致 WebView 渲染器崩溃（修复后已消失）；已通过 CDP 设备指标覆盖实现 1440×900 桌面截图与移动端视口验证。
7. **根目录遗留 create-next-app 产物**：`AGENTS.md`（Next.js 16 代理规则，由 `next dev` 维护，删除会在下次 dev 重新生成）、`CLAUDE.md`（未处理，不影响构建）。

## 六、遗留问题 / 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 首次 Git 提交未执行 | 低 | Phase 1 收尾执行 `git add -A && git commit`（用户批准范围内） |
| dev 模式 hydration 提示（`data-inspector-id`） | 低 | Next.js 开发期元素检器注入所致；生产环境 0 错误，不处理 |
| `AGENTS.md` / `CLAUDE.md` 遗留 | 低 | 保留（对后续开发有参考价值），如用户要求可删除 |
| Phase 2+ 依赖版本组合（图表/表格库等） | 中 | 进入 Phase 2 时按里程碑逐个引入并验证 |

## 七、下一步计划

1. **等待审批**：批准进入 Phase 2（范围以审批意见为准，默认候选为：真实状态管理 + Mock 服务层 + Dashboard 业务化 / 或按用户指定顺序推进 8 模块）。
2. 执行任何 Phase 2 内容前：先出方案 → 等待审批 → 实现 → 验证 → 更新本文件 → 汇报。
3. **P1 收尾待办（可在用户批准后立即执行）**：首次 Git 提交。

## 八、待审批事项

- [ ] **A5**：批准进入 Phase 2，并确认 Phase 2 具体范围（候选：Dashboard 业务化 + 状态管理 + Mock 服务层；或按模块逐个实现——请用户明示优先级）
