/**
 * 展示格式化工具（无外部依赖，统一口径）
 */

/** 千分位数字 */
export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Tokens 缩写：1.2K / 3.4M */
export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

/** 百分比（0-1 → "86.4%"） */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** 时长：1.2 秒 / 3 分 12 秒 */
export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} 秒`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return seconds > 0 ? `${minutes} 分 ${seconds} 秒` : `${minutes} 分钟`;
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  const days = Math.floor(diff / 86_400_000);
  return days < 30 ? `${days} 天前` : new Date(iso).toLocaleDateString("zh-CN");
}

/** 完整日期时间：MM-DD HH:mm */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}
