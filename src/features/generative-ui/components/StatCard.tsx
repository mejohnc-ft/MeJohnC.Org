/**
 * StatCard Component
 *
 * CentrexStyle stat card with gradient accent bar.
 * Used in generative dashboards for KPI display.
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatCardProps } from '../schemas';

const colorMap = {
  green: {
    gradient: 'from-[#3dae2b] to-[#4ade80]',
    text: 'bg-gradient-to-br from-[#3dae2b] to-[#4ade80]',
    glow: 'rgba(61, 174, 43, 0.3)',
  },
  blue: {
    gradient: 'from-[#0071ce] to-[#3b82f6]',
    text: 'bg-gradient-to-br from-[#0071ce] to-[#3b82f6]',
    glow: 'rgba(0, 113, 206, 0.3)',
  },
  orange: {
    gradient: 'from-[#ff8300] to-[#fb923c]',
    text: 'bg-gradient-to-br from-[#ff8300] to-[#fb923c]',
    glow: 'rgba(255, 131, 0, 0.3)',
  },
  red: {
    gradient: 'from-[#e1251b] to-[#f87171]',
    text: 'bg-gradient-to-br from-[#e1251b] to-[#f87171]',
    glow: 'rgba(225, 37, 27, 0.3)',
  },
};

export function StatCard({
  value,
  label,
  color = 'green',
  trend,
  trendValue,
}: StatCardProps) {
  const colors = colorMap[color];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="relative bg-[#121212] border border-[#262626] rounded-2xl p-8 text-center overflow-hidden transition-transform hover:-translate-y-1">
      {/* Gradient accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', colors.gradient)} />

      {/* Value with gradient text */}
      <div
        className={cn(
          'text-5xl font-extrabold leading-none mb-2 bg-clip-text text-transparent',
          colors.text
        )}
      >
        {value}
      </div>

      {/* Label */}
      <div className="text-sm text-[#a3a3a3]">{label}</div>

      {/* Trend indicator */}
      {trend && (
        <div className={cn('flex items-center justify-center gap-1 mt-3 text-sm', trendColor)}>
          <TrendIcon className="w-4 h-4" />
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
