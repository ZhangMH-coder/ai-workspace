/**
 * Resource Discovery —— 扫描编排器（V1 MVP）
 *
 * 流程：构建候选根（HOME / LOCALAPPDATA / APPDATA / CWD）
 *       → 逐 Adapter 探测命中 → 扫描命中根 → 收集原始资源 + 扫描位置清单。
 *
 * 安全：全程只读；Adapter 内部 try/catch，单个 Harness 失败不阻塞整体。
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute } from "node:path";
import { ADAPTERS } from "./registry";
import type { DiscoveryCandidate, DiscoveredRaw } from "./types";

/** 带 Harness 归属的原始资源 */
export type DiscoveredRawWithHarness = DiscoveredRaw & { harnessId: string };

export interface HarnessScanOutcome {
  harnessId: string;
  harnessName: string;
  rootPath: string;
  found: boolean;
  resourceCount: number;
  scannedAt: string;
}

export interface ScanLocation {
  path: string;
  label: string;
  /** 命中该位置的 Harness id 列表（空 = 探测过但无 Harness 命中） */
  hits: string[];
}

export interface ScanOutcome {
  locations: ScanLocation[];
  harnessScans: HarnessScanOutcome[];
  resources: DiscoveredRawWithHarness[];
  errors: string[];
}

/** 构建候选根：基于真实环境变量与系统主目录，不假设固定路径 */
export function buildCandidates(): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];
  const push = (root: string | undefined, label: string) => {
    if (root && isAbsolute(root) && existsSync(root)) out.push({ root, label });
  };
  push(process.env.USERPROFILE ?? homedir(), "HOME");
  push(process.env.LOCALAPPDATA, "LOCALAPPDATA");
  push(process.env.APPDATA, "APPDATA");
  push(process.cwd(), "CWD");
  return out;
}

/** 执行一次全量只读扫描 */
export function runDiscoveryScan(): ScanOutcome {
  const candidates = buildCandidates();
  const locations: ScanLocation[] = candidates.map((c) => ({ path: c.root, label: c.label, hits: [] }));
  const harnessScans: HarnessScanOutcome[] = [];
  const resources: DiscoveredRawWithHarness[] = [];
  const errors: string[] = [];
  const scannedAt = new Date().toISOString();

  for (const adapter of ADAPTERS) {
    let hits: DiscoveryCandidate[] = [];
    try {
      hits = adapter.probe(candidates);
    } catch (e) {
      errors.push(`${adapter.id}: probe 失败 (${String(e)})`);
    }

    for (const hit of hits) {
      const loc = locations.find((l) => l.path === hit.root);
      if (loc) loc.hits.push(adapter.id);
      let items: DiscoveredRaw[] = [];
      try {
        items = adapter.scan(hit);
      } catch (e) {
        errors.push(`${adapter.id}@${hit.root}: 扫描失败 (${String(e)})`);
      }
      for (const r of items) resources.push({ ...r, harnessId: adapter.id });
      harnessScans.push({
        harnessId: adapter.id,
        harnessName: adapter.name,
        rootPath: hit.root,
        found: true,
        resourceCount: items.length,
        scannedAt,
      });
    }

    if (hits.length === 0) {
      harnessScans.push({
        harnessId: adapter.id,
        harnessName: adapter.name,
        rootPath: "",
        found: false,
        resourceCount: 0,
        scannedAt,
      });
    }
  }

  return { locations, harnessScans, resources, errors };
}
