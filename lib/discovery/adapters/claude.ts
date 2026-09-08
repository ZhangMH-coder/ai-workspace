/**
 * Claude Adapter（V1 MVP）
 *
 * 识别 Claude（Claude Code / Claude Desktop）Harness：
 * - 候选：HOME/.claude
 * - 扫描（白名单子目录，跳过运行态）：
 *   - projects/ 下每项目目录 → 找 CLAUDE.md（项目上下文指令）→ rule
 *     目录存在但无 CLAUDE.md → parseable=false（保留路径）
 *   - plugins/marketplaces/ 下每插件目录 → 找 manifest（.json / MARKETPLACE.json）→ plugin
 *   - 根下脚本文件（*.py / *.js / *.sh）→ other（检测到但暂无法解析为资源契约）
 * - 跳过：sessions / transcripts / cache / backups / telemetry / downloads / file-history
 */
import { exists, isDirectory, lastModified, listFiles, listSubdirs, p } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

/** C--Users-Administrator → C:\Users\Administrator（Claude 项目目录名编码） */
function decodeProjectName(dirName: string): string {
  try {
    return dirName.replace(/^C--/, "C:\\").replace(/-+/g, "\\");
  } catch {
    return dirName;
  }
}

function scanClaudeRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const rootPath = root.root;

  // projects/：项目级上下文（CLAUDE.md）
  const projectsDir = p(rootPath, "projects");
  if (isDirectory(projectsDir)) {
    for (const dirName of listSubdirs(projectsDir)) {
      const projectDir = p(projectsDir, dirName);
      const claudeMd = p(projectDir, "CLAUDE.md");
      const decoded = decodeProjectName(dirName);
      if (exists(claudeMd)) {
        out.push({
          type: "rule",
          name: decoded,
          description: `Claude 项目上下文（${decoded}）`,
          sourcePath: claudeMd,
          status: "enabled",
          parseable: true,
          metadata: { projectDir, decoded },
          lastModified: lastModified(claudeMd),
        });
      } else {
        out.push({
          type: "rule",
          name: decoded,
          description: "发现 Claude 项目目录，但未找到 CLAUDE.md",
          sourcePath: projectDir,
          parseable: false,
          parseNote: "项目目录内未找到 CLAUDE.md",
          metadata: { projectDir, decoded },
          lastModified: lastModified(projectDir),
        });
      }
    }
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

  // 根下脚本文件 → other（检测到但暂无法解析）
  for (const f of listFiles(rootPath)) {
    if (/\.(py|js|ts|sh|ps1)$/i.test(f)) {
      out.push({
        type: "other",
        name: f,
        description: "Harness 根目录下的脚本文件（未定义资源契约）",
        sourcePath: p(rootPath, f),
        parseable: false,
        parseNote: "脚本文件无统一资源契约，仅保留位置",
        metadata: { rootLabel: root.label },
        lastModified: lastModified(p(rootPath, f)),
      });
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
