/**
 * 输入指纹：增量分析判定核心
 *
 * sha1(sourcePath | lastModified | fileSize | metaHash)
 * - 指纹相同 → 跳过（同一输入已分析）
 * - 指纹不同 → 重新分析（内容或元数据变化）
 * - 分析器版本变化单独通过 analyzerVersion 触发全量重分析
 */
import { createHash } from "node:crypto";

function sha1(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}

export function computeInputFingerprint(input: {
  sourcePath: string;
  lastModified: string | null;
  fileSize?: number | null;
  metaHash?: string | null;
}): string {
  const parts = [
    input.sourcePath,
    input.lastModified ?? "",
    String(input.fileSize ?? ""),
    input.metaHash ?? "",
  ];
  return sha1(parts.join("|"));
}

/** 元数据摘要哈希（frontmatter / manifest 变化时指纹变化） */
export function computeMetaHash(metadata: Record<string, unknown>): string {
  return sha1(JSON.stringify(metadata ?? {}));
}
