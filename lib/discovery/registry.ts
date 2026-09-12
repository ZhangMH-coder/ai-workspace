/**
 * Harness Adapter 注册表（V1 MVP）
 *
 * 未来增加新 Harness（如 .gemini、完整 Codex skills、Windsurf 等）：
 * 只需新增 adapter 文件 + 在此注册，扫描器 / 服务 / 页面零改动。
 *
 * S1.32：用户已停用 Cursor（本机 .cursor / Cursor User 为残留），
 * cursor / cursor-user 适配器从注册表移除（文件保留，恢复时重新注册即可）。
 */
import type { HarnessAdapter } from "./types";
import { claudeAdapter } from "./adapters/claude";
import { codexAdapter } from "./adapters/codex";
import { doubaoSkillsAdapter } from "./adapters/doubao";
import { hermesAdapter } from "./adapters/hermes";
import { projectAgentsAdapter } from "./adapters/project-agents";

export const ADAPTERS: HarnessAdapter[] = [
  doubaoSkillsAdapter,
  hermesAdapter,
  claudeAdapter,
  codexAdapter,
  projectAgentsAdapter,
];
