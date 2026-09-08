/**
 * CapabilityLoader（P5-1 §6 落地）
 *
 * 职责：把 CapabilityDefinition（资产）+ AgentCapability（装配）两层只读消费，
 * 构建 Runtime 执行上下文（ExecutionContext）。
 *
 * 不变式：
 * - 只消费 enabled=true 且 definition.lifecycle=active 的装配（归档不进入新执行）
 * - 每次执行实时构建，无缓存 → 无第二数据源
 * - 四类共用同一读取管线，按 type 解构为 rules / tools / skills / memoryHints
 */
import type {
  CapabilitySource,
  ExecutionContext,
  MemoryHint,
  RuntimeRule,
  RuntimeSkill,
  RuntimeTool,
} from "./contracts";

const RULES_INJECTION_HEADER = "[规则区]";
const SKILLS_INJECTION_HEADER = "[技能区]";
const MEMORY_INJECTION_HEADER = "[记忆]";
const TOOLS_INJECTION_HEADER = "[工具区]";

export async function buildExecutionContext(
  agentId: string,
  source: CapabilitySource
): Promise<ExecutionContext> {
  const agent = source.getAgent(agentId);
  if (!agent) {
    throw new Error(`[runtime] agent not found: ${agentId}`);
  }

  // 1) 读取全部装配（含 disabled / 归档），Loader 负责过滤
  const assemblies = source.listAssemblies(agentId);

  // 2) 过滤：enabled=true 且 definition lifecycle=active（归档不进入新执行）
  const active = assemblies.filter((a) => a.enabled && a.lifecycle === "active");

  // 3) 按类型解构（四类共用同一管线）
  const rules: RuntimeRule[] = active
    .filter((a) => a.type === "rule")
    .map((a) => ({ capabilityId: a.capabilityId, name: a.name, description: a.description }));
  const tools: RuntimeTool[] = active
    .filter((a) => a.type === "tool")
    .map((a) => ({ capabilityId: a.capabilityId, name: a.name, description: a.description }));
  const skills: RuntimeSkill[] = active
    .filter((a) => a.type === "skill")
    .map((a) => ({ capabilityId: a.capabilityId, name: a.name, description: a.description }));
  const memoryHints: MemoryHint[] = active
    .filter((a) => a.type === "memory")
    .map((a) => ({ capabilityId: a.capabilityId, name: a.name, description: a.description }));

  // 4) 组装 system prompt（注入顺序：基座 → Rules → Skills → Memory 占位 → Tools）
  const parts: string[] = [agent.systemPrompt];
  if (rules.length > 0) {
    parts.push(RULES_INJECTION_HEADER, ...rules.map((r) => `- ${r.name}: ${r.description}`));
  }
  if (skills.length > 0) {
    parts.push(SKILLS_INJECTION_HEADER, ...skills.map((s) => `- ${s.name}: ${s.description}`));
  }
  if (memoryHints.length > 0) {
    parts.push(`${MEMORY_INJECTION_HEADER} 存在 ${memoryHints.length} 项装配（P5-2 stub，未注入检索内容）`);
  }
  if (tools.length > 0) {
    parts.push(
      TOOLS_INJECTION_HEADER,
      JSON.stringify(tools.map((t) => ({ name: t.name, description: t.description })))
    );
  }

  return {
    agent: { id: agent.id, name: agent.name, systemPrompt: agent.systemPrompt, model: agent.model },
    systemPrompt: parts.join("\n\n"),
    rules,
    tools,
    skills,
    memoryHints,
    assembledCount: assemblies.length,
  };
}
