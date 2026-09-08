/**
 * Cursor Adapter（V1 MVP）
 *
 * 识别 Cursor IDE 的 AI Harness：
 * - 候选：HOME/.cursor
 * - 扫描（白名单子目录，跳过运行态）：
 *   - skills-cursor/ 下每 skill 目录 → 找 SKILL.md → skill
 *   - agents/ 下每 agent 目录 → 找 AGENTS.md / *.md → agent
 *   - plugins/ 下每插件目录 → 找 *.json manifest → plugin
 * - 目录存在但无对应指令文件 → parseable=false（保留路径）
 * - 跳过：extensions / debug-logs / ai-tracking / projects（运行态或工程历史）
 */
import { exists, isDirectory, lastModified, listFiles, listSubdirs, p } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

function scanDirAsResources(
  parentDir: string,
  type: DiscoveredRaw["type"],
  expectedFiles: string[],
  label: string,
  rootLabel: string
): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  if (!isDirectory(parentDir)) return out;
  for (const dirName of listSubdirs(parentDir)) {
    const dir = p(parentDir, dirName);
    const found = expectedFiles.find((f) => exists(p(dir, f)));
    if (found) {
      const fp = p(dir, found);
      out.push({
        type,
        name: dirName,
        description: `Cursor ${label}（${dirName}）`,
        sourcePath: fp,
        status: "enabled",
        parseable: true,
        metadata: { rootLabel, directory: dirName, file: found },
        lastModified: lastModified(fp),
      });
    } else {
      out.push({
        type,
        name: dirName,
        description: `发现 Cursor ${label} 目录，但未找到 ${expectedFiles.join(" / ")}`,
        sourcePath: dir,
        parseable: false,
        parseNote: `未找到 ${expectedFiles.join(" / ")}`,
        metadata: { rootLabel, directory: dirName },
        lastModified: lastModified(dir),
      });
    }
  }
  return out;
}

function scanCursorRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const rootPath = root.root;
  const out: DiscoveredRaw[] = [];
  out.push(...scanDirAsResources(p(rootPath, "skills-cursor"), "skill", ["SKILL.md"], "Skill", root.label));
  out.push(...scanDirAsResources(p(rootPath, "agents"), "agent", ["AGENTS.md", "agent.md", "AGENT.md"], "Agent", root.label));

  // plugins/：manifest json
  const pluginsDir = p(rootPath, "plugins");
  if (isDirectory(pluginsDir)) {
    for (const dirName of listSubdirs(pluginsDir)) {
      const dir = p(pluginsDir, dirName);
      const manifest = listFiles(dir).find((f) => f.endsWith(".json"));
      if (manifest) {
        out.push({
          type: "plugin",
          name: dirName,
          description: `Cursor 插件（${dirName}）`,
          sourcePath: p(dir, manifest),
          parseable: true,
          metadata: { rootLabel: root.label, directory: dirName, manifest },
          lastModified: lastModified(p(dir, manifest)),
        });
      } else {
        out.push({
          type: "plugin",
          name: dirName,
          description: "发现 Cursor 插件目录，但未找到 manifest",
          sourcePath: dir,
          parseable: false,
          parseNote: "插件目录内未找到 *.json manifest",
          metadata: { rootLabel: root.label, directory: dirName },
          lastModified: lastModified(dir),
        });
      }
    }
  }
  return out;
}

export const cursorAdapter: HarnessAdapter = {
  id: "cursor",
  name: "Cursor",
  framework: "Cursor IDE",
  probe(candidates) {
    const home = candidates.find((c) => c.label === "HOME")?.root ?? "";
    if (!home) return [];
    const root = p(home, ".cursor");
    return exists(root) && isDirectory(root) ? [{ root, label: "Cursor" }] : [];
  },
  scan(root) {
    return scanCursorRoot(root);
  },
};
