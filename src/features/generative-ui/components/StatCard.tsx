/**
 * StatCard Component
 *
 * CentrexStyle stat card with gradient accent bar.
 * Used in generative dashboards for KPI display.
 *
 * This component uses CentrexStyle design tokens from src/lib/centrexstyle.ts
 * Colors are referenced via the CENTREX_COMPONENT_VARIANTS.statCard definitions.
 *
 * @see src/lib/centrexstyle.ts - Design tokens source
 * @see docs/centrexstyle-demo.html - Full specification
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  CENTREX_BRAND_COLORS,
  CENTREX_COMPONENT_VARIANTS,
  CENTREX_DARK_THEME,
} from '@/lib/centrexstyle';
import type { StatCardProps, CentrexColor } from '../schemas';

/**
 * Color map using CentrexStyle design tokens
 *
 * Note: Tailwind class values must be hardcoded for CSS purge to work.
 * These values are derived from centrexstyle.ts and kept in sync manually.
 * See CENTREX_COMPONENT_VARIANTS.statCard for the source of truth.
 *
 * If you need runtime-dynamic colors, use the inline style approach with
 * CENTREX_COMPONENT_VARIANTS.statCard[color].border/text
 */
const colorMap: Record<CentrexColor, {
  gradient: string;
  text: string;
  glow: string;
  // CSS values for inline styles (runtime dynamic)
  css: {
    borderGradient: string;
    textGradient: string;
    glowColor: string;
  };
}> = {
  green: {
    // CENTREX_BRAND_COLORS.primary.hex -> CENTREX_GRADIENT_COLORS.greenLight
    gradient: 'from-[#3dae2b] to-[#4ade80]',
    text: 'bg-gradient-to-br from-[#3dae2b] to-[#4ade80]',
    glow: 'rgba(61, 174, 43, 0.3)',
    css: {
      borderGradient: CENTREX_COMPONENT_VARIANTS.statCard.green.border,
      textGradient: CENTREX_COMPONENT_VARIANTS.statCard.green.text,
      glowColor: `rgba(${CENTREX_BRAND_COLORS.primary.rgbString}, 0.3)`,
    },
  },
  blue: {
    // CENTREX_BRAND_COLORS.secondary.hex -> CENTREX_GRADIENT_COLORS.blueLight
    gradient: 'from-[#0071ce] to-[#3b82f6]',
    text: 'bg-gradient-to-br from-[#0071ce] to-[#3b82f6]',
    glow: 'rgba(0, 113, 206, 0.3)',
    css: {
      borderGradient: CENTREX_COMPONENT_VARIANTS.statCard.blue.border,
      textGradient: CENTREX_COMPONENT_VARIANTS.statCard.blue.text,
      glowColor: `rgba(${CENTREX_BRAND_COLORS.secondary.rgbString}, 0.3)`,
    },
  },
  orange: {
    // CENTREX_BRAND_COLORS.tertiary.hex -> CENTREX_GRADIENT_COLORS.orangeLight
    gradient: 'from-[#ff8300] to-[#fb923c]',
    text: 'bg-gradient-to-br from-[#ff8300] to-[#fb923c]',
    glow: 'rgba(255, 131, 0, 0.3)',
    css: {
      borderGradient: CENTREX_COMPONENT_VARIANTS.statCard.orange.border,
      textGradient: CENTREX_COMPONENT_VARIANTS.statCard.orange.text,
      glowColor: `rgba(${CENTREX_BRAND_COLORS.tertiary.rgbString}, 0.3)`,
    },
  },
  red: {
    // CENTREX_BRAND_COLORS.accent.hex -> CENTREX_GRADIENT_COLORS.redLight
    gradient: 'from-[#e1251b] to-[#f87171]',
    text: 'bg-gradient-to-br from-[#e1251b] to-[#f87171]',
    glow: 'rgba(225, 37, 27, 0.3)',
    css: {
      borderGradient: CENTREX_COMPONENT_VARIANTS.statCard.red.border,
      textGradient: CENTREX_COMPONENT_VARIANTS.statCard.red.text,
      glowColor: `rgba(${CENTREX_BRAND_COLORS.accent.rgbString}, 0.3)`,
    },
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

  return (
    <div
      className="relative rounded-2xl p-8 text-center overflow-hidden transition-transform hover:-translate-y-1"
      style={{
        backgroundColor: CENTREX_DARK_THEME.bgCard,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: CENTREX_DARK_THEME.border,
      }}
    >
      {/* Gradient accent bar - uses CSS variable for runtime theming */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: colors.css.borderGradient }}
      />

      {/* Value with gradient text */}
      <div
        className="text-5xl font-extrabold leading-none mb-2"
        style={{
          background: colors.css.textGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value}
      </div>

      {/* Label - uses CentrexStyle text color */}
      <div style={{ color: CENTREX_DARK_THEME.textSecondary }} className="text-sm">
        {label}
      </div>

      {/* Trend indicator */}
      {trend && (
        <div
          className="flex items-center justify-center gap-1 mt-3 text-sm"
          style={{
            color: trend === 'up'
              ? CENTREX_BRAND_COLORS.primary.hex
              : trend === 'down'
              ? CENTREX_BRAND_COLORS.accent.hex
              : CENTREX_DARK_THEME.textMuted,
          }}
        >
          <TrendIcon className="w-4 h-4" />
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  );
}

export default StatCard;
