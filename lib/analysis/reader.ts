/**
 * DocumentReader —— 按资源类型深度只读真实文件，产出可归纳信息
 *
 * 原则：
 * - 严格只读：绝不修改 / 移动 / 删除 / 写入原始 Harness 文件
 * - 不落原文：DocumentInfo 仅存在于分析时的内存，不写入数据库
 * - 体积受限：正文读取有上限，避免大文件拖慢分析
 * - 不可读（文件消失 / 权限）→ 抛出可识别的错误，由上层转为 failed 分析
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";
import type { ResourceType } from "@/lib/types";
import type { DocumentInfo } from "./types";

const MAX_BODY_BYTES = 32 * 1024; // 主文件最多读 32KB
const MAX_PREVIEW_CHARS = 2000; // 正文预览 2KB
const SKIP_REF_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "cache",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
]);

/** 依据资源类型判定主文件候选名（目录型资源的入口文件） */
function mainFileCandidates(type: ResourceType, sourcePath: string, metadata: Record<string, unknown>): string[] {
  if (type === "skill") return ["SKILL.md", "README.md"];
  if (type === "agent") return ["AGENTS.md", "README.md", "manifest.json"];
  if (type === "plugin") return ["package.json", "plugin.json", "manifest.json", "README.md"];
  if (type === "rule") return ["CLAUDE.md", "AGENTS.md", "RULES.md", "settings.json", "config.toml", "config.json", "config.yaml"];
  if (type === "command") return ["snippet.json", "command.json", "README.md"];
  if (type === "mcp") return ["mcp.json", "manifest.json", "README.md"];
  if (type === "prompt") return ["prompt.md", "PROMPT.md", "README.md"];
  // other：沿用已知 metadata 里可能的主文件键
  void metadata;
  return ["README.md", "index.json", "manifest.json"];
}

/** 可读文本扩展名白名单（.py 等脚本不猜测内容，标记不可读） */
const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".json", ".toml", ".yaml", ".yml"]);

function isTextFile(p: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(p).toLowerCase());
}

/** 判定 sourcePath 指向文件还是目录 */
function resolveMainFile(type: ResourceType, sourcePath: string, metadata: Record<string, unknown>): string | null {
  if (existsSync(sourcePath) && statSync(sourcePath).isFile()) {
    return isTextFile(sourcePath) ? sourcePath : null;
  }
  if (!existsSync(sourcePath) || !statSync(sourcePath).isDirectory()) return null;
  const candidates = mainFileCandidates(type, sourcePath, metadata);
  for (const c of candidates) {
    const p = path.join(sourcePath, c);
    if (existsSync(p) && statSync(p).isFile() && isTextFile(p)) return p;
  }
  // 兜底：第一个 *.md 或 *.json
  try {
    const entries = readdirSync(sourcePath);
    const md = entries.find((e) => /\.md$/i.test(e) && isTextFile(path.join(sourcePath, e)));
    if (md) return path.join(sourcePath, md);
    const json = entries.find((e) => /\.json$/i.test(e) && isTextFile(path.join(sourcePath, e)));
    if (json) return path.join(sourcePath, json);
  } catch {
    /* 不可读目录：返回 null */
  }
  return null;
}

function extractFrontmatter(text: string): { frontmatter: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { frontmatter: {}, body: text };
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { frontmatter: fm, body: text.slice(m[0].length) };
}

function extractHeadings(body: string, max = 8): string[] {
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = /^#{1,3}\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim().replace(/[#*`]/g, "").trim());
    if (out.length >= max) break;
  }
  return out;
}

function listReferences(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((e) => !SKIP_REF_NAMES.has(e) && !e.startsWith("."))
      .slice(0, 20);
  } catch {
    return [];
  }
}

/** 读取一个资源的可归纳信息（只读；失败抛错由上层处理） */
export function readDocument(input: {
  type: ResourceType;
  sourcePath: string;
  metadata: Record<string, unknown>;
}): DocumentInfo {
  const mainFile = resolveMainFile(input.type, input.sourcePath, input.metadata);
  if (!mainFile || !existsSync(mainFile)) {
    throw new Error(`DOCUMENT_NOT_FOUND: ${input.sourcePath}`);
  }
  const stat = statSync(mainFile);
  let text = "";
  try {
    const buf = readFileSync(mainFile, { encoding: "utf8", flag: "r" });
    text = buf.slice(0, MAX_BODY_BYTES);
  } catch {
    throw new Error(`DOCUMENT_UNREADABLE: ${mainFile}`);
  }
  const { frontmatter, body } = extractFrontmatter(text);
  const headings = extractHeadings(body);
  const dir = path.dirname(mainFile);
  const references = listReferences(dir);
  return {
    filePath: mainFile,
    fileSize: stat.size,
    headings,
    references,
    bodyPreview: body.replace(/\s+/g, " ").trim().slice(0, MAX_PREVIEW_CHARS),
    rawFrontmatter: frontmatter,
  };
}
