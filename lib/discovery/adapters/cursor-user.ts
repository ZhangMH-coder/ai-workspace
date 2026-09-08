/**
 * Cursor User Adapter（V1 MVP）
 *
 * 识别 Cursor 用户配置区（VS Code 风格）：
 * - 候选：APPDATA/Cursor/User
 * - 扫描：
 *   - settings.json → rule（JSON 可解析；只记录键名清单，不落值）
 *   - snippets/*.code-snippets / *.json → command（含 name/prefix 的代码片段）
 * - snippets 目录存在但为空 → 如实返回 0 资源（不编造）
 * - 跳过：globalStorage / workspaceStorage / History
 */
import { exists, isDirectory, lastModified, listFiles, p, readHead } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

function scanCursorUserRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const rootPath = root.root;
  const out: DiscoveredRaw[] = [];

  // settings.json → rule
  const settings = p(rootPath, "settings.json");
  if (exists(settings)) {
    const head = readHead(settings, 8192) ?? "";
    let keys: string[] = [];
    let parseable = false;
    try {
      const parsed = JSON.parse(head) as Record<string, unknown>;
      keys = Object.keys(parsed).slice(0, 24);
      parseable = keys.length > 0;
    } catch {
      parseable = false;
    }
    out.push({
      type: "rule",
      name: "settings.json",
      description: "Cursor 用户设置（仅记录配置键名，不读取值）",
      sourcePath: settings,
      status: "enabled",
      parseable,
      parseNote: parseable ? undefined : "settings.json 无法解析为 JSON",
      metadata: { keys },
      lastModified: lastModified(settings),
    });
  }

  // snippets/*.code-snippets → command
  const snippetsDir = p(rootPath, "snippets");
  if (isDirectory(snippetsDir)) {
    const snippetFiles = listFiles(snippetsDir).filter(
      (f) => f.endsWith(".code-snippets") || (f.endsWith(".json") && f !== "settings.json")
    );
    for (const f of snippetFiles) {
      const fp = p(snippetsDir, f);
      const head = readHead(fp, 4096) ?? "";
      let parseable = false;
      let name = f;
      try {
        const parsed = JSON.parse(head) as Record<string, { prefix?: string | string[]; description?: string }>;
        const entries = Object.keys(parsed);
        parseable = entries.length > 0;
        const first = parsed[entries[0]];
        name = typeof first?.description === "string" ? first.description : f;
      } catch {
        parseable = false;
      }
      out.push({
        type: "command",
        name,
        description: "Cursor 代码片段（Snippet）",
        sourcePath: fp,
        parseable,
        parseNote: parseable ? undefined : "snippet 文件无法解析为 JSON",
        metadata: { rootLabel: root.label, file: f },
        lastModified: lastModified(fp),
      });
    }
  }

  return out;
}

export const cursorUserAdapter: HarnessAdapter = {
  id: "cursor-user",
  name: "Cursor User",
  framework: "Cursor IDE（用户配置区）",
  probe(candidates) {
    const roaming = candidates.find((c) => c.label === "APPDATA")?.root ?? "";
    if (!roaming) return [];
    const root = p(roaming, "Cursor", "User");
    return exists(root) && isDirectory(root) ? [{ root, label: "Cursor User" }] : [];
  },
  scan(root) {
    return scanCursorUserRoot(root);
  },
};
