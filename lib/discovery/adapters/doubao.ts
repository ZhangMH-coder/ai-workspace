/**
 * Doubao Skills Adapter（V1 MVP）
 *
 * 识别 Doubao Agent Harness 的 Skill 系统：
 * - 候选：LOCALAPPDATA/Doubao/User Data/Default/.doubao/agent_mode/workspace/.skills
 *         LOCALAPPDATA/Doubao/User Data/Default/.doubao/agent_mode/workspace/.user_skills
 *         HOME/Doubao/skills
 * - 扫描：每个含 SKILL.md 的子目录 = 一个 Skill；解析 frontmatter 的 name/description
 * - 有 SKILL.md 但 frontmatter 不可解析 → parseable=false（保留路径，不猜测）
 */
import { exists, isDirectory, lastModified, listSubdirs, p, parseFrontmatter, readHead } from "../fs-utils";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

const SKILL_ROOTS = (home: string, local: string) => [
  p(local, "Doubao", "User Data", "Default", ".doubao", "agent_mode", "workspace", ".skills"),
  p(local, "Doubao", "User Data", "Default", ".doubao", "agent_mode", "workspace", ".user_skills"),
  p(home, "Doubao", "skills"),
];

function scanSkillRoot(root: DiscoveryCandidate): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const dirs = listSubdirs(root.root);
  for (const dirName of dirs) {
    const skillDir = p(root.root, dirName);
    const skillMd = p(skillDir, "SKILL.md");
    const mtime = lastModified(skillMd) ?? lastModified(skillDir);
    if (!exists(skillMd)) continue; // 目录存在但无 SKILL.md，不是 Skill 资源，不索引
    const fm = parseFrontmatter(readHead(skillMd));
    if (fm && fm.name) {
      out.push({
        type: "skill",
        name: fm.name,
        description: fm.description ?? `Doubao Skill（${dirName}）`,
        sourcePath: skillMd,
        status: "enabled",
        parseable: true,
        metadata: { skillRoot: root.label, frontmatter: fm, directory: dirName },
        lastModified: mtime,
      });
    } else {
      out.push({
        type: "skill",
        name: dirName,
        description: "发现 SKILL.md，但 frontmatter 缺少可解析的 name 字段",
        sourcePath: skillMd,
        parseable: false,
        parseNote: fm ? "frontmatter 缺少 name" : "未解析出 frontmatter（非标准 YAML 头部）",
        metadata: { skillRoot: root.label, directory: dirName },
        lastModified: mtime,
      });
    }
  }
  // 根下直接散落的 SKILL.md（单文件 skill）
  if (exists(p(root.root, "SKILL.md"))) {
    const skillMd = p(root.root, "SKILL.md");
    const fm = parseFrontmatter(readHead(skillMd));
    out.push({
      type: "skill",
      name: fm?.name ?? root.label,
      description: fm?.description ?? "根级 SKILL.md",
      sourcePath: skillMd,
      parseable: Boolean(fm?.name),
      parseNote: fm?.name ? undefined : "frontmatter 缺少可解析的 name",
      metadata: { skillRoot: root.label, frontmatter: fm ?? {} },
      lastModified: lastModified(skillMd),
    });
  }
  return out;
}

export const doubaoSkillsAdapter: HarnessAdapter = {
  id: "doubao-skills",
  name: "Doubao Skills",
  framework: "Doubao Agent",
  probe(candidates) {
    const home = candidates.find((c) => c.label === "HOME")?.root ?? "";
    const local = candidates.find((c) => c.label === "LOCALAPPDATA")?.root ?? "";
    if (!home || !local) return [];
    return SKILL_ROOTS(home, local)
      .filter((r) => exists(r) && isDirectory(r))
      .map((root) => ({ root, label: "Doubao Skills" }));
  },
  scan(root) {
    return scanSkillRoot(root);
  },
};
