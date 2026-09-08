/**
 * Resource Discovery API Client（V1 MVP）
 *
 * 只读展示 + 重新扫描；DTO → Domain 由 mappers 转换，Store 永远消费 Domain。
 */
import { http } from "./client";
import { toDiscoveredResource, toDiscoveryOverview, toRunScanResult } from "./mappers";
import type { DiscoveredResourceDTO, DiscoveryOverviewDTO, RunScanResultDTO, PageDTO } from "./dto";
import type { DiscoveredResource, DiscoveryOverview, RunScanResult } from "@/lib/types";

export interface ResourceListQuery {
  search?: string;
  type?: string;
  harness?: string;
  parseable?: boolean;
  page?: number;
  pageSize?: number;
}

export async function fetchDiscoveryOverview(): Promise<DiscoveryOverview> {
  const dto = await http.get<DiscoveryOverviewDTO>("/resource-discovery/overview");
  return toDiscoveryOverview(dto);
}

export async function runResourceScan(): Promise<RunScanResult> {
  const dto = await http.post<RunScanResultDTO>("/resource-discovery/scan");
  return toRunScanResult(dto);
}

export async function fetchDiscoveredResources(
  q: ResourceListQuery = {}
): Promise<{ items: DiscoveredResource[]; total: number }> {
  const sp = new URLSearchParams();
  if (q.search) sp.set("search", q.search);
  if (q.type) sp.set("type", q.type);
  if (q.harness) sp.set("harness", q.harness);
  if (q.parseable !== undefined) sp.set("parseable", String(q.parseable));
  sp.set("page", String(q.page ?? 1));
  sp.set("pageSize", String(q.pageSize ?? 50));
  const dto = await http.get<PageDTO<DiscoveredResourceDTO>>(
    `/resource-discovery/resources?${sp.toString()}`
  );
  return { items: dto.items.map(toDiscoveredResource), total: dto.total };
}

export async function fetchResourceDetail(id: string): Promise<DiscoveredResource> {
  const dto = await http.get<DiscoveredResourceDTO>(`/resource-discovery/resources/${id}`);
  return toDiscoveredResource(dto);
}
