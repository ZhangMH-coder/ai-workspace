"use client";

/**
 * 轻量自研 SVG 趋势图（Phase 2）
 *
 * 无第三方图表依赖：柱状 = 每日运行量，折线 = 每日成功率（右轴）。
 * 静态可读 + hover 增强（桌面端显示当日数值提示）。
 */
import { useState } from "react";

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
  const [hovered, setHovered] = useState<number | null>(null);

  const maxRuns = Math.max(1, ...data.map((d) => d.runs));
  const barW = Math.max(3, Math.min(14, (PLOT_W / Math.max(1, data.length)) * 0.55));

  const x = (i: number) =>
    PAD.left + (PLOT_W / Math.max(1, data.length)) * (i + 0.5);
  const barTop = (runs: number) => PAD.top + PLOT_H - (runs / maxRuns) * PLOT_H;
  const lineY = (rate: number) => PAD.top + PLOT_H - rate * PLOT_H;

  const gridLines = [0.25, 0.5, 0.75, 1].map((f) => PAD.top + PLOT_H - f * PLOT_H);

  const path = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${lineY(d.successRate).toFixed(1)}`)
    .join(" ");

  const active = hovered !== null ? data[hovered] : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`运行趋势：${rangeLabel}`}
        onMouseLeave={() => setHovered(null)}
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
              <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" className="fill-ink-3/80" fontSize="10">
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {/* 柱状（每日运行量） */}
        {data.map((d, i) => (
          <g
            key={d.date}
            onMouseEnter={() => setHovered(i)}
            className="cursor-pointer"
          >
            <rect
              x={x(i) - barW / 2}
              y={barTop(d.runs)}
              width={barW}
              height={Math.max(1, PAD.top + PLOT_H - barTop(d.runs))}
              rx={2}
              fill={hovered === i ? "rgba(139,92,246,0.85)" : "rgba(139,92,246,0.38)"}
            />
          </g>
        ))}

        {/* 成功率折线（右轴） */}
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={lineY(d.successRate)} r="2.4" fill="#38bdf8" />
        ))}

        {/* X 轴日期标签（抽样展示） */}
        {data.map((d, i) => {
          const showLabel =
            data.length <= 8 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 8) === 0;
          if (!showLabel) return null;
          return (
            <text
              key={d.date}
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              className="fill-ink-3/80"
              fontSize="10"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* hover 提示（静态可读性增强，不承担核心结论） */}
      {active ? (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px]">
          <span className="text-ink-2">{active.label}</span>
          <span className="flex items-center gap-3 text-ink">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand/70 align-middle" />
              运行 {active.runs} 次
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#38bdf8] align-middle" />
              成功率 {Math.round(active.successRate * 100)}%
            </span>
          </span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-[12px] text-ink-3">
          <span>柱：每日运行量</span>
          <span className="flex items-center gap-3">
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand/70 align-middle" />
              运行量
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#38bdf8] align-middle" />
              成功率
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
