/**
 * Widget Card Component
 *
 * Displays a single metric widget with icon, value, and optional trend.
 * Reusable component for metrics dashboard.
 */

'use client';

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WidgetCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  formatValue?: (value: number | string) => string;
  icon?: LucideIcon;
  iconColor?: string;
  showTrend?: boolean;
  trendLabel?: string;
  className?: string;
}

export function WidgetCard({
  title,
  value,
  previousValue,
  formatValue = (v) => (typeof v === 'number' ? v.toLocaleString() : v),
  icon: Icon,
  iconColor = 'text-primary',
  showTrend = true,
  trendLabel = 'vs previous period',
  className,
}: WidgetCardProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const hasTrend = showTrend && previousValue !== undefined && !isNaN(numericValue);

  let trendPercent = 0;
  let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';

  if (hasTrend && previousValue !== 0) {
    trendPercent = ((numericValue - previousValue) / previousValue) * 100;
    trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral';
  }

  const TrendIcon =
    trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

  const trendColor =
    trendDirection === 'up'
      ? 'text-green-500'
      : trendDirection === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{formatValue(value)}</p>
          {hasTrend && (
            <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span>
                {trendPercent > 0 ? '+' : ''}
                {trendPercent.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('p-3 rounded-full bg-muted', iconColor)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </Card>
  );
}
