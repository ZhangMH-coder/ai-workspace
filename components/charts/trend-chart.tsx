"use client";

/**
 * 轻量自研 SVG 趋势图（Phase 3 增强）
 *
 * 无第三方图表依赖：柱状 = 每日运行量，折线 = 每日成功率（右轴）。
 * - 静态可读：默认聚焦最近一天，详情条始终可见
 * - 交互：桌面 hover / 触屏点击切换日期，键盘 ←/→ 可切换（容器可聚焦）
 * - 空状态：时间范围内无任何运行记录时展示空态引导
 * - 时间范围切换时由父级通过 key 重挂载，重置聚焦到最近一天
 */
import { useState } from "react";
import { BarChart3 } from "lucide-react";

import type { DailyStat } from "@/stores/workspace";

const W = 640;
const H = 240;
const PAD = { top: 18, right: 14, bottom: 26, left: 34 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export function TrendChart({
  data,
  rangeLabel,
}: {
  data: DailyStat[];
  rangeLabel: string;
}) {
  const [hovered, setHovered] = useState<number>(data.length - 1);

  const totalRuns = data.reduce((sum, d) => sum + d.runs, 0);

  if (totalRuns === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center">
        <BarChart3 className="h-5 w-5 text-ink-3" />
        <p className="text-[13px] font-medium text-ink-2">
          {rangeLabel}暂无运行数据
        </p>
        <p className="text-[12px] text-ink-3">
          前往「Agents」触发一次运行后，趋势会出现在这里
        </p>
      </div>
    );
  }

  const maxRuns = Math.max(1, ...data.map((d) => d.runs));
  const barW = Math.max(3, Math.min(14, (PLOT_W / data.length) * 0.55));

  const x = (i: number) => PAD.left + (PLOT_W / data.length) * (i + 0.5);
  const barTop = (runs: number) => PAD.top + PLOT_H - (runs / maxRuns) * PLOT_H;
  const lineY = (rate: number) => PAD.top + PLOT_H - rate * PLOT_H;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => PAD.top + PLOT_H - f * PLOT_H);

  const path = data
    .map((d, i) =>
      `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${lineY(d.successRate).toFixed(1)}`
    )
    .join(" ");

  const active = data[hovered];

  function moveHover(delta: number) {
    setHovered((current) =>
      Math.min(data.length - 1, Math.max(0, current + delta))
    );
  }

  return (
    <div>
      <div
        role="group"
        aria-label={`运行趋势图：${rangeLabel}共 ${totalRuns} 次运行。使用左右方向键查看每日数据。`}
        tabIndex={0}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveHover(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            moveHover(1);
          }
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-hidden="true"
          onMouseLeave={() => setHovered(data.length - 1)}
        >
          {/* 网格与左轴（运行量） */}
          {gridLines.map((y, idx) => {
            const value = maxRuns * (1 - (idx + 1) / 4);
            return (
              <g key={idx}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 5"
                />
                <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize="10" className="fill-ink-3">
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* 柱状（每日运行量，仅视觉） */}
          {data.map((d, i) => (
            <g key={d.date}>
              <rect
                x={x(i) - barW / 2}
                y={barTop(d.runs)}
                width={barW}
                height={Math.max(1, PAD.top + PLOT_H - barTop(d.runs))}
                rx={2}
                fill={
                  hovered === i
                    ? "rgba(139,92,246,0.85)"
                    : "rgba(139,92,246,0.38)"
                }
              />
              <title>{`${d.label}：运行 ${d.runs} 次（成功 ${d.succeeded}，失败 ${d.failed}）`}</title>
            </g>
          ))}

          {/* 成功率折线（右轴） */}
          <path
            d={path}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {data.map((d, i) => (
            <circle
              key={d.date}
              cx={x(i)}
              cy={lineY(d.successRate)}
              r={hovered === i ? 4 : 2.4}
              fill="#38bdf8"
              stroke={hovered === i ? "rgba(56,189,248,0.25)" : "none"}
              strokeWidth="4"
            />
          ))}

          {/* X 轴日期标签（抽样展示） */}
          {data.map((d, i) => {
            const showLabel =
              data.length <= 8 ||
              i === 0 ||
              i === data.length - 1 ||
              i % Math.ceil(data.length / 8) === 0;
            if (!showLabel) return null;
            return (
              <text
                key={d.date}
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                className="fill-ink-3"
              >
                {d.label}
              </text>
            );
          })}

          {/* 透明命中区（置于最上层，整列可点，扩大触控范围） */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.date}`}
              x={x(i) - (PLOT_W / data.length) / 2}
              y={PAD.top}
              width={PLOT_W / data.length}
              height={PLOT_H}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => setHovered(i)}
              onMouseEnter={() => setHovered(i)}
            />
          ))}
        </svg>
      </div>

      {/* 详情条：始终显示当前聚焦日期（静态可读 + 键盘/触屏可达） */}
      {active ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px]">
          <span className="font-medium text-ink">{active.label}</span>
          <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-ink">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand/70 align-middle" />
              运行 {active.runs}
            </span>
            <span className="text-ink-2">成功 {active.succeeded}</span>
            <span className={active.failed > 0 ? "text-danger" : "text-ink-2"}>
              失败 {active.failed}
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#38bdf8] align-middle" />
              成功率 {Math.round(active.successRate * 100)}%
            </span>
          </span>
        </div>
      ) : null}

      <div className="mt-1.5 flex items-center justify-between px-3 text-[11.5px] text-ink-3">
        <span>柱：每日运行量 · 线：成功率</span>
        <span>可用 ← → 键查看每日</span>
      </div>
    </div>
  );
}
