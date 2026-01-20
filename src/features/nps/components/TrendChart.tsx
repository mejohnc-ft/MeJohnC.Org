/**
 * Trend Chart Component
 *
 * Displays NPS score trends over time.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import type { NPSTrend } from '../schemas';

interface TrendChartProps {
  trends: NPSTrend[];
  period?: 'day' | 'week' | 'month';
}

export function TrendChart({ trends, period = 'week' }: TrendChartProps) {
  if (trends.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No trend data available yet</p>
      </div>
    );
  }

  const maxScore = Math.max(...trends.map(t => t.score), 100);
  const minScore = Math.min(...trends.map(t => t.score), -100);
  const range = maxScore - minScore;

  const getYPosition = (score: number) => {
    const normalized = (score - minScore) / range;
    return 100 - (normalized * 80); // 80% of height for chart area, 20% for padding
  };

  const getNPSColor = (score: number) => {
    if (score >= 50) return '#10b981'; // green
    if (score >= 0) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">NPS Trend</h3>
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">Period: {period}</span>
        </div>
      </div>

      <div className="relative h-64 w-full">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2,2" />
          <line x1="0" y1="70" x2="100" y2="70" stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" strokeOpacity="0.1" />

          {/* Trend line */}
          <polyline
            points={trends.map((trend, i) => {
              const x = (i / (trends.length - 1)) * 100;
              const y = getYPosition(trend.score);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {trends.map((trend, i) => {
            const x = (i / (trends.length - 1)) * 100;
            const y = getYPosition(trend.score);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1"
                fill={getNPSColor(trend.score)}
              />
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {trends.map((trend, i) => (
                <stop
                  key={i}
                  offset={`${(i / (trends.length - 1)) * 100}%`}
                  stopColor={getNPSColor(trend.score)}
                />
              ))}
            </linearGradient>
          </defs>
        </svg>

        {/* Labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
          <span>{maxScore.toFixed(0)}</span>
          <span>0</span>
          <span>{minScore.toFixed(0)}</span>
        </div>
      </div>

      {/* Period labels */}
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {trends.map((trend, i) => {
          if (i === 0 || i === trends.length - 1 || i === Math.floor(trends.length / 2)) {
            return <span key={i}>{trend.period}</span>;
          }
          return <span key={i}></span>;
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">Excellent (50+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-muted-foreground">Good (0-49)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-muted-foreground">Needs Work (&lt;0)</span>
        </div>
      </div>
    </div>
  );
}
