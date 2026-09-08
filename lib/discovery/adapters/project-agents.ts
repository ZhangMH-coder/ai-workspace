/**
 * Project-Agents Adapter（V1 MVP）
 *
 * 识别项目级 AI Agent 指令文件：
 * - 候选：CWD（当前项目根，Next.js 运行时 cwd = 项目根）
 * - 扫描：
 *   - AGENTS.md / CLAUDE.md（根下）→ rule
 *   - .claude/ 项目级目录（如存在）→ 同 Claude 逻辑简化版（找 CLAUDE.md）
 * - 目录存在但无指令文件 → 如实返回 0 资源
 */
import { exists, isDirectory, lastModified, p, readHead } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

function scanProjectRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const rootPath = root.root;

  for (const f of ["AGENTS.md", "CLAUDE.md"]) {
    const fp = p(rootPath, f);
    if (!exists(fp)) continue;
    const head = readHead(fp, 2048) ?? "";
    const firstLine = head.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim() ?? "";
    out.push({
      type: "rule",
      name: f,
      description: firstLine ? `项目级指令：${firstLine.slice(0, 60)}` : "项目级指令文件",
      sourcePath: fp,
      status: "enabled",
      parseable: true,
      metadata: { rootLabel: root.label, firstLine },
      lastModified: lastModified(fp),
    });
  }

  // 项目内 .claude/ 目录（简化：只找 CLAUDE.md）
  const projectClaude = p(rootPath, ".claude");
  if (isDirectory(projectClaude)) {
    const fp = p(projectClaude, "CLAUDE.md");
    if (exists(fp)) {
      out.push({
        type: "rule",
        name: ".claude/CLAUDE.md",
        description: "项目级 Claude 指令",
        sourcePath: fp,
        status: "enabled",
        parseable: true,
        metadata: { rootLabel: root.label },
        lastModified: lastModified(fp),
      });
    }
  }

  return out;
}

export const projectAgentsAdapter: HarnessAdapter = {
  id: "project-agents",
  name: "Project Agents",
  framework: "项目级 Agent 指令（AGENTS.md / CLAUDE.md）",
  probe(candidates) {
    const cwd = candidates.find((c) => c.label === "CWD")?.root ?? "";
    if (!cwd || !isDirectory(cwd)) return [];
    return [{ root: cwd, label: "CWD" }];
  },
  scan(root) {
    return scanProjectRoot(root);
  },
};
