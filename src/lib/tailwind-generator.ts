/**
 * Tailwind Config Generator
 * Generates Tailwind CSS configuration from design tokens
 */

import type {
  DesignTokens,
  ColorToken,
  TypographyToken,
  SpacingToken,
  RadiusToken,
} from './figma-api';

// ============================================
// TYPES
// ============================================

export interface TailwindTheme {
  colors: Record<string, string | Record<string, string>>;
  fontFamily: Record<string, string[]>;
  fontSize: Record<string, [string, { lineHeight: string; letterSpacing?: string }]>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}

export interface GeneratedConfig {
  theme: TailwindTheme;
  cssVariables: string;
  jsConfig: string;
  documentation: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Convert token name to valid CSS/JS variable name
 */
function tokenToVariableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert hex to HSL for CSS variables
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex to RGB
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Group colors by category
 */
function groupColorsByCategory(colors: ColorToken[]): Record<string, ColorToken[]> {
  return colors.reduce(
    (acc, color) => {
      if (!acc[color.category]) {
        acc[color.category] = [];
      }
      acc[color.category].push(color);
      return acc;
    },
    {} as Record<string, ColorToken[]>
  );
}

// ============================================
// GENERATORS
// ============================================

/**
 * Generate Tailwind colors object from tokens
 */
function generateColors(colors: ColorToken[]): Record<string, string | Record<string, string>> {
  const grouped = groupColorsByCategory(colors);
  const result: Record<string, string | Record<string, string>> = {};

  for (const [category, categoryColors] of Object.entries(grouped)) {
    if (categoryColors.length === 1) {
      // Single color in category
      result[category] = categoryColors[0].value;
    } else {
      // Multiple colors in category - create nested object
      const nested: Record<string, string> = {};
      categoryColors.forEach((color) => {
        // Extract shade from name if present (e.g., "Primary 500" -> "500")
        const shadeMatch = color.name.match(/(\d+)$/);
        const shade = shadeMatch ? shadeMatch[1] : tokenToVariableName(color.name.replace(category, ''));
        nested[shade || 'DEFAULT'] = color.value;
      });
      result[category] = nested;
    }
  }

  return result;
}

/**
 * Generate Tailwind font family from tokens
 */
function generateFontFamily(typography: TypographyToken[]): Record<string, string[]> {
  const families = new Set<string>();
  typography.forEach((t) => families.add(t.fontFamily));

  const result: Record<string, string[]> = {};
  families.forEach((family) => {
    const key = tokenToVariableName(family);
    result[key] = [family, 'sans-serif'];
  });

  // Add default sans and mono
  if (!result['sans']) {
    result['sans'] = ['Inter', 'system-ui', 'sans-serif'];
  }
  if (!result['mono']) {
    result['mono'] = ['JetBrains Mono', 'Menlo', 'monospace'];
  }

  return result;
}

/**
 * Generate Tailwind font sizes from tokens
 */
function generateFontSizes(
  typography: TypographyToken[]
): Record<string, [string, { lineHeight: string; letterSpacing?: string }]> {
  const result: Record<string, [string, { lineHeight: string; letterSpacing?: string }]> = {};

  typography.forEach((t) => {
    const key = tokenToVariableName(t.name);
    const lineHeight = (t.lineHeight / t.fontSize).toFixed(3);
    const letterSpacing = t.letterSpacing !== 0 ? `${t.letterSpacing}px` : undefined;

    result[key] = [
      `${t.fontSize}px`,
      {
        lineHeight,
        ...(letterSpacing && { letterSpacing }),
      },
    ];
  });

  return result;
}

/**
 * Generate Tailwind spacing from tokens
 */
function generateSpacing(spacing: SpacingToken[]): Record<string, string> {
  const result: Record<string, string> = {};

  spacing.forEach((s) => {
    // Use number as key for spacing
    const key = s.name.replace('spacing-', '');
    result[key] = `${s.value}px`;
  });

  return result;
}

/**
 * Generate Tailwind border radius from tokens
 */
function generateBorderRadius(radii: RadiusToken[]): Record<string, string> {
  const result: Record<string, string> = {};

  radii.forEach((r) => {
    result[r.name] = r.value === 9999 ? '9999px' : `${r.value}px`;
  });

  return result;
}

/**
 * Generate CSS variables from tokens
 */
function generateCSSVariables(tokens: DesignTokens): string {
  const lines: string[] = [':root {'];

  // Colors
  lines.push('  /* Colors */');
  tokens.colors.forEach((color) => {
    const hsl = hexToHSL(color.value);
    const varName = `--color-${tokenToVariableName(color.name)}`;
    lines.push(`  ${varName}: ${hsl.h} ${hsl.s}% ${hsl.l}%;`);
  });

  // Typography
  lines.push('');
  lines.push('  /* Typography */');
  const families = new Set<string>();
  tokens.typography.forEach((t) => families.add(t.fontFamily));
  families.forEach((family) => {
    const varName = `--font-${tokenToVariableName(family)}`;
    lines.push(`  ${varName}: "${family}", sans-serif;`);
  });

  // Spacing
  lines.push('');
  lines.push('  /* Spacing */');
  tokens.spacing.forEach((s) => {
    const varName = `--spacing-${s.name.replace('spacing-', '')}`;
    lines.push(`  ${varName}: ${s.value}px;`);
  });

  // Border Radius
  lines.push('');
  lines.push('  /* Border Radius */');
  tokens.radii.forEach((r) => {
    const varName = `--radius-${r.name}`;
    lines.push(`  ${varName}: ${r.value === 9999 ? '9999px' : `${r.value}px`};`);
  });

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate Tailwind JS config from tokens
 */
function generateJSConfig(theme: TailwindTheme): string {
  const config = {
    theme: {
      extend: theme,
    },
  };

  return `// Generated from Figma design tokens
// Add this to your tailwind.config.js

module.exports = ${JSON.stringify(config, null, 2)}`;
}

/**
 * Generate documentation markdown
 */
function generateDocumentation(tokens: DesignTokens): string {
  const lines: string[] = [
    '# Design Tokens',
    '',
    `Generated from: ${tokens.metadata.fileName}`,
    `Last updated: ${new Date(tokens.metadata.extractedAt).toLocaleString()}`,
    '',
    '## Colors',
    '',
    '| Name | Value | Category |',
    '|------|-------|----------|',
  ];

  tokens.colors.forEach((c) => {
    lines.push(`| ${c.name} | \`${c.value}\` | ${c.category} |`);
  });

  lines.push('');
  lines.push('## Typography');
  lines.push('');
  lines.push('| Name | Font | Size | Weight | Line Height |');
  lines.push('|------|------|------|--------|-------------|');

  tokens.typography.forEach((t) => {
    lines.push(`| ${t.name} | ${t.fontFamily} | ${t.fontSize}px | ${t.fontWeight} | ${t.lineHeight.toFixed(1)}px |`);
  });

  lines.push('');
  lines.push('## Spacing');
  lines.push('');
  lines.push('| Name | Value |');
  lines.push('|------|-------|');

  tokens.spacing.forEach((s) => {
    lines.push(`| ${s.name} | ${s.value}px |`);
  });

  lines.push('');
  lines.push('## Border Radius');
  lines.push('');
  lines.push('| Name | Value |');
  lines.push('|------|-------|');

  tokens.radii.forEach((r) => {
    lines.push(`| ${r.name} | ${r.value === 9999 ? '9999px' : `${r.value}px`} |`);
  });

  return lines.join('\n');
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Generate complete Tailwind configuration from design tokens
 */
export function generateTailwindConfig(tokens: DesignTokens): GeneratedConfig {
  const theme: TailwindTheme = {
    colors: generateColors(tokens.colors),
    fontFamily: generateFontFamily(tokens.typography),
    fontSize: generateFontSizes(tokens.typography),
    spacing: generateSpacing(tokens.spacing),
    borderRadius: generateBorderRadius(tokens.radii),
  };

  return {
    theme,
    cssVariables: generateCSSVariables(tokens),
    jsConfig: generateJSConfig(theme),
    documentation: generateDocumentation(tokens),
  };
}

/**
 * Generate default tokens from current Tailwind config
 * Useful for projects without Figma
 */
export function generateDefaultTokens(): DesignTokens {
  return {
    colors: [
      { name: 'Primary', value: '#3b82f6', rgba: { r: 59, g: 130, b: 246, a: 1 }, category: 'primary' },
      { name: 'Primary Light', value: '#60a5fa', rgba: { r: 96, g: 165, b: 250, a: 1 }, category: 'primary' },
      { name: 'Primary Dark', value: '#2563eb', rgba: { r: 37, g: 99, b: 235, a: 1 }, category: 'primary' },
      { name: 'Secondary', value: '#8b5cf6', rgba: { r: 139, g: 92, b: 246, a: 1 }, category: 'secondary' },
      { name: 'Success', value: '#22c55e', rgba: { r: 34, g: 197, b: 94, a: 1 }, category: 'semantic' },
      { name: 'Warning', value: '#f59e0b', rgba: { r: 245, g: 158, b: 11, a: 1 }, category: 'semantic' },
      { name: 'Error', value: '#ef4444', rgba: { r: 239, g: 68, b: 68, a: 1 }, category: 'semantic' },
      { name: 'Gray 100', value: '#f3f4f6', rgba: { r: 243, g: 244, b: 246, a: 1 }, category: 'neutral' },
      { name: 'Gray 500', value: '#6b7280', rgba: { r: 107, g: 114, b: 128, a: 1 }, category: 'neutral' },
      { name: 'Gray 900', value: '#111827', rgba: { r: 17, g: 24, b: 39, a: 1 }, category: 'neutral' },
    ],
    typography: [
      { name: 'Heading 1', fontFamily: 'Inter', fontSize: 48, fontWeight: 700, lineHeight: 56, letterSpacing: -0.5 },
      { name: 'Heading 2', fontFamily: 'Inter', fontSize: 36, fontWeight: 600, lineHeight: 44, letterSpacing: -0.25 },
      { name: 'Heading 3', fontFamily: 'Inter', fontSize: 24, fontWeight: 600, lineHeight: 32, letterSpacing: 0 },
      { name: 'Body', fontFamily: 'Inter', fontSize: 16, fontWeight: 400, lineHeight: 24, letterSpacing: 0 },
      { name: 'Body Small', fontFamily: 'Inter', fontSize: 14, fontWeight: 400, lineHeight: 20, letterSpacing: 0 },
      { name: 'Caption', fontFamily: 'Inter', fontSize: 12, fontWeight: 400, lineHeight: 16, letterSpacing: 0.25 },
    ],
    spacing: [
      { name: 'spacing-0', value: 0, unit: 'px' },
      { name: 'spacing-1', value: 4, unit: 'px' },
      { name: 'spacing-2', value: 8, unit: 'px' },
      { name: 'spacing-3', value: 12, unit: 'px' },
      { name: 'spacing-4', value: 16, unit: 'px' },
      { name: 'spacing-6', value: 24, unit: 'px' },
      { name: 'spacing-8', value: 32, unit: 'px' },
      { name: 'spacing-12', value: 48, unit: 'px' },
      { name: 'spacing-16', value: 64, unit: 'px' },
    ],
    shadows: [],
    radii: [
      { name: 'none', value: 0, unit: 'px' },
      { name: 'sm', value: 2, unit: 'px' },
      { name: 'md', value: 6, unit: 'px' },
      { name: 'lg', value: 8, unit: 'px' },
      { name: 'xl', value: 12, unit: 'px' },
      { name: 'full', value: 9999, unit: 'px' },
    ],
    metadata: {
      source: 'default',
      fileKey: '',
      fileName: 'Default Design System',
      lastModified: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
    },
  };
}
