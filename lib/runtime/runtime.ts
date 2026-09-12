/**
 * Runtime 编排层（P5-1 §二/§三 → P5-2 落地）
 *
 * 执行链：Service.runAgent → Runtime.execute → CapabilityLoader → Provider.execute
 *         → RuntimeResult → Service 持久化 Run
 *
 * 分层不变式：
 * - Service 不知道 Provider（Provider 由 Runtime 内部基于 modelConfig.provider 选择）
 * - UI / Store 不知道 Runtime（只看到 AgentRun Domain）
 * - Runtime 不做持久化（状态迁移与落库由 Service 完成——见 db/service.ts）
 */
import { buildExecutionContext } from "./capability-loader";
import type {
  CapabilitySource,
  ProviderId,
  RuntimeProvider,
  RuntimeRequest,
  RuntimeResult,
  TokenUsage,
} from "./contracts";

/** Provider 注册表：Adapter 在此注册（禁止散落硬编码） */
export interface ProviderRegistry {
  resolve(providerId: ProviderId): RuntimeProvider;
}

export function createProviderRegistry(
  providers: Partial<Record<ProviderId, RuntimeProvider>>
): ProviderRegistry {
  return {
    resolve(providerId) {
      const provider = providers[providerId];
      if (!provider) {
        throw new Error(`[runtime] provider not registered: ${providerId}`);
      }
      return provider;
    },
  };
}

export interface RuntimeOptions {
  source: CapabilitySource;
  providers: ProviderRegistry;
}

export interface Runtime {
  execute(req: RuntimeRequest): Promise<RuntimeResult>;
}

export function createRuntime(options: RuntimeOptions): Runtime {
  const { source, providers } = options;

  return {
    async execute(req): Promise<RuntimeResult> {
      const startedAt = Date.now();

      try {
        // 1) 实时构建 ExecutionContext（无缓存；Definition + AgentCapability 两层只读消费）
        const ctx = await buildExecutionContext(req.agentId, source);

        // 2) Provider 选择（仅 Runtime 内部消费 ProviderId，Service/UI 不接触）
        const provider = providers.resolve(req.modelConfig.provider);

        // 3) 组装归一化消息 → Provider 执行
        const messages = [
          { role: "system" as const, content: ctx.systemPrompt },
          { role: "user" as const, content: req.input || "请执行一次任务" },
        ];

        let result: Awaited<ReturnType<RuntimeProvider["execute"]>>;
        try {
          result = await provider.execute({
            model: req.modelConfig.model,
            messages,
            temperature: req.modelConfig.temperature,
            maxTokens: req.modelConfig.maxTokens,
            timeoutMs: req.modelConfig.timeoutMs,
            retry: req.modelConfig.retry,
            metadata: { agentId: req.agentId, runId: req.runId, source: req.source },
          });
        } catch (e) {
          // Provider 层错误 → 归一化为 RuntimeError（原始细节仅日志）
          const message = e instanceof Error ? e.message : String(e);
          return {
            runId: req.runId,
            status: "failed",
            summary: `运行失败：${message.slice(0, 60)}`,
            usage: emptyUsage(),
            durationMs: Date.now() - startedAt,
            error: {
              code: "provider_unavailable",
              message,
              layer: "provider",
              recoverable: true,
              cause: e,
            },
          };
        }

        // 4) Provider 业务失败（Mock 14% 分支等）→ failed RuntimeResult
        if (result.error) {
          return {
            runId: req.runId,
            status: "failed",
            summary: `运行失败：${result.error.message.slice(0, 60)}`,
            usage: result.usage,
            durationMs: result.durationMs ?? Date.now() - startedAt,
            error: {
              code: result.error.code,
              message: result.error.message,
              layer: result.error.layer,
              recoverable: result.error.recoverable,
            },
          };
        }

        // 5) 组装 RuntimeResult（Service 负责状态迁移与落库）
        return {
          runId: req.runId,
          status: "succeeded",
          output: result.text,
          summary: `「${ctx.agent.name}」完成一次运行，输出 ${result.usage.totalTokens} tokens`,
          usage: result.usage,
          durationMs: result.durationMs ?? Date.now() - startedAt,
        };
      } catch (e) {
        // 编排层错误（如 Agent 不存在 / Loader 失败）
        const message = e instanceof Error ? e.message : String(e);
        return {
          runId: req.runId,
          status: "failed",
          summary: "运行失败：执行上下文构建异常",
          usage: emptyUsage(),
          durationMs: Date.now() - startedAt,
          error: {
            code: "internal_error",
            message,
            layer: "runtime",
            recoverable: false,
            cause: e,
          },
        };
      }
    },
  };
}

function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}
