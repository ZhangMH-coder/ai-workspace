/**
 * Hermes Adapter（S1）
 *
 * 识别 Hermes（Hermes Studio / nousresearch 本地 AI 代理工作台）的资源系统。
 * 用户主战场：Hermes 技能 = SKILL.md（与 Doubao 同格式，复用现有解析器），
 * 目录结构为 `skills/<category>/<skill>/SKILL.md`。
 *
 * - 候选：HOME/.hermes（用户配置主目录，用户实际编辑的技能所在）
 * - 扫描：
 *   - skills/<category>/<skill>/SKILL.md → skill（复用 parseFrontmatter + extractUsage）
 *   - plugins/<name>/（含 SKILL.md / README.md）→ plugin
 * - 跳过隐藏目录（.hub / .curator_* 等）与运行态目录
 * - 有 SKILL.md 但 frontmatter 不可解析 → parseable=false（保留真实路径）
 * - 全程只读；AppData 下的 hermes-agent 为程序安装文件，不作为技能源，避免重复索引
 */
import { exists, isDirectory, lastModified, p, parseFrontmatter, readHead, extractUsage } from "../fs-utils";
import { readdirSync } from "node:fs";
import type { DiscoveryCandidate, DiscoveredRaw, HarnessAdapter } from "../types";

/**
 * 列出目录下的子目录（Hermes 专用：不套用全局跳过名单——
 * 例如 computer-use 在 Cursor 里是运行态目录、在 Hermes 里却是真实技能）。
 * 仅跳过隐藏目录 / node_modules / .git。
 */
function listAllSubdirs(dir: string): string[] {
  if (!exists(dir) || !isDirectory(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "node_modules" && d.name !== ".git")
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * skills/ 根：递归收集所有 SKILL.md（Hermes 结构不统一：
 * - 两层：skills/<category>/<skill>/SKILL.md
 * - 单层分类即技能：skills/<skill>/SKILL.md
 * - 三层：skills/<category>/<group>/<skill>/SKILL.md
 * 统一按「相对 skills/ 的第一段目录 = category」归组，递归收集，不假设固定层级。
 */
function scanSkillsRoot(skillsRoot: string): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const collected: { category: string; dirName: string; skillMd: string }[] = [];

  const walk = (dir: string, relParts: string[], depth: number) => {
    if (depth > 5) return;
    const sub = listAllSubdirs(dir);
    // 目录自身含 SKILL.md → 本身即一个技能
    const selfMd = p(dir, "SKILL.md");
    if (exists(selfMd) && relParts.length > 0) {
      collected.push({ category: relParts[0], dirName: relParts[relParts.length - 1], skillMd: selfMd });
    }
    for (const name of sub) {
      walk(p(dir, name), [...relParts, name], depth + 1);
    }
  };
  walk(skillsRoot, [], 0);

  for (const { category, dirName, skillMd } of collected) {
    const mtime = lastModified(skillMd);
    const head = readHead(skillMd);
    const fm = parseFrontmatter(head);
    const usage = extractUsage(head);
    if (fm && fm.name) {
      out.push({
        type: "skill",
        name: fm.name,
        description: fm.description ?? `Hermes Skill（${category}/${dirName}）`,
        sourcePath: skillMd,
        status: "enabled",
        parseable: true,
        metadata: {
          harness: "Hermes",
          category,
          directory: dirName,
          frontmatter: fm,
          usage: usage ?? fm.description ?? null,
        },
        lastModified: mtime,
      });
    } else {
      out.push({
        type: "skill",
        name: dirName,
        description: `发现 Hermes Skill（${category}/${dirName}），但 frontmatter 缺少可解析的 name 字段`,
        sourcePath: skillMd,
        parseable: false,
        parseNote: fm ? "frontmatter 缺少 name" : "未解析出 frontmatter（非标准 YAML 头部）",
        metadata: { harness: "Hermes", category, directory: dirName },
        lastModified: mtime,
      });
    }
  }
  return out;
}

/** plugins/ 根：每个插件目录 = 一条 plugin 资源 */
function scanPluginsRoot(pluginsRoot: string): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  for (const dirName of listAllSubdirs(pluginsRoot)) {
    const dir = p(pluginsRoot, dirName);
    const skillMd = p(dir, "SKILL.md");
    const readme = p(dir, "README.md");
    const marker = exists(skillMd) ? "SKILL.md" : exists(readme) ? "README.md" : null;
    if (marker) {
      const fp = p(dir, marker);
      const head = readHead(fp);
      const fm = parseFrontmatter(head);
      out.push({
        type: "plugin",
        name: fm?.name ?? dirName,
        description: fm?.description ?? `Hermes 插件（${dirName}）`,
        sourcePath: fp,
        status: "enabled",
        parseable: true,
        metadata: {
          harness: "Hermes",
          directory: dirName,
          marker,
          usage: extractUsage(head) ?? fm?.description ?? null,
        },
        lastModified: lastModified(fp),
      });
    } else {
      out.push({
        type: "plugin",
        name: dirName,
        description: "发现 Hermes 插件目录，但未找到 SKILL.md / README.md",
        sourcePath: dir,
        parseable: false,
        parseNote: "插件目录内未找到 SKILL.md / README.md",
        metadata: { harness: "Hermes", directory: dirName },
        lastModified: lastModified(dir),
      });
    }
  }
  return out;
}

