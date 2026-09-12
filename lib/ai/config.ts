/**
 * LLM 配置（静态发现层）
 *
 * 静态发现（服务端、只读、不进数据库 / 不进 Git / 不进前端）：
 * 1. 环境变量 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL
 * 2. Hermes 自动发现：
 *    - ~/.hermes/.env 中的 HERMES_CUSTOM_OPENAI_API_KEY（Hermes 实际存放 Key 的位置）
 *    - ~/.hermes/config.yaml 中的 custom:tokenrhythm 区块（base_url / default 模型）
 * 3. 内置默认：tokenrhythm 端点 + deepseek-v4-flash-0731
 *
 * 手动配置（Settings 页面填写）优先级更高，由 db/service.getEffectiveLLMConfig() 负责，
 * 本文件只做静态发现。
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const DEFAULT_BASE_URL = "https://tokenrhythm.studio/v1";
export const DEFAULT_MODEL = "deepseek-v4-flash-0731";

function readHermesDotEnvKey(): string {
  try {
    const hermesHome = process.env.HERMES_HOME ?? join(homedir(), ".hermes");
    const envPath = join(hermesHome, ".env");
    if (!existsSync(envPath)) return "";
    const raw = readFileSync(envPath, "utf8");
    const m = raw.match(/^\s*HERMES_CUSTOM_OPENAI_API_KEY\s*=\s*"?([^"\r\n]+)"?\s*$/m);
    return m?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

/** 解析 Hermes config.yaml 的 tokenrhythm 区块（best-effort）：base_url + default 模型 */
function readHermesStatic(): { baseUrl?: string; model?: string } {
  try {
    const hermesHome = process.env.HERMES_HOME ?? join(homedir(), ".hermes");
    const cfgPath = join(hermesHome, "config.yaml");
    if (!existsSync(cfgPath)) return {};
    const raw = readFileSync(cfgPath, "utf8");
    // custom:tokenrhythm 区块：取该区块内的第一个 base_url，以及该区块的 default 模型
    const blockStart = raw.indexOf("custom:tokenrhythm");
    const block = blockStart >= 0 ? raw.slice(blockStart) : raw;
    const baseUrl = block.match(/base_url:\s*(\S+)/)?.[1]?.trim();
    const model = block.match(/default:\s*(\S+)/)?.[1]?.trim();
    return { baseUrl, model };
  } catch {
    return {};
  }
}

/**
 * 静态发现配置。返回来源为 env / hermes / default 三档
 * （manual 由 db/service 覆盖此结果）。
 */
export function discoverStaticConfig(): LLMConfig & { source: "env" | "hermes" | "default" } {
  const envKey = (process.env.LLM_API_KEY ?? process.env.HERMES_CUSTOM_OPENAI_API_KEY ?? "").trim();
  if (envKey) {
    return {
      baseUrl: (process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).trim(),
      model: (process.env.LLM_MODEL ?? DEFAULT_MODEL).trim(),
      apiKey: envKey,
      source: "env",
    };
  }

  const hermesKey = readHermesDotEnvKey();
  if (hermesKey) {
    const hermes = readHermesStatic();
    return {
      baseUrl: (hermes.baseUrl ?? process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).trim(),
      model: (hermes.model ?? process.env.LLM_MODEL ?? DEFAULT_MODEL).trim(),
      apiKey: hermesKey,
      source: "hermes",
    };
  }

  return {
    baseUrl: (process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL).trim(),
    model: (process.env.LLM_MODEL ?? DEFAULT_MODEL).trim(),
    apiKey: "",
    source: "default",
  };
}

export function isLLMConfigured(config: Pick<LLMConfig, "apiKey">): boolean {
  return config.apiKey.length > 0;
}

/** Key 掩码（仅显示末 4 位），用于页面回显，绝不返回完整 Key */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 4) return "****";
  return `****${key.slice(-4)}`;
}
