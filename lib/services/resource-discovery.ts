/**
 * Resource Discovery Service 入口（双模式，V1 MVP）
 *
 * - Real（默认）：HTTP → Route Handler → Service → 扫描器（只读）→ SQLite
 * - Mock：结构化空态，不伪造扫描结果
 */
import { USE_MOCK } from "./mode";
import * as mock from "./mock/resource-discovery";
import * as http from "@/lib/api/resource-discovery";

export const fetchDiscoveryOverview = USE_MOCK
  ? mock.fetchDiscoveryOverview
  : http.fetchDiscoveryOverview;

export const runResourceScan = USE_MOCK ? mock.runResourceScan : http.runResourceScan;

export const fetchDiscoveredResources = USE_MOCK
  ? mock.fetchDiscoveredResources
  : http.fetchDiscoveredResources;

export const fetchResourceDetail = USE_MOCK ? mock.fetchResourceDetail : http.fetchResourceDetail;

export const hideResource = USE_MOCK ? mock.hideResource : http.hideResource;

export const unhideResource = USE_MOCK ? mock.unhideResource : http.unhideResource;

export const listHiddenResources = USE_MOCK
  ? mock.listHiddenResources
  : http.listHiddenResources;

export const unhideResourceRecord = USE_MOCK
  ? mock.unhideResourceRecord
  : http.unhideResourceRecord;