/**
 * 人设（Profile / SOUL.md）：Hermes 以 profile 目录承载人格设定，
 * 每个 profile 目录下若有 SOUL.md 即视为一条「人设」资源（type=prompt）。
 * 位置：APPDATA/../Local/hermes/profiles/<name>/SOUL.md（用户实际使用的 profile）
 */
function scanProfiles(hermesHome: string, localAppData: string): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const profilesRoot = p(localAppData, "hermes", "profiles");
  if (!isDirectory(profilesRoot)) return out;
  for (const profileName of listAllSubdirs(profilesRoot)) {
    const soulMd = p(profilesRoot, profileName, "SOUL.md");
    if (!exists(soulMd)) continue; // profile 无 SOUL.md，非人设资源
    const head = readHead(soulMd);
    const firstPara = extractUsage(head, 160);
    out.push({
      type: "prompt",
      name: `${profileName} 人设`,
      description: firstPara ?? `Hermes Profile「${profileName}」的 SOUL.md 人设定义`,
      sourcePath: soulMd,
      status: "enabled",
      parseable: true,
      metadata: {
        harness: "Hermes",
        profile: profileName,
        usage: firstPara ?? null,
      },
      lastModified: lastModified(soulMd),
    });
  }
  return out;
}

/** 主配置（config.yaml）：Hermes 全局规则（模型 / Provider / 推理设置），不读取密钥 */
function scanMainConfig(hermesHome: string): DiscoveredRaw[] {
  const out: DiscoveredRaw[] = [];
  const cfg = p(hermesHome, "config.yaml");
  if (!exists(cfg)) return [];
  const text = readHead(cfg, 4096) ?? "";
  const pick = (re: RegExp): string | null => {
    const m = re.exec(text);
    return m?.[1]?.trim() || null;
  };
  const defaultModel = pick(/default:\s*([^\s#]+)/);
  const provider = pick(/provider:\s*([^\s#]+)/);
  const baseUrl = pick(/base_url:\s*([^\s#]+)/);
  const modelCount = (text.match(/^ {6}[a-zA-Z0-9_.-]+:\s*\{\}/gm) ?? []).length;
  const summary = [
    defaultModel ? `默认模型 ${defaultModel}` : null,
    provider ? `Provider ${provider}` : null,
    modelCount > 0 ? `${modelCount} 个可用模型` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  out.push({
    type: "rule",
    name: "Hermes 主配置",
    description: summary ? `Hermes 全局配置：${summary}` : "Hermes 全局配置（config.yaml）",
    sourcePath: cfg,
    status: "enabled",
    parseable: true,
    metadata: {
      harness: "Hermes",
      defaultModel,
      provider,
      baseUrl,
      modelCount,
      usage: summary ? `Hermes 运行时读取的全局配置：${summary}。` : null,
    },
    lastModified: lastModified(cfg),
  });
  return out;
}

export const hermesAdapter: HarnessAdapter = {
  id: "hermes",
  name: "Hermes",
  framework: "Hermes Studio",
  probe(candidates: DiscoveryCandidate[]) {
    const home = candidates.find((c) => c.label === "HOME")?.root ?? "";
    if (!home) return [];
    const root = p(home, ".hermes");
    return exists(root) && isDirectory(root) ? [{ root, label: "Hermes" }] : [];
  },
  scan(root) {
    const home = root.root;
    const local = process.env.LOCALAPPDATA ?? "";
    const out: DiscoveredRaw[] = [];
    out.push(...scanSkillsRoot(p(home, "skills")));
    out.push(...scanPluginsRoot(p(home, "plugins")));
    out.push(...scanProfiles(home, local));
    out.push(...scanMainConfig(home));
    return out;
  },
};
