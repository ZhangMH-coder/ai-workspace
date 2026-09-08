/**
 * Resource Discovery —— Mock 实现（V1 MVP）
 *
 * 规则：Mock 模式**不执行真实扫描、不伪造任何资源**，始终返回结构化空态。
 * - overview：scanRun=null + 空 Harness 清单（页面显示「未发现本地资源」+ 模式说明）
 * - scan：返回空结果（等同未执行），页面在 Mock 模式下提示"Mock 模式不执行真实扫描"
 * - 资源列表：空；详情：NOT_FOUND
 */
import { ApiError } from "@/lib/api/errors";
import type { DiscoveredResource, DiscoveryOverview, RunScanResult } from "@/lib/types";

const EMPTY_OVERVIEW: DiscoveryOverview = {
  scanRun: null,
  harnesses: [],
  totalResources: 0,
  parseableCount: 0,
  lastScannedAt: null,
};

export async function fetchDiscoveryOverview(): Promise<DiscoveryOverview> {
  return EMPTY_OVERVIEW;
}

export async function runResourceScan(): Promise<RunScanResult> {
  return { scanRun: null, harnesses: [], resources: [] };
}

export async function fetchDiscoveredResources(): Promise<{ items: DiscoveredResource[]; total: number }> {
  return { items: [], total: 0 };
}

export async function fetchResourceDetail(): Promise<DiscoveredResource> {
  throw new ApiError(404, { code: "NOT_FOUND", message: "Mock 模式无资源可展示" });
}
