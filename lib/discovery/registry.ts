/**
 * Harness Adapter 注册表（V1 MVP）
 *
 * 未来增加新 Harness（如 .gemini、完整 Codex skills、Windsurf 等）：
 * 只需新增 adapter 文件 + 在此注册，扫描器 / 服务 / 页面零改动。
 */
import type { HarnessAdapter } from "./types";
import { claudeAdapter } from "./adapters/claude";
import { codexAdapter } from "./adapters/codex";
import { cursorAdapter } from "./adapters/cursor";
import { cursorUserAdapter } from "./adapters/cursor-user";
import { doubaoSkillsAdapter } from "./adapters/doubao";
import { hermesAdapter } from "./adapters/hermes";
import { projectAgentsAdapter } from "./adapters/project-agents";

export const ADAPTERS: HarnessAdapter[] = [
  doubaoSkillsAdapter,
  hermesAdapter,
  claudeAdapter,
  cursorAdapter,
  codexAdapter,
  cursorUserAdapter,
  projectAgentsAdapter,
];
