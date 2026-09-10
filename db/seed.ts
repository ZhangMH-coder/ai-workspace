/**
 * 业务数据清理脚本（方向调整 S0）
 *
 * 职责：清空早期演示业务表（agent / capability_definition / agent_capability /
 *       project / project_agent / agent_run）。不再种任何演示数据。
 * 真实资源线（discovered_resource / resource_analysis / resource_capability /
 *       task_analysis / task_plan 等）不受影响，由资源扫描与任务分析产生。
 */
import { sqlite } from "./db";

/** 清空全部演示业务表（db:reset 用；保留 migration 历史与真实资源数据） */
export function clearAll() {
  sqlite.exec("DELETE FROM agent_run;");
  sqlite.exec("DELETE FROM project_agent;");
  sqlite.exec("DELETE FROM project;");
  sqlite.exec("DELETE FROM agent_capability;");
  sqlite.exec("DELETE FROM capability_definition;");
  sqlite.exec("DELETE FROM agent;");
}

/** 兼容旧调用：历史 seed 语义已废弃，仅清空并返回空计数 */
export function runSeed() {
  clearAll();
  return {
    agents: 0,
    definitions: 0,
    assemblies: 0,
    projects: 0,
    projectAgents: 0,
    runs: 0,
  };
}
