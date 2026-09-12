/**
 * Settings — AI Provider（LLM 连接配置，S1.20）
 *
 * 参考 Hermes 配置结构（base_url / model / key）：
 * - 展示当前生效配置来源（手动配置 > 环境变量 > Hermes 自动发现 > 内置默认）
 * - 支持填写自定义端点 / 模型 / API Key（为将来换端点准备）
 * - 连接测试为真实调用；Key 明文保存在本地 SQLite（data/ 不入 Git，等同 Hermes .env 行为）
 */
"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Loader2, PlugZap, RotateCcw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  LlmProviderConfigDTO,
  TestLLMResultDTO,
} from "@/lib/api/ai";
import {
  clearLLMProviderConfig,
  fetchLLMProviderConfig,
  saveLLMProviderConfig,
  testLLMProviderConfig,
} from "@/lib/services/ai";
import { USE_MOCK } from "@/lib/services/mode";

const SOURCE_LABEL: Record<string, string> = {
  manual: "手动配置",
  env: "环境变量",
  hermes: "Hermes 自动发现",
  default: "内置默认",
};

/** 官方端点预设（OpenAI 兼容格式，仅填 base_url，模型 / Key 由用户填写） */
const OFFICIAL_ENDPOINTS = [
  { key: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", hint: "OpenAI 官方端点" },
  { key: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", hint: "DeepSeek 官方端点" },
  { key: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", hint: "Anthropic 官方端点（chat 格式与 OpenAI 不同，建议经 OpenAI 兼容中转使用）" },
  { key: "moonshot", name: "Kimi", baseUrl: "https://api.moonshot.cn/v1", hint: "Moonshot Kimi 官方端点" },
  { key: "zhipu", name: "智谱", baseUrl: "https://open.bigmodel.cn/api/paas/v4", hint: "智谱 GLM 官方端点" },
  { key: "qwen", name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", hint: "阿里云百炼 DashScope（OpenAI 兼容模式）" },
  { key: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", hint: "OpenRouter 聚合端点（需 OPENROUTER_API_KEY）" },
  { key: "ollama", name: "Ollama", baseUrl: "http://localhost:11434/v1", hint: "本地 Ollama（无需 API Key，可填任意占位）" },
  { key: "doubao", name: "豆包 Ark", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", hint: "火山方舟豆包 Ark（OpenAI 兼容模式）" },
];

/** 测试连接成功后：可用模型选择（端点返回 /models 时展示；否则提示手动输入） */
function ModelPicker({
  models,
  currentModel,
  onPick,
}: {
  models: string[] | null;
  currentModel: string;
  onPick: (model: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] font-medium text-ink-2">
        可用模型（点击选择，自动填入上方 Model 输入框）
      </p>
      {models && models.length > 0 ? (
        <div className="flex max-h-[150px] flex-wrap gap-1.5 overflow-y-auto">
          {models.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onPick(m)}
              className={`h-6 rounded-md border px-2 font-mono text-[11px] transition-colors ${
                currentModel.trim() === m
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/[0.03] text-ink-2 hover:border-white/25 hover:text-ink"
              }`}
              title={`选择 ${m}`}
            >
              {m}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-ink-3">
          该端点未返回模型列表（可能不支持 /models），可直接在上方 Model 输入框手动填写。
        </p>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color =
    source === "manual"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"
      : source === "hermes"
        ? "bg-violet-500/10 text-violet-300 border-violet-400/20"
        : source === "env"
          ? "bg-sky-500/10 text-sky-300 border-sky-400/20"
          : "bg-white/5 text-ink-3 border-white/10";
  return (
    <Badge variant="outline" className={`border ${color}`}>
      {SOURCE_LABEL[source] ?? source}
    </Badge>
  );
}

export function LlmProvider() {
  const [config, setConfig] = useState<LlmProviderConfigDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestLLMResultDTO | null>(null);
  const [savedTip, setSavedTip] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const dto = await fetchLLMProviderConfig();
      setConfig(dto);
      setBaseUrl(dto.manual?.baseUrl ?? "");
      setModel(dto.manual?.model ?? "");
      setApiKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dto = await fetchLLMProviderConfig();
        if (cancelled) return;
        setConfig(dto);
        setBaseUrl(dto.manual?.baseUrl ?? "");
        setModel(dto.manual?.model ?? "");
        setApiKey("");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSavedTip(null);
    try {
      await saveLLMProviderConfig({
        baseUrl: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      });
      setApiKey("");
      setSavedTip("已保存，配置立即生效");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testLLMProviderConfig();
      setTestResult(r);
    } catch (e) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        model: config?.effective.model ?? "",
        source: config?.effective.source ?? "default",
        error: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleClear() {
    try {
      await clearLLMProviderConfig();
      setSavedTip("已恢复自动发现（环境变量 / Hermes / 内置默认）");
      setTestResult(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-[13px] text-ink-2">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        正在读取 LLM 配置…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-red-400/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-300">
        读取配置失败：{error ?? "未知错误"}
      </div>
    );
  }

  const eff = config.effective;
  const isManual = eff.source === "manual";

  return (
    <Card className="border-white/10 bg-transparent">
      <CardHeader className="px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Bot className="size-3.5 text-primary" /> AI Provider（LLM 连接）
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 pb-4">
        {USE_MOCK && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-200/90">
            Mock 模式：不接入真实 LLM，配置仅作展示。
          </p>
        )}

        {/* 当前生效配置 */}
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink-2">当前生效来源</p>
            <SourceBadge source={eff.source} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">base_url</p>
              <p className="truncate text-[13px] text-ink" title={eff.baseUrl}>
                {eff.baseUrl || "—"}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">model</p>
              <p className="truncate text-[13px] text-ink">{eff.model || "—"}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">api key</p>
              <p className="text-[13px] text-ink">
                {eff.keyConfigured ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-emerald-300">
                      {eff.keyMasked}
                    </span>
                    <Check className="size-3 text-emerald-400" />
                  </span>
                ) : (
                  <span className="text-ink-3">未配置</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 手动配置表单（参考 Hermes：base_url / model / key） */}
        <div className="flex flex-col gap-3">
          {/* 官方 / 自定义端点快捷选择 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-ink-2">连接方式（官方端点一键填入，也可自定义）</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {OFFICIAL_ENDPOINTS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setBaseUrl(o.baseUrl)}
                  className={`h-7 rounded-lg border px-2.5 text-[12px] transition-colors ${
                    baseUrl.trim() === o.baseUrl
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.03] text-ink-2 hover:border-white/20 hover:text-ink"
                  }`}
                  title={`${o.hint}：${o.baseUrl}`}
                >
                  {o.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBaseUrl("")}
                className={`h-7 rounded-lg border px-2.5 text-[12px] transition-colors ${
                  baseUrl.trim() !== "" &&
                  !OFFICIAL_ENDPOINTS.some((o) => o.baseUrl === baseUrl.trim())
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/[0.03] text-ink-2 hover:border-white/20 hover:text-ink"
                }`}
              >
                自定义
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-ink-2">Base URL（自定义 / 官方连接）</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={eff.defaults.baseUrl}
              className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-ink-2">Model</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={eff.defaults.model}
              className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-ink-2">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                isManual && eff.keyConfigured
                  ? "已配置（留空则不修改）"
                  : "粘贴 API Key（如 Hermes 的 HERMES_CUSTOM_OPENAI_API_KEY）"
              }
              autoComplete="off"
              className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
            />
          </div>
        </div>

        {/* 操作区 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleSave()}
            disabled={saving || USE_MOCK}
            className="h-8 gap-1.5 border-white/10 text-[12px]"
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
            保存配置
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleTest()}
            disabled={testing || USE_MOCK}
            className="h-8 gap-1.5 border-white/10 text-[12px]"
          >
            {testing ? <Loader2 className="size-3 animate-spin" /> : <PlugZap className="size-3" />}
            测试连接
          </Button>
          {isManual && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleClear()}
              disabled={USE_MOCK}
              className="h-8 gap-1.5 text-[12px] text-ink-2 hover:text-ink"
            >
              <RotateCcw className="size-3" /> 恢复自动发现
            </Button>
          )}
        </div>

        {/* 提示 / 测试结果 / 错误 */}
        {savedTip && <p className="text-[12px] text-emerald-300">{savedTip}</p>}
        {testResult && (
          <div className="flex flex-col gap-2">
            <p
              className={`rounded-lg border px-3 py-2 text-[12px] ${
                testResult.ok
                  ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-300"
                  : "border-red-400/20 bg-red-500/5 text-red-300"
              }`}
            >
              {testResult.ok
                ? `连接成功 · ${testResult.latencyMs}ms · ${testResult.model}`
                : `连接失败：${testResult.error ?? "未知错误"}`}
            </p>
            {testResult.ok && (
              <ModelPicker
                models={testResult.models ?? null}
                currentModel={model}
                onPick={(m) => {
                  setModel(m);
                  setSavedTip(`已选择模型：${m}`);
                }}
              />
            )}
          </div>
        )}
        {error && !testResult && (
          <p className="rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            {error}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-ink-3">
          安全说明：API Key 以明文保存在本地数据库（data/，已排除在 Git 之外），仅本机访问，等同 Hermes
          .env 的行为。读取接口只回显掩码，不返回完整 Key。
        </p>
      </CardContent>
    </Card>
  );
}
