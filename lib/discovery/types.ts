/**
 * Resource Discovery —— 领域契约（V1 MVP）
 *
 * 目标：让 AI Workspace 只读发现本机真实存在的 AI Harness / Skill / Agent
 * 资源，解析为统一索引，不伪造数据。
 *
 * 设计原则：
 * - Adapter 可扩展：不同 Harness 的目录结构 / 文件格式 / 命名规则完全不同，
 *   每个 Harness 一个 Adapter，禁止硬编码成一种格式。
 * - 只读：绝不修改 / 移动 / 删除 / 写入原始 Harness 文件。
 * - 不可解析 ≠ 伪造：能定位但无法解析的资源 parseable=false，保留真实路径。
 * - 幂等：以 sourcePath 为唯一键 upsert，重复扫描不产生重复资源。
 */
import type { ResourceType } from "@/lib/types";

/** 候选根：扫描的起点位置（HOME / LOCALAPPDATA / APPDATA / CWD） */
export interface DiscoveryCandidate {
  /** 候选根绝对路径 */
  root: string;
  /** 人类可读标签 */
  label: string;
}

/** 单个资源的原始扫描结果（Adapter 输出，尚未入库） */
export interface DiscoveredRaw {
  type: ResourceType;
  name: string;
  description: string;
  /** 真实绝对路径（文件或目录），必须能追溯到本地来源 */
  sourcePath: string;
  version?: string | null;
  status?: "enabled" | "unknown";
  /** 是否成功解析出结构化信息；false 表示「发现但暂无法解析」 */
  parseable: boolean;
  /** 不可解析原因（parseable=false 时必填） */
  parseNote?: string | null;
  /** 原始元数据摘要（如 SKILL.md frontmatter 头部字段、manifest 关键字段） */
  metadata: Record<string, unknown>;
  /** 文件最后修改时间 ISO */
  lastModified: string | null;
}

/** Harness Adapter 契约：探测 + 扫描 */
export interface HarnessAdapter {
  /** 稳定标识，如 "doubao-skills" */
  id: string;
  /** 展示名，如 "Doubao Skills" */
  name: string;
  /** 框架名，如 "Doubao Agent" */
  framework: string;
  /** 从候选根中挑出本 Harness 命中的根（存在即认为可扫描） */
  probe(candidates: DiscoveryCandidate[]): DiscoveryCandidate[];
  /** 扫描一个命中根，返回原始资源；异常应被上层捕获并记录 */
  scan(root: DiscoveryCandidate): DiscoveredRaw[];
}
