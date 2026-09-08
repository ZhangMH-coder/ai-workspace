import { NextRequest, NextResponse } from "next/server";
import * as repo from "@/db/repository";
import { ServiceError } from "@/db/service";
import { handleError, parseTimeRange } from "@/lib/api/server";

/**
 * 统计聚合端点（P4-2 收敛：只接受显式 from/to）
 * - 时间窗口边界由前端唯一窗口实现（windowBoundsForRange）计算并传入
 * - 服务端只做：明确 from/to → 查询 → 聚合 → 返回
 * - ?project= 经 project_agent 派生（项目统计 = 派生，Run 无 projectId）；?agent= 单 Agent 维度
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const range = parseTimeRange(sp); // from/to 成对必填
    if (!range.from || !range.to) {
      throw new ServiceError("VALIDATION_ERROR", "统计接口必须提供 from 与 to");
    }
    const agentId = sp.get("agent") ?? undefined;
    const agentIds = agentId
      ? [agentId]
      : sp.get("agents")?.split(",").filter(Boolean);
    const projectId = sp.get("project") ?? undefined;
    const stats = repo.runsStats({ from: range.from, to: range.to, agentIds, projectId });
    return NextResponse.json({
      window: { from: range.from, to: range.to },
      ...stats,
    });
  } catch (e) {
    return handleError(e);
  }
}
