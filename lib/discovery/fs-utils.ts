/**
 * Resource Discovery —— 只读文件系统工具（V1 MVP）
 *
 * 安全边界：
 * - 所有操作只读：readdir / stat / readFile 前 N 字节
 * - 跳过运行态 / 缓存 / 版本控制目录，绝不深入大目录
 * - 读取文件只取头部字节用于元数据解析（frontmatter / manifest），不落正文全文
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** 全局跳过目录名（运行态 / 缓存 / 版本控制 / 构建产物） */
export const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "cache",
  "Cache",
  "backups",
  "telemetry",
  "sessions",
  "transcripts",
  "downloads",
  "file-history",
  "debug-logs",
  "ai-tracking",
  "globalStorage",
  "workspaceStorage",
  "History",
  "extensions",
  ".sandbox",
  ".sandbox-bin",
  ".sandbox-secrets",
  ".tmp",
  "archived_sessions",
  "computer-use",
  "pets",
  "process_manager",
  "ambient-suggestions",
  "dictation-history",
  "node_repl",
  "codex-lsp",
  "dist",
  ".next",
  "out",
  "build",
  "coverage",
]);

/** 是否应跳过该名称 */
export function isSkippedName(name: string): boolean {
  return SKIP_DIR_NAMES.has(name);
}

/** 列出目录下的子目录（跳过运行态/缓存目录），按名称排序 */
export function listSubdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !isSkippedName(d.name))
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** 列出目录下的一层文件（跳过已知噪声），按名称排序 */
export function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile() && !isSkippedName(d.name))
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** 目录/文件是否存在 */
export function exists(p: string): boolean {
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}

/** 是否为目录 */
export function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** 文件最后修改时间 ISO（失败返回 null） */
export function lastModified(p: string): string | null {
  try {
    const s = statSync(p);
    return s.isFile() || s.isDirectory() ? new Date(s.mtime).toISOString() : null;
  } catch {
    return null;
  }
}

/** 读取文件头部字节（默认 4KB），失败返回 null */
export function readHead(p: string, bytes = 4096): string | null {
  try {
    const fd = readFileSync(p);
    return fd.subarray(0, bytes).toString("utf8");
  } catch {
    return null;
  }
}

export interface Frontmatter {
  [key: string]: string | undefined;
  name?: string;
  description?: string;
}

/**
 * 解析 Markdown 头部 frontmatter（`---\nkey: value\n---`）。
 * 只取前 4KB 文本，key/value 用 `: ` 切分；不解析嵌套结构（YAML 子集）。
 */
export function parseFrontmatter(text: string | null): Frontmatter | null {
  if (!text) return null;
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const out: Frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in out)) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** 组合路径（join 的别名，便于阅读） */
export function p(...segments: string[]): string {
  return join(...segments);
}

/**
 * 从 SKILL.md 头部文本提取一行简短「如何使用」。
 * 规则（确定性，不猜测）：
 * - 去掉 frontmatter 块（`---` 之间）
 * - 跳过空行与 Markdown 标题行（#）
 * - 取第一个有实质内容的段落，截断至 200 字符
 * 提取不到则返回 null（由调用方兜底为 description）。
 */
export function extractUsage(headText: string | null, maxLen = 200): string | null {
  if (!headText) return null;
  const body = headText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const lines = body.split(/\r?\n/);
  const buf: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (buf.length > 0) break;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) continue; // 标题行
    if (/^```/.test(line)) break; // 代码块边界
    buf.push(line);
    if (buf.join(" ").length >= maxLen) break;
  }
  const text = buf
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}
