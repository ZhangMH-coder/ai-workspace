/**
 * PresetQuestionGenerator —— 预置问题生成（纯函数，不接 LLM）
 *
 * 为每个推荐技能生成 2~3 个「已嵌入用户原任务」的预置问题，
 * 供用户选择复制后到对应 Harness 使用。问题模板通用，不针对测试词硬编码。
 */
import type { Recommendation } from "./types";

export interface PresetQuestion {
  id: string;
  label: string;
  text: string;
}

/** 按资源类型给出差异化的问题措辞（skill / agent / mcp / plugin / 其他） */
function typeStyle(rec: Recommendation): string {
  const t = rec.type ?? "";
  if (t.includes("agent")) return "以「{name}」Agent 的身份，代为处理任务：{task}，完成后给出可直接使用的结果。";
  if (t.includes("mcp") || t.includes("plugin") || t.includes("tool")) {
    return "通过「{name}」工具，为任务「{task}」执行对应的能力并返回结果。";
  }
  return "以「{name}」技能专家的身份，按照其 SKILL.md 的标准流程执行任务「{task}」，直接给出可用的最终产出。";
}

function fill(tpl: string, name: string, task: string): string {
  return tpl.replaceAll("{name}", name).replaceAll("{task}", task);
}

/** 生成预置问题：Q1 直接执行 / Q2 完整产出 / Q3 场景化（按类型差异） */
export function generatePresetQuestions(
  task: string,
  rec: Recommendation
): PresetQuestion[] {
  const name = rec.resourceName;
  return [
    {
      id: `q1-${rec.resourceCapabilityId}`,
      label: "直接执行",
      text: fill("帮我用「{name}」完成：{task}", name, task),
    },
    {
      id: `q2-${rec.resourceCapabilityId}`,
      label: "完整产出",
      text: fill(
        "使用「{name}」技能，针对任务「{task}」生成完整可用的最终产出（包含执行步骤与结果）。",
        name,
        task
      ),
    },
    {
      id: `q3-${rec.resourceCapabilityId}`,
      label: "按场景优化",
      text: fill(typeStyle(rec), name, task),
    },
  ];
}
