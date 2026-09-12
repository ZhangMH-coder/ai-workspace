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

/* ---------------- 相关资源推荐（真实派生，S1.28） ---------------- */

export interface RelatedResourceItem {
  id: string;
  name: string;
  type: string;
  harnessId: string;
  sourcePath: string;
  parseable: boolean;
  /** 与目标资源共享的能力标签数（0 = 无共享能力，仅同类补充） */
  sharedCapabilities: number;
  /** 相关理由（真实信号，非推断） */
  reason: string;
}

export async function fetchRelatedResources(
  id: string
): Promise<{ items: RelatedResourceItem[] }> {
  return http.get<{ items: RelatedResourceItem[] }>(
    `/resource-discovery/resources/${id}/related`
  );
}

/* ---------------- 用户级资源隐藏（展示排除，S1.12） ---------------- */

export interface HiddenResourceInfo {
  id: string;
  sourcePath: string;
  hiddenAt: string;
}

export async function hideResource(id: string): Promise<HiddenResourceInfo> {
  const dto = await http.post<{ hidden: HiddenResourceInfo }>(`/resource-discovery/resources/${id}/hidden`);
  return dto.hidden;
}

/** 查询资源当前是否被隐藏（详情页状态展示） */
export async function isResourceHidden(id: string): Promise<boolean> {
  const dto = await http.get<{ hidden: boolean }>(`/resource-discovery/resources/${id}/hidden`);
  return dto.hidden;
}

export async function unhideResource(id: string): Promise<{ sourcePath: string }> {
  const dto = await http.del<{ unhidden: { sourcePath: string } }>(
    `/resource-discovery/resources/${id}/hidden`
  );
  return dto.unhidden;
}

export async function listHiddenResources(): Promise<HiddenResourceInfo[]> {
  const dto = await http.get<{ items: HiddenResourceInfo[] }>("/resource-discovery/hidden");
  return dto.items;
}

/** Settings 恢复：按隐藏记录 id 删除（资源可能已不在索引中，仍可清除隐藏状态） */
export async function unhideResourceRecord(recordId: string): Promise<{ sourcePath: string }> {
  const dto = await http.del<{ unhidden: { sourcePath: string } }>(
    `/resource-discovery/hidden/${recordId}`
  );
  return dto.unhidden;
}

/** 技能 AI 解读：POST → 结构化「如何使用」；未配置 Key → 501 LLM_NOT_CONFIGURED */
export interface ResourceInterpretResult {
  summary: string;
  whatItDoes: string[];
  howToUse: string[];
  /** 仅当结构化解析失败时非空，前端回退平铺展示 */
  rawMarkdown: string;
  model: string;
  interpretedAt: string;
}

export async function interpretResource(id: string): Promise<ResourceInterpretResult> {
  const dto = await http.post<ResourceInterpretResult>(
    `/resource-discovery/resources/${id}/interpret`
  );
  return dto;
}
