/**
 * Resource Intelligence —— 分析器内部契约（Phase 2 MVP）
 *
 * 边界：
 * - AnalysisProvider 接口是唯一分析入口；MVP 只注册 HeuristicAnalyzer，
 *   LLMAnalyzer 仅实现契约（不注册、不执行）。
 * - 输入全部来自真实文件（DocumentReader 只读），零 Demo / Mock 数据。
 * - 输出必须带证据（evidenceRef + evidenceSnippet），可追溯到真实文件位置。
 */
import type { CapabilityCategory, ResourceType } from "@/lib/types";

/** DocumentReader 输出：资源的可归纳信息（不落原文，仅分析时内存使用） */
export interface DocumentInfo {
  /** 主文件绝对路径 */
  filePath: string;
  fileSize: number;
  /** 章节标题（# / ## / ###，前 N 个） */
  headings: string[];
  /** 引用文件 / 子目录名清单（README / examples / scripts 等） */
  references: string[];
  /** 正文预览（去 frontmatter 后前 ~2KB） */
  bodyPreview: string;
  /** 原始 frontmatter 键值 */
  rawFrontmatter: Record<string, unknown>;
}

/** 分析输入：资源事实（来自 discovered_resource）+ 文档信息（来自 Reader） */
export interface AnalysisInput {
  resource: {
    id: string;
    type: ResourceType;
    name: string;
    description: string;
    sourcePath: string;
    framework: string;
    version: string | null;
    status: string;
    metadata: Record<string, unknown>;
    lastModified: string | null;
  };
  document: DocumentInfo;
}

/** 单条能力标签（分析器输出，zod 校验前形态） */
export interface CapabilityResult {
  capability: string;
  category: CapabilityCategory;
  keywords: string[];
  /** 0-1 置信度 */
  confidence: number;
  /** 证据定位，如 "SKILL.md#description" */
  evidenceRef: string;
  /** 证据原文片段（≤500 字符） */
  evidenceSnippet: string;
  /** 未来执行层提示（仅描述，不执行） */
  executionHint?: string | null;
}

/** 分析结果 */
export interface AnalysisOutcome {
  status: "analyzed" | "failed";
  /** 一句话能力总述（无能力时为「未提取到明确能力」） */
  summary: string;
  capabilities: CapabilityResult[];
  errorCode?: string | null;
  errorMessage?: string | null;
}

/** 分析器契约：输入确定 → 输出确定（heuristic 保证幂等；llm 为未来实现） */
export interface AnalysisProvider {
  /** 稳定标识，如 "heuristic-v1" / "llm-v1" */
  id: string;
  /** 分析策略 */
  strategy: "heuristic" | "llm";
  analyze(input: AnalysisInput): AnalysisOutcome;
}
