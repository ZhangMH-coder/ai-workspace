/**
 * Resource Discovery Service 入口（仅 Real：HTTP → Route Handler → 扫描器（只读）→ SQLite）
 */
export {
  fetchDiscoveryOverview,
  runResourceScan,
  fetchDiscoveredResources,
  fetchResourceDetail,
  fetchAdjacentResources,
  fetchRelatedResources,
  hideResource,
  isResourceHidden,
  unhideResource,
  listHiddenResources,
  unhideResourceRecord,
  interpretResource,
} from "@/lib/api/resource-discovery";