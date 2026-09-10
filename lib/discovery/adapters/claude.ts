/**
 * Claude Adapter（V1 MVP）
 *
 * 识别 Claude（Claude Code / Claude Desktop）Harness：
 * - 候选：HOME/.claude
 * - 扫描（白名单，跳过运行态与会话记录）：
 *   - 根下 CLAUDE.md（全局上下文指令）→ rule
 *   - plugins/marketplaces/ 下每插件目录 → 找 manifest（.json / MARKETPLACE.json）→ plugin
 * - 明确跳过：
 *   - projects/（Claude Code 项目会话记录目录，非用户资源，曾产生大量无 CLAUDE.md 噪声）
 *   - sessions / transcripts / cache / backups / telemetry / downloads / file-history（运行态）
 *   - 根下脚本文件（*.py / *.js / *.sh 为脚本，不是 Harness 资源契约）
 */
import { exists, isDirectory, lastModified, listFiles, listSubdirs, p } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

function scanClaudeRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const rootPath = root.root;

  // 根下全局上下文：CLAUDE.md → rule
  const globalRule = p(rootPath, "CLAUDE.md");
  if (exists(globalRule)) {
    out.push({
      type: "rule",
      name: "Claude 全局规则",
      description: "Claude Code 全局上下文指令（.claude/CLAUDE.md）",
      sourcePath: globalRule,
      status: "enabled",
      parseable: true,
      metadata: { harness: "Claude", scope: "global" },
      lastModified: lastModified(globalRule),
    });
  }

  // plugins/marketplaces/：插件 manifest
  const marketplacesDir = p(rootPath, "plugins", "marketplaces");
  if (isDirectory(marketplacesDir)) {
    for (const dirName of listSubdirs(marketplacesDir)) {
      const pluginDir = p(marketplacesDir, dirName);
      const manifestFiles = listFiles(pluginDir).filter((f) => f.endsWith(".json"));
      const manifest = manifestFiles.find((f) => /marketplace/i.test(f)) ?? manifestFiles[0];
      if (manifest) {
        out.push({
          type: "plugin",
          name: dirName,
          description: `Claude 插件市场（${dirName}）`,
          sourcePath: p(pluginDir, manifest),
          parseable: true,
          metadata: { pluginDir, manifest },
          lastModified: lastModified(p(pluginDir, manifest)),
        });
      } else {
        out.push({
          type: "plugin",
          name: dirName,
          description: "发现 Claude 插件目录，但未找到 manifest",
          sourcePath: pluginDir,
          parseable: false,
          parseNote: "插件目录内未找到 *.json manifest",
          metadata: { pluginDir },
          lastModified: lastModified(pluginDir),
        });
      }
    }
  }

  return out;
}

export const claudeAdapter: HarnessAdapter = {
  id: "claude",
  name: "Claude",
  framework: "Claude Code / Claude Desktop",
  probe(candidates) {
    const home = candidates.find((c) => c.label === "HOME")?.root ?? "";
    if (!home) return [];
    const root = p(home, ".claude");
    return exists(root) && isDirectory(root) ? [{ root, label: "Claude" }] : [];
  },
  scan(root) {
    return scanClaudeRoot(root);
  },
};
