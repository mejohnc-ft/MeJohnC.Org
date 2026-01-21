/**
 * CentrexStyle Design System
 *
 * The official Centrex brand design tokens and style definitions.
 * Source: https://centrexit.com/styleguide/
 * Reference: docs/centrexstyle-demo.html
 *
 * This module provides TypeScript constants, CSS variables, and design tokens
 * for consistent brand implementation across the application.
 */

// ============================================
// BRAND COLORS - Official Palette
// ============================================

/**
 * Official Centrex brand colors with PMS (Pantone) references
 */
export const CENTREX_BRAND_COLORS = {
  primary: {
    name: 'Primary Green',
    hex: '#3dae2b',
    rgb: { r: 61, g: 174, b: 43 },
    rgbString: '61, 174, 43',
    pms: 'PMS 361 C',
    cssVar: '--centrex-primary',
    usage: 'Primary brand color. Use for CTAs, active states, and key highlights.',
  },
  secondary: {
    name: 'Secondary Blue',
    hex: '#0071ce',
    rgb: { r: 0, g: 113, b: 206 },
    rgbString: '0, 113, 206',
    pms: 'PMS 285 C',
    cssVar: '--centrex-secondary',
    usage: 'Secondary accent. Use for links, informational elements, and data visualizations.',
  },
  tertiary: {
    name: 'Tertiary Orange',
    hex: '#ff8300',
    rgb: { r: 255, g: 131, b: 0 },
    rgbString: '255, 131, 0',
    pms: 'PMS 151 C',
    cssVar: '--centrex-tertiary',
    usage: 'Tertiary accent. Use for warnings, alerts, and attention-grabbing elements.',
  },
  accent: {
    name: 'Accent Red',
    hex: '#e1251b',
    rgb: { r: 225, g: 37, b: 27 },
    rgbString: '225, 37, 27',
    pms: 'PMS 1795 C',
    cssVar: '--centrex-accent',
    usage: 'Accent color. Use sparingly for errors, critical alerts, and destructive actions.',
  },
} as const;

/**
 * Extended color variations for gradients
 */
export const CENTREX_GRADIENT_COLORS = {
  greenLight: '#4ade80',
  blueLight: '#3b82f6',
  orangeLight: '#fb923c',
  redLight: '#f87171',
} as const;

// ============================================
// UI THEME COLORS
// ============================================

/**
 * Dark theme UI colors
 */
export const CENTREX_DARK_THEME = {
  bgBody: '#050505',
  bgNav: 'rgba(5, 5, 5, 0.85)',
  bgCard: '#121212',
  bgPanel: '#1a1a1a',
  bgInput: '#262626',
  textPrimary: '#e5e5e5',
  textSecondary: '#a3a3a3',
  textMuted: '#525252',
  border: '#262626',
} as const;

/**
 * Light theme UI colors
 */
