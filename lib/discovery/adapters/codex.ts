/**
 * OpenAI Codex CLI Adapter（V1 MVP）
 *
 * 识别 Codex CLI Harness：
 * - 候选：HOME/.codex
 * - 扫描（白名单，跳过运行态）：
 *   - 根下 config.toml / config.json → rule（配置约束；只记录检测到的配置键名，不落值）
 *   - plugins/ 下每插件目录 → 找 package.json / *.json manifest → plugin
 *     结构未知 → parseable=false（保留路径，不猜测格式）
 *   - 根下 *.md 指令文件（AGENTS.md / CODEWIDE.md 等）→ rule
 * - 跳过：sessions / archived_sessions / cache / computer-use / pets /
 *   process_manager / ambient-suggestions / dictation-history / node_repl / codex-lsp / .sandbox*
 */
import { exists, isDirectory, lastModified, listFiles, listSubdirs, p, readHead } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

function scanCodexRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const rootPath = root.root;
  const out: DiscoveredRaw[] = [];

  // 根下配置文件 → rule（只记录键名，安全：不落配置值）
  const configCandidates = ["config.toml", "config.json", "config.yaml"];
  for (const f of configCandidates) {
    const fp = p(rootPath, f);
    if (!exists(fp)) continue;
    const head = readHead(fp, 2048) ?? "";
    const keys = head
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => l.split("=")[0].trim())
      .filter(Boolean)
      .slice(0, 12);
    out.push({
      type: "rule",
      name: f,
      description: "Codex CLI 配置（仅记录配置项名称，不读取值）",
      sourcePath: fp,
      status: "enabled",
      parseable: keys.length > 0,
      parseNote: keys.length > 0 ? undefined : "配置为空或无法识别配置项",
      metadata: { configKeys: keys },
      lastModified: lastModified(fp),
    });
  }

  // plugins/：插件 manifest（package.json 优先）
  const pluginsDir = p(rootPath, "plugins");
  if (isDirectory(pluginsDir)) {
    for (const dirName of listSubdirs(pluginsDir)) {
      const dir = p(pluginsDir, dirName);
      const manifestCandidates = ["package.json", ...listFiles(dir).filter((f) => f.endsWith(".json"))];
      const manifest = manifestCandidates.find((f) => exists(p(dir, f)));
      if (manifest) {
        out.push({
          type: "plugin",
          name: dirName,
          description: `Codex 插件（${dirName}）`,
          sourcePath: p(dir, manifest),
          parseable: true,
          metadata: { rootLabel: root.label, directory: dirName, manifest },
          lastModified: lastModified(p(dir, manifest)),
        });
      } else {
        out.push({
          type: "plugin",
          name: dirName,
          description: "发现 Codex 插件目录，但结构未知",
          sourcePath: dir,
          parseable: false,
          parseNote: "未找到 package.json / *.json manifest，不猜测插件格式",
          metadata: { rootLabel: root.label, directory: dirName },
          lastModified: lastModified(dir),
        });
      }
    }
  }

  // 根下指令文件 → rule
  for (const f of ["AGENTS.md", "CODEWIDE.md", "RULES.md"]) {
    const fp = p(rootPath, f);
    if (exists(fp)) {
      out.push({
        type: "rule",
        name: f,
        description: "Codex 根级指令文件",
        sourcePath: fp,
        parseable: true,
        metadata: { rootLabel: root.label },
        lastModified: lastModified(fp),
      });
    }
  }

  return out;
}

export const codexAdapter: HarnessAdapter = {
  id: "codex",
  name: "Codex CLI",
  framework: "OpenAI Codex",
  probe(candidates) {
    const home = candidates.find((c) => c.label === "HOME")?.root ?? "";
    if (!home) return [];
    const root = p(home, ".codex");
    return exists(root) && isDirectory(root) ? [{ root, label: "Codex" }] : [];
  },
  scan(root) {
    return scanCodexRoot(root);
  },
};
