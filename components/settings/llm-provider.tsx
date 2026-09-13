/**
 * Settings — AI Provider（LLM 端点管理，S1.53）
 *
 * - 多端点：可添加多个命名端点（base_url / model / apiKey），支持切换「默认端点」
 * - 厂商快捷模板：一键填入官方端点（name + base_url + 推荐模型提示）
 * - API Key 加密存储（AES-256-GCM，本机派生密钥），读取只回显掩码
 * - 测试连接真实调用；成功后展示该端点可用模型，点击选择填入 Model
 */
"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Loader2,
  Pencil,
  PlugZap,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  LlmEndpointDTO,
  LlmProviderConfigDTO,
  TestLLMResultDTO,
} from "@/lib/api/ai";
import {
  activateLLMEndpoint,
  clearLLMProviderConfig,
  createLLMEndpoint,
  deleteLLMEndpoint,
  fetchLLMProviderConfig,
  testLLMEndpoint,
  updateLLMEndpoint,
} from "@/lib/services/ai";

const SOURCE_LABEL: Record<string, string> = {
  manual: "手动配置",
  env: "环境变量",
  hermes: "本机自动发现",
  default: "内置默认",
};

/** 官方端点预设（快捷添加：name + base_url + 推荐模型提示） */
const OFFICIAL_ENDPOINTS = [
  { key: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", modelHint: "gpt-4o-mini", hint: "OpenAI 官方端点" },
  { key: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", modelHint: "deepseek-chat", hint: "DeepSeek 官方端点" },
  { key: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", modelHint: "claude-sonnet-4-20250514", hint: "Anthropic 官方端点（chat 格式与 OpenAI 不同，建议经 OpenAI 兼容中转使用）" },
  { key: "moonshot", name: "Kimi", baseUrl: "https://api.moonshot.cn/v1", modelHint: "moonshot-v1-8k", hint: "Moonshot Kimi 官方端点" },
  { key: "zhipu", name: "智谱", baseUrl: "https://open.bigmodel.cn/api/paas/v4", modelHint: "glm-4-flash", hint: "智谱 GLM 官方端点" },
  { key: "qwen", name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", modelHint: "qwen-plus", hint: "阿里云百炼 DashScope（OpenAI 兼容模式）" },
  { key: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", modelHint: "", hint: "OpenRouter 聚合端点" },
  { key: "ollama", name: "Ollama", baseUrl: "http://localhost:11434/v1", modelHint: "", hint: "本地 Ollama（无需 API Key）" },
  { key: "doubao", name: "豆包 Ark", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", modelHint: "", hint: "火山方舟豆包 Ark（OpenAI 兼容模式）" },
  { key: "tokenrhythm", name: "TokenRhythm", baseUrl: "https://tokenrhythm.studio/v1", modelHint: "deepseek-v4-flash-0731", hint: "TokenRhythm 端点（本机默认）" },
];

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

/** 测试成功后的模型选择（点击填入该端点 model） */
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
          该端点未返回模型列表（可能不支持 /models），可直接在 Model 输入框手动填写。
        </p>
      )}
    </div>
  );
}

/** 端点卡片行：名称 / 默认标记 / base_url / model / key 状态 / 操作 */
function EndpointRow({
  ep,
  testing,
  testResult,
  onActivate,
  onEdit,
  onDelete,
  onTest,
  onPickModel,
  currentModel,
  onSetModel,
}: {
  ep: LlmEndpointDTO;
  testing: boolean;
  testResult: TestLLMResultDTO | null;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onPickModel: (m: string) => void;
  currentModel: string;
  onSetModel: (m: string) => void;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border px-3.5 py-3 transition-colors ${
        ep.isDefault
          ? "border-primary/30 bg-primary/[0.05]"
          : "border-white/10 bg-white/[0.02] hover:border-white/15"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-medium text-ink">{ep.name}</p>
            {ep.isDefault && (
              <Badge
                variant="outline"
                className="h-4 gap-0.5 border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary"
              >
                <Star className="size-2.5" /> 生效
              </Badge>
            )}
            {ep.keyUndecryptable && (
              <Badge
                variant="outline"
                className="h-4 gap-0.5 border-amber-400/30 bg-amber-500/10 px-1.5 text-[10px] text-amber-300"
                title="原 Key 无法解密（可能换机/换用户），请编辑重新填写"
              >
                <CircleAlert className="size-2.5" /> 需重填 Key
              </Badge>
            )}
          </div>
          <p className="truncate font-mono text-[11px] text-ink-3" title={ep.baseUrl}>
            {ep.baseUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!ep.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onActivate}
              className="h-6 gap-1 px-1.5 text-[11px] text-ink-2 hover:text-primary"
              title="设为当前生效端点"
            >
              <Star className="size-3" /> 生效
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-6 gap-1 px-1.5 text-[11px] text-ink-2 hover:text-ink"
            title="编辑端点"
          >
            <Pencil className="size-3" /> 编辑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-6 gap-1 px-1.5 text-[11px] text-ink-2 hover:text-red-300"
            title="删除端点"
          >
            <Trash2 className="size-3" /> 删除
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2">
        <span>
          model：<span className="font-mono text-ink">{ep.model || "未设置"}</span>
        </span>
        <span>
          api key：
          {ep.keyConfigured ? (
            <span className="font-mono text-emerald-300">{ep.keyMasked}</span>
          ) : (
            <span className="text-ink-3">未配置</span>
          )}
        </span>
      </div>

      {/* 该端点测试结果 / 模型选择 */}
      {testResult && (
        <div className="flex flex-col gap-1.5">
          <p
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${
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
              currentModel={currentModel}
              onPick={(m) => {
                onPickModel(m);
                onSetModel(m);
              }}
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={testing}
          className="h-6 gap-1 border-white/10 text-[11px]"
        >
          {testing ? <Loader2 className="size-3 animate-spin" /> : <PlugZap className="size-3" />}
          测试连接
        </Button>
      </div>
    </div>
  );
}

export function LlmProvider() {
  const [config, setConfig] = useState<LlmProviderConfigDTO | null>(null);
  const [endpoints, setEndpoints] = useState<LlmEndpointDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 新增 / 编辑表单
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", baseUrl: "", model: "", apiKey: "" });
  const [saving, setSaving] = useState(false);

  // 测试状态（按端点 id）
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testMap, setTestMap] = useState<Record<string, TestLLMResultDTO>>({});
  const [savedTip, setSavedTip] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const dto = await fetchLLMProviderConfig();
      setConfig(dto);
      setEndpoints(dto.endpoints);
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
        setEndpoints(dto.endpoints);
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

  function openCreate(template?: (typeof OFFICIAL_ENDPOINTS)[number]) {
    setEditingId(null);
    setForm(
      template
        ? { name: `${template.name} 官方`, baseUrl: template.baseUrl, model: template.modelHint, apiKey: "" }
        : { name: "", baseUrl: "", model: "", apiKey: "" }
    );
    setTestMap({});
    setFormOpen(true);
  }

  function openEdit(ep: LlmEndpointDTO) {
    setEditingId(ep.id);
    setForm({ name: ep.name, baseUrl: ep.baseUrl, model: ep.model, apiKey: "" });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.baseUrl.trim()) {
      setError("端点名称与 Base URL 不能为空");
      return;
    }
    setSaving(true);
    setError(null);
    setSavedTip(null);
    try {
      if (editingId) {
        await updateLLMEndpoint(editingId, {
          name: form.name.trim(),
          baseUrl: form.baseUrl.trim(),
          model: form.model.trim() || undefined,
          apiKey: form.apiKey.trim(),
        });
        setSavedTip("端点已更新");
      } else {
        await createLLMEndpoint({
          name: form.name.trim(),
          baseUrl: form.baseUrl.trim(),
          model: form.model.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
        });
        setSavedTip("端点已添加");
      }
      setFormOpen(false);
      setForm({ name: "", baseUrl: "", model: "", apiKey: "" });
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateLLMEndpoint(id);
      setSavedTip("已切换为当前生效端点");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("删除该端点？删除后无法恢复（不会修改任何本地文件）。")) return;
    try {
      await deleteLLMEndpoint(id);
      setSavedTip("端点已删除");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setError(null);
    try {
      const r = await testLLMEndpoint(id);
      setTestMap((m) => ({ ...m, [id]: r.result }));
    } catch (e) {
      setTestMap((m) => ({
        ...m,
        [id]: {
          ok: false,
          latencyMs: 0,
          model: "",
          source: "manual",
          error: e instanceof Error ? e.message : String(e),
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  async function handleClearAll() {
    if (!window.confirm("清除全部端点？将恢复自动发现（环境变量 / 本机 / 内置默认）。")) return;
    try {
      await clearLLMProviderConfig();
      setSavedTip("已恢复自动发现");
      setTestMap({});
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

  return (
    <Card className="border-white/10 bg-transparent">
      <CardHeader className="px-4 pt-4">
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Bot className="size-3.5 text-primary" /> AI Provider（LLM 端点）
          </span>
          <div className="flex items-center gap-1.5">
            {endpoints.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleClearAll()}
                className="h-6 gap-1 px-1.5 text-[11px] text-ink-2 hover:text-ink"
                title="清除全部端点，恢复自动发现"
              >
                <RotateCcw className="size-3" /> 清除全部
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreate()}
              className="h-6 gap-1 border-white/10 px-2 text-[11px]"
            >
              <Plus className="size-3" /> 添加端点
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 pb-4">
        {/* 当前生效配置 */}
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink-2">当前生效来源</p>
            <SourceBadge source={eff.source} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wide text-ink-3">base_url</p>
              <p className="truncate text-[13px] text-ink" title={eff.baseUrl}>
                {eff.baseUrl || "—"}
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
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

        {/* 端点列表 */}
        {endpoints.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-[11px] text-ink-2">端点列表（{endpoints.length}）</p>
            {endpoints.map((ep) => (
              <EndpointRow
                key={ep.id}
                ep={ep}
                testing={testingId === ep.id}
                testResult={testMap[ep.id] ?? null}
                onActivate={() => void handleActivate(ep.id)}
                onEdit={() => openEdit(ep)}
                onDelete={() => void handleDelete(ep.id)}
                onTest={() => void handleTest(ep.id)}
                onPickModel={(m) => {
                  setForm((f) => ({ ...f, model: m }));
                  void (async () => {
                    try {
                      await updateLLMEndpoint(ep.id, { model: m });
                      setSavedTip(`已选择并保存模型：${m}`);
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    }
                  })();
                }}
                currentModel={ep.model}
                onSetModel={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-[12px] text-ink-3">
            尚未添加端点。可从下方官方模板一键添加，或填写自定义端点。
          </div>
        )}

        {/* 新增 / 编辑表单 */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center justify-between text-[13px] font-medium text-ink"
          >
            <span className="flex items-center gap-1.5">
              {formOpen ? <ChevronDown className="size-3.5 text-ink-3" /> : <ChevronRight className="size-3.5 text-ink-3" />}
              {editingId ? "编辑端点" : "添加端点（官方一键填入，或自定义）"}
            </span>
          </button>

          {formOpen && (
            <div className="flex flex-col gap-3">
              {/* 厂商快捷模板 */}
              <div className="flex flex-wrap items-center gap-1.5">
                {OFFICIAL_ENDPOINTS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => openCreate(o)}
                    className={`h-7 rounded-lg border px-2.5 text-[12px] transition-colors ${
                      form.baseUrl.trim() === o.baseUrl
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
                  onClick={() =>
                    setForm({ name: "", baseUrl: "", model: "", apiKey: "" })
                  }
                  className={`h-7 rounded-lg border px-2.5 text-[12px] transition-colors ${
                    form.baseUrl.trim() !== "" &&
                    !OFFICIAL_ENDPOINTS.some((o) => o.baseUrl === form.baseUrl.trim())
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/[0.03] text-ink-2 hover:border-white/20 hover:text-ink"
                  }`}
                >
                  自定义
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-ink-2">端点名称</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="如：DeepSeek 官方 / 公司网关"
                    className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-ink-2">Base URL（OpenAI 兼容 /v1）</label>
                  <Input
                    value={form.baseUrl}
                    onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                    placeholder={eff.defaults.baseUrl}
                    className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-ink-2">Model（可测试连接后选择）</label>
                  <Input
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder={eff.defaults.model}
                    className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-ink-2">
                    API Key{editingId && "（留空则不修改）"}
                  </label>
                  <Input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                    placeholder={
                      editingId ? "留空保持原 Key；填写则更新（加密存储）" : "粘贴 API Key（加密存储，仅本机可解）"
                    }
                    autoComplete="off"
                    className="h-8 border-white/10 bg-white/[0.03] text-[13px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="h-8 gap-1.5 text-[12px]"
                >
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  {editingId ? "保存修改" : "添加端点"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setForm({ name: "", baseUrl: "", model: "", apiKey: "" });
                  }}
                  className="h-8 gap-1.5 text-[12px] text-ink-2 hover:text-ink"
                >
                  <X className="size-3" /> 取消
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 提示 / 错误 */}
        {savedTip && <p className="text-[12px] text-emerald-300">{savedTip}</p>}
        {error && (
          <p className="rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            {error}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-ink-3">
          安全说明：API Key 以 AES-256-GCM 加密保存（密钥由本机指纹派生、不落库），读取接口只回显掩码；
          换机器 / 换用户后旧 Key 无法解密，需重新填写。本地数据库位于 data/（已排除在 Git 之外）。
        </p>
      </CardContent>
    </Card>
  );
}
