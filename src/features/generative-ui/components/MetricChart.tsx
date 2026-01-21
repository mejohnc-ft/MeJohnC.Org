/**
 * MetricChart Component
 *
 * Data-bound chart visualization for metrics.
 * Integrates with the metrics feature for live data.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MetricChartProps, CentrexColor } from '../schemas';

const colorMap: Record<CentrexColor, { primary: string; gradient: string }> = {
  green: {
    primary: '#3dae2b',
    gradient: 'url(#gradient-green)',
  },
  blue: {
    primary: '#0071ce',
    gradient: 'url(#gradient-blue)',
  },
  orange: {
    primary: '#ff8300',
    gradient: 'url(#gradient-orange)',
  },
  red: {
    primary: '#e1251b',
    gradient: 'url(#gradient-red)',
  },
};

// Generate mock data for visualization
function generateMockData(timeRange: string): { x: number; y: number }[] {
  const points = {
    '1h': 12,
    '24h': 24,
    '7d': 7,
    '30d': 30,
    '90d': 12,
  }[timeRange] || 7;

  return Array.from({ length: points }, (_, i) => ({
    x: i,
    y: Math.random() * 80 + 20 + Math.sin(i * 0.5) * 20,
  }));
}

function createPath(data: { x: number; y: number }[], width: number, height: number, chartType: string): string {
  if (data.length === 0) return '';

  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const yRange = maxY - minY || 1;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((d.y - minY) / yRange) * chartHeight,
  }));

  if (chartType === 'bar') {
    const barWidth = chartWidth / data.length * 0.8;
    return points
      .map((p, i) => {
        const x = padding + (i / data.length) * chartWidth + (chartWidth / data.length) * 0.1;
        const barHeight = padding + chartHeight - p.y;
        return `M${x},${padding + chartHeight} L${x},${p.y} L${x + barWidth},${p.y} L${x + barWidth},${padding + chartHeight}`;
      })
      .join(' ');
  }

  const pathData = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');

  if (chartType === 'area') {
    return `${pathData} L${points[points.length - 1].x},${padding + chartHeight} L${points[0].x},${padding + chartHeight} Z`;
  }

  return pathData;
}

export function MetricChart({
  metricName,
  chartType = 'line',
  timeRange = '7d',
  title,
  color = 'green',
  showLegend = true,
}: MetricChartProps) {
  const data = useMemo(() => generateMockData(timeRange), [timeRange]);
  const colors = colorMap[color];

  const width = 600;
  const height = 200;
  const path = createPath(data, width, height, chartType);

  const latestValue = data[data.length - 1]?.y.toFixed(1) || '0';
  const previousValue = data[data.length - 2]?.y || 0;
  const change = ((parseFloat(latestValue) - previousValue) / previousValue * 100).toFixed(1);
  const isPositive = parseFloat(change) >= 0;

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-xl p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#e5e5e5]">
            {title || metricName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold" style={{ color: colors.primary }}>
              {latestValue}
            </span>
            <span
              className={cn(
                'text-sm px-2 py-0.5 rounded',
                isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}
            >
              {isPositive ? '+' : ''}{change}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#525252] uppercase">{timeRange}</span>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-40"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="gradient-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3dae2b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3dae2b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0071ce" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0071ce" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-orange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8300" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff8300" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradient-red" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e1251b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e1251b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={20}
            y1={20 + (height - 40) * ratio}
            x2={width - 20}
            y2={20 + (height - 40) * ratio}
            stroke="#262626"
            strokeDasharray="4 4"
          />
        ))}

        {/* Chart Path */}
        {chartType === 'area' && (
          <path d={path} fill={colors.gradient} />
        )}
        <path
          d={chartType === 'area' ? createPath(data, width, height, 'line') : path}
          fill={chartType === 'bar' ? colors.primary : 'none'}
          stroke={chartType === 'bar' ? 'none' : colors.primary}
          strokeWidth={chartType === 'bar' ? 0 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points for line/area */}
        {chartType !== 'bar' && data.map((d, i) => {
          const x = 20 + (i / (data.length - 1)) * (width - 40);
          const maxY = Math.max(...data.map((p) => p.y));
          const minY = Math.min(...data.map((p) => p.y));
          const yRange = maxY - minY || 1;
          const y = 20 + (height - 40) - ((d.y - minY) / yRange) * (height - 40);

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill={colors.primary}
              className="opacity-0 hover:opacity-100 transition-opacity"
            />
          );
        })}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#525252]">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors.primary }}
            />
            <span>{metricName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetricChart;