export const CENTREX_LIGHT_THEME = {
  bgBody: '#f8fafc',
  bgNav: 'rgba(255, 255, 255, 0.9)',
  bgCard: '#ffffff',
  bgPanel: '#f1f5f9',
  bgInput: '#e2e8f0',
  textPrimary: '#171717',
  textSecondary: '#525252',
  textMuted: '#a3a3a3',
  border: '#e5e5e5',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

/**
 * Official Centrex typography tokens
 */
export const CENTREX_TYPOGRAPHY = {
  fonts: {
    heading: {
      family: 'GilmerBold',
      fallback: "'Segoe UI', system-ui, sans-serif",
      cssVar: '--font-heading',
    },
    body: {
      family: 'Hind',
      fallback: "'Segoe UI', system-ui, sans-serif",
      cssVar: '--font-body',
    },
    mono: {
      family: 'Consolas',
      fallback: 'monospace',
      cssVar: '--font-mono',
    },
  },
  sizes: {
    normal: { value: 16, unit: 'px', name: 'Normal' },
    medium: { value: 20, unit: 'px', name: 'Medium' },
    large: { value: 36, unit: 'px', name: 'Large' },
    xlarge: { value: 42, unit: 'px', name: 'Extra Large' },
    xxlarge: { value: 48, unit: 'px', name: 'Heading 1' },
    xxxlarge: { value: 72, unit: 'px', name: 'Display' },
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

// ============================================
// SHADOWS
// ============================================

/**
 * Official Centrex shadow tokens
 */
export const CENTREX_SHADOWS = {
  natural: {
    name: 'Natural',
    value: '6px 6px 9px rgba(0, 0, 0, 0.2)',
    usage: 'Subtle depth for cards and panels',
  },
  deep: {
    name: 'Deep',
    value: '12px 12px 50px rgba(0, 0, 0, 0.4)',
    usage: 'Strong depth for modals and overlays',
  },
  crisp: {
    name: 'Crisp',
    value: '6px 6px 0px rgba(0, 0, 0, 1)',
    usage: 'Hard shadow for retro/bold aesthetic',
  },
  card: {
    name: 'Card',
    value: '0 20px 50px -12px rgba(0, 0, 0, 0.9)',
    usage: 'Standard card shadow in dark theme',
  },
  glow: {
    name: 'Primary Glow',
    value: '0 4px 12px rgba(61, 174, 43, 0.3)',
    usage: 'Glow effect for primary elements',
  },
} as const;

// ============================================
// SPACING
// ============================================

/**
 * Centrex spacing scale
 */
export const CENTREX_SPACING = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16, // --space-40 = 1rem
  '5': 20,
  '6': 24, // --space-50 = 1.5rem
  '8': 32,
  '9': 36, // --space-60 = 2.25rem
  '10': 40,
  '12': 48,
  '16': 64,
  '20': 80,
  '24': 96,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

/**
 * Centrex border radius tokens
 */
export const CENTREX_RADII = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

// ============================================
// COMPONENT STYLES
// ============================================

/**
 * Pre-defined component color variants
 */
export const CENTREX_COMPONENT_VARIANTS = {
  statCard: {
    green: {
      border: 'linear-gradient(90deg, #3dae2b, #4ade80)',
      text: 'linear-gradient(135deg, #3dae2b, #4ade80)',
    },
    blue: {
      border: 'linear-gradient(90deg, #0071ce, #3b82f6)',
      text: 'linear-gradient(135deg, #0071ce, #3b82f6)',
    },
    orange: {
      border: 'linear-gradient(90deg, #ff8300, #fb923c)',
      text: 'linear-gradient(135deg, #ff8300, #fb923c)',
    },
    red: {
      border: 'linear-gradient(90deg, #e1251b, #f87171)',
      text: 'linear-gradient(135deg, #e1251b, #f87171)',
    },
  },
  button: {
    primary: {
      bg: '#3dae2b',
      hover: '#2d8a1f',
      text: '#ffffff',
    },
    secondary: {
      bg: '#0071ce',
      hover: '#005ba6',
      text: '#ffffff',
    },
    warning: {
      bg: '#ff8300',
      hover: '#e67600',
      text: '#000000',
    },
    danger: {
      bg: '#e1251b',
      hover: '#c41f15',
      text: '#ffffff',
    },
  },
} as const;

// ============================================
// CSS VARIABLES STRING
// ============================================

/**
 * Generate CSS variables string for injection
 */
export function generateCentrexCSSVariables(): string {
  return `
:root {
  /* Brand Colors - Primary Palette (Official Styleguide) */
  --centrex-primary: ${CENTREX_BRAND_COLORS.primary.hex};
  --centrex-secondary: ${CENTREX_BRAND_COLORS.secondary.hex};
  --centrex-tertiary: ${CENTREX_BRAND_COLORS.tertiary.hex};
  --centrex-accent: ${CENTREX_BRAND_COLORS.accent.hex};

  /* RGB Values for Alpha Compositing */
  --centrex-primary-rgb: ${CENTREX_BRAND_COLORS.primary.rgbString};
  --centrex-secondary-rgb: ${CENTREX_BRAND_COLORS.secondary.rgbString};
  --centrex-tertiary-rgb: ${CENTREX_BRAND_COLORS.tertiary.rgbString};
  --centrex-accent-rgb: ${CENTREX_BRAND_COLORS.accent.rgbString};

  /* Legacy aliases for backwards compatibility */
  --brand-green: var(--centrex-primary);
  --brand-blue: var(--centrex-secondary);
  --brand-orange: var(--centrex-tertiary);
  --brand-red: var(--centrex-accent);

  /* Typography */
  --font-heading: '${CENTREX_TYPOGRAPHY.fonts.heading.family}', ${CENTREX_TYPOGRAPHY.fonts.heading.fallback};
  --font-body: '${CENTREX_TYPOGRAPHY.fonts.body.family}', ${CENTREX_TYPOGRAPHY.fonts.body.fallback};
  --font-mono: '${CENTREX_TYPOGRAPHY.fonts.mono.family}', ${CENTREX_TYPOGRAPHY.fonts.mono.fallback};

  /* Font Sizes */
  --size-normal: ${CENTREX_TYPOGRAPHY.sizes.normal.value}px;
  --size-medium: ${CENTREX_TYPOGRAPHY.sizes.medium.value}px;
  --size-large: ${CENTREX_TYPOGRAPHY.sizes.large.value}px;
  --size-xlarge: ${CENTREX_TYPOGRAPHY.sizes.xlarge.value}px;

  /* Shadows */
  --shadow-natural: ${CENTREX_SHADOWS.natural.value};
  --shadow-deep: ${CENTREX_SHADOWS.deep.value};
  --shadow-crisp: ${CENTREX_SHADOWS.crisp.value};
  --shadow-card: ${CENTREX_SHADOWS.card.value};

  /* Spacing Scale */
  --space-40: 1rem;
  --space-50: 1.5rem;
  --space-60: 2.25rem;

  /* Computed Theme Values */
  --primary: var(--centrex-primary);
  --primary-glow: rgba(var(--centrex-primary-rgb), 0.3);
  --primary-dim: rgba(var(--centrex-primary-rgb), 0.1);
  --gradient-1: linear-gradient(135deg, var(--centrex-primary) 0%, #3cae49 100%);
}

/* Dark Theme (default) */
[data-theme="dark"], .dark {
  --bg-body: ${CENTREX_DARK_THEME.bgBody};
  --bg-nav: ${CENTREX_DARK_THEME.bgNav};
  --bg-card: ${CENTREX_DARK_THEME.bgCard};
  --bg-panel: ${CENTREX_DARK_THEME.bgPanel};
  --bg-input: ${CENTREX_DARK_THEME.bgInput};
  --text-primary: ${CENTREX_DARK_THEME.textPrimary};
  --text-secondary: ${CENTREX_DARK_THEME.textSecondary};
  --text-muted: ${CENTREX_DARK_THEME.textMuted};
  --border: ${CENTREX_DARK_THEME.border};
}

/* Light Theme */
[data-theme="light"], .light {
  --bg-body: ${CENTREX_LIGHT_THEME.bgBody};
  --bg-nav: ${CENTREX_LIGHT_THEME.bgNav};
  --bg-card: ${CENTREX_LIGHT_THEME.bgCard};
  --bg-panel: ${CENTREX_LIGHT_THEME.bgPanel};
  --bg-input: ${CENTREX_LIGHT_THEME.bgInput};
  --text-primary: ${CENTREX_LIGHT_THEME.textPrimary};
  --text-secondary: ${CENTREX_LIGHT_THEME.textSecondary};
  --text-muted: ${CENTREX_LIGHT_THEME.textMuted};
  --border: ${CENTREX_LIGHT_THEME.border};
}
`.trim();
}

// ============================================
// DESIGN TOKENS EXPORT
// ============================================

import type { DesignTokens, ColorToken, TypographyToken, SpacingToken, ShadowToken, RadiusToken } from '@/features/style-guide/schemas';

/**
 * Generate CentrexStyle design tokens in the standard DesignTokens format
 * Compatible with the style guide system
 */
export function generateCentrexDesignTokens(): DesignTokens {
  const colors: ColorToken[] = [
    // Primary palette
    {
      name: 'Centrex Primary (Green)',
      value: CENTREX_BRAND_COLORS.primary.hex,
      rgba: { ...CENTREX_BRAND_COLORS.primary.rgb, a: 1 },
      category: 'primary',
    },
    {
      name: 'Centrex Primary Light',
      value: CENTREX_GRADIENT_COLORS.greenLight,
      rgba: { r: 74, g: 222, b: 128, a: 1 },
      category: 'primary',
    },
    // Secondary palette
    {
      name: 'Centrex Secondary (Blue)',
      value: CENTREX_BRAND_COLORS.secondary.hex,
      rgba: { ...CENTREX_BRAND_COLORS.secondary.rgb, a: 1 },
      category: 'secondary',
    },
    {
      name: 'Centrex Secondary Light',
      value: CENTREX_GRADIENT_COLORS.blueLight,
      rgba: { r: 59, g: 130, b: 246, a: 1 },
      category: 'secondary',
    },
    // Accent palette
    {
      name: 'Centrex Tertiary (Orange)',
      value: CENTREX_BRAND_COLORS.tertiary.hex,
      rgba: { ...CENTREX_BRAND_COLORS.tertiary.rgb, a: 1 },
      category: 'accent',
    },
    {
      name: 'Centrex Tertiary Light',
      value: CENTREX_GRADIENT_COLORS.orangeLight,
      rgba: { r: 251, g: 146, b: 60, a: 1 },
      category: 'accent',
    },
    // Semantic - Warning/Error
    {
      name: 'Centrex Accent (Red)',
      value: CENTREX_BRAND_COLORS.accent.hex,
      rgba: { ...CENTREX_BRAND_COLORS.accent.rgb, a: 1 },
      category: 'semantic',
    },
    {
      name: 'Centrex Accent Light',
      value: CENTREX_GRADIENT_COLORS.redLight,
      rgba: { r: 248, g: 113, b: 113, a: 1 },
      category: 'semantic',
    },
    // Neutral/Background (Dark theme)
    {
      name: 'Background Body',
      value: CENTREX_DARK_THEME.bgBody,
      rgba: { r: 5, g: 5, b: 5, a: 1 },
      category: 'background',
    },
    {
      name: 'Background Card',
      value: CENTREX_DARK_THEME.bgCard,
      rgba: { r: 18, g: 18, b: 18, a: 1 },
      category: 'background',
    },
    {
      name: 'Background Panel',
      value: CENTREX_DARK_THEME.bgPanel,
      rgba: { r: 26, g: 26, b: 26, a: 1 },
      category: 'background',
    },
    {
      name: 'Background Input',
      value: CENTREX_DARK_THEME.bgInput,
      rgba: { r: 38, g: 38, b: 38, a: 1 },
      category: 'background',
    },
    // Foreground/Text
    {
      name: 'Text Primary',
      value: CENTREX_DARK_THEME.textPrimary,
      rgba: { r: 229, g: 229, b: 229, a: 1 },
      category: 'foreground',
    },
    {
      name: 'Text Secondary',
      value: CENTREX_DARK_THEME.textSecondary,
      rgba: { r: 163, g: 163, b: 163, a: 1 },
      category: 'foreground',
    },
    {
      name: 'Text Muted',
      value: CENTREX_DARK_THEME.textMuted,
      rgba: { r: 82, g: 82, b: 82, a: 1 },
      category: 'foreground',
    },
    // Border
    {
      name: 'Border',
      value: CENTREX_DARK_THEME.border,
      rgba: { r: 38, g: 38, b: 38, a: 1 },
      category: 'border',
    },
  ];

  const typography: TypographyToken[] = [
    {
      name: 'Display',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.heading.family,
      fontSize: 72,
      fontWeight: CENTREX_TYPOGRAPHY.weights.bold,
      lineHeight: 80,
      letterSpacing: -1,
    },
    {
      name: 'Heading 1',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.heading.family,
      fontSize: 48,
      fontWeight: CENTREX_TYPOGRAPHY.weights.bold,
      lineHeight: 56,
      letterSpacing: -0.5,
    },
    {
      name: 'Heading 2',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.heading.family,
      fontSize: 36,
      fontWeight: CENTREX_TYPOGRAPHY.weights.bold,
      lineHeight: 44,
      letterSpacing: -0.25,
    },
    {
      name: 'Heading 3',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.heading.family,
      fontSize: 24,
      fontWeight: CENTREX_TYPOGRAPHY.weights.semibold,
      lineHeight: 32,
      letterSpacing: 0,
    },
    {
      name: 'Body Large',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.body.family,
      fontSize: 20,
      fontWeight: CENTREX_TYPOGRAPHY.weights.regular,
      lineHeight: 28,
      letterSpacing: 0,
    },
    {
      name: 'Body',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.body.family,
      fontSize: 16,
      fontWeight: CENTREX_TYPOGRAPHY.weights.regular,
      lineHeight: 24,
      letterSpacing: 0,
    },
    {
      name: 'Body Small',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.body.family,
      fontSize: 14,
      fontWeight: CENTREX_TYPOGRAPHY.weights.regular,
      lineHeight: 20,
      letterSpacing: 0,
    },
    {
      name: 'Caption',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.body.family,
      fontSize: 12,
      fontWeight: CENTREX_TYPOGRAPHY.weights.regular,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
    {
      name: 'Code',
      fontFamily: CENTREX_TYPOGRAPHY.fonts.mono.family,
      fontSize: 14,
      fontWeight: CENTREX_TYPOGRAPHY.weights.regular,
      lineHeight: 20,
      letterSpacing: 0,
    },
  ];

  const spacing: SpacingToken[] = Object.entries(CENTREX_SPACING).map(([name, value]) => ({
    name: `spacing-${name}`,
    value,
    unit: 'px' as const,
  }));

  const shadows: ShadowToken[] = Object.entries(CENTREX_SHADOWS).map(([, shadow]) => ({
    name: shadow.name,
    value: shadow.value,
  }));

  const radii: RadiusToken[] = Object.entries(CENTREX_RADII).map(([name, value]) => ({
    name,
    value,
    unit: 'px' as const,
  }));

  return {
    colors,
    typography,
    spacing,
    shadows,
    radii,
    metadata: {
      source: 'custom' as const,
      fileKey: 'centrexstyle',
      fileName: 'CentrexStyle Design System',
      lastModified: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
    },
  };
}

// ============================================
// GENERATIVE UI COLOR MAP
// ============================================

/**
 * Color map for generative UI components
 * Maps CentrexColor enum values to actual hex colors
 */
export const CENTREX_COLOR_MAP = {
  green: CENTREX_BRAND_COLORS.primary.hex,
  blue: CENTREX_BRAND_COLORS.secondary.hex,
  orange: CENTREX_BRAND_COLORS.tertiary.hex,
  red: CENTREX_BRAND_COLORS.accent.hex,
  // Extended
  light: CENTREX_DARK_THEME.textPrimary,
  dark: CENTREX_DARK_THEME.bgBody,
  muted: CENTREX_DARK_THEME.textMuted,
  primary: CENTREX_BRAND_COLORS.primary.hex,
  secondary: CENTREX_BRAND_COLORS.secondary.hex,
  accent: CENTREX_BRAND_COLORS.tertiary.hex,
} as const;

/**
 * Get gradient CSS for a Centrex color
 */
export function getCentrexGradient(color: keyof typeof CENTREX_COMPONENT_VARIANTS.statCard): string {
  return CENTREX_COMPONENT_VARIANTS.statCard[color].text;
}

/**
 * Get border gradient CSS for a Centrex color
 */
export function getCentrexBorderGradient(color: keyof typeof CENTREX_COMPONENT_VARIANTS.statCard): string {
  return CENTREX_COMPONENT_VARIANTS.statCard[color].border;
}

// ============================================
// ASSET DEFINITIONS
// ============================================

/**
 * Centrex component asset definitions for the generative UI catalog
 */
export const CENTREX_COMPONENT_CATALOG = {
  // Stats & Metrics
  StatCard: {
    name: 'Stat Card',
    description: 'Hero statistic display with gradient accent',
    category: 'metrics',
    variants: ['green', 'blue', 'orange', 'red'],
  },
  StatGrid: {
    name: 'Stat Grid',
    description: 'Grid of multiple stat cards',
    category: 'metrics',
  },
  MetricChart: {
    name: 'Metric Chart',
    description: 'Data visualization chart (line, bar, area, sparkline)',
    category: 'metrics',
    chartTypes: ['line', 'bar', 'area', 'sparkline'],
  },
  // Layout
  Hero: {
    name: 'Hero Section',
    description: 'Full-width hero section with CTA',
    category: 'layout',
    layouts: ['centered', 'left', 'right', 'split'],
  },
  Features: {
    name: 'Features',
    description: 'Feature grid or list with icons',
    category: 'layout',
    layouts: ['grid', 'list', 'cards'],
  },
  // Interactive
  CommandPalette: {
    name: 'Command Palette',
    description: 'Grouped command interface',
    category: 'interactive',
  },
  Carousel3D: {
    name: '3D Carousel',
    description: 'Flywheel-style rotating cards',
    category: 'interactive',
  },
  // Data
  DataTable: {
    name: 'Data Table',
    description: 'Tabular data display with sorting',
    category: 'data',
  },
  ColorPalette: {
    name: 'Color Palette',
    description: 'Brand color display with copy functionality',
    category: 'branding',
  },
} as const;

export type CentrexComponentType = keyof typeof CENTREX_COMPONENT_CATALOG;

// ============================================
// EXPORTS
// ============================================

export default {
  colors: CENTREX_BRAND_COLORS,
  gradientColors: CENTREX_GRADIENT_COLORS,
  darkTheme: CENTREX_DARK_THEME,
  lightTheme: CENTREX_LIGHT_THEME,
  typography: CENTREX_TYPOGRAPHY,
  shadows: CENTREX_SHADOWS,
  spacing: CENTREX_SPACING,
  radii: CENTREX_RADII,
  components: CENTREX_COMPONENT_VARIANTS,
  catalog: CENTREX_COMPONENT_CATALOG,
  colorMap: CENTREX_COLOR_MAP,
  generateCSSVariables: generateCentrexCSSVariables,
  generateDesignTokens: generateCentrexDesignTokens,
};
