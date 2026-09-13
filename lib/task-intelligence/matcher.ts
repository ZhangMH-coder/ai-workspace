/**
 * MatchClassifier —— 推荐结果三态判定（确定性，纯函数）
 *
 * 依据推荐列表最高分将结果分为三态：
 * - matched        高置信：本地确有可用的相关技能 → 推荐 + 预置问题
 * - low-confidence 边缘：有勉强可用的技能 → 少量推荐 + 建议补技能的提示
 * - no-match       无匹配：本地未找到相关技能 → 技能建议（创建新技能）
 *
 * 阈值：S1.58 按用户要求将「找到」阈值提到 0.80（80%）——低于 80% 视为未找到，
 * 页面直接走技能创建建议，不再展示低相关推荐。
 */
import type { Recommendation } from "./types";

export type MatchState = "matched" | "low-confidence" | "no-match";

export const MATCH_HIGH = 0.8;
export const MATCH_LOW = 0.35;

export interface MatchClassification {
  state: MatchState;
  /** 最高分（无推荐时为 0） */
  topScore: number;
  /** 态 A / 态 C 下可用的推荐（按分数降序） */
  usable: Recommendation[];
}

export function classifyMatch(recommendations: Recommendation[]): MatchClassification {
  const sorted = [...recommendations].sort((a, b) => b.score - a.score);
  const top = sorted[0]?.score ?? 0;
  if (top >= MATCH_HIGH) {
    return { state: "matched", topScore: top, usable: sorted };
  }
  if (top >= MATCH_LOW) {
    // 低置信：只展示勉强可用的前几项
    return { state: "low-confidence", topScore: top, usable: sorted.slice(0, 3) };
  }
  return { state: "no-match", topScore: top, usable: [] };
}
