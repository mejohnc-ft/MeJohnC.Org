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
} from "./figma-api";
import { hexToHSL } from "./color-utils";

// ============================================
// TYPES
// ============================================

export interface TailwindTheme {
  colors: Record<string, string | Record<string, string>>;
  fontFamily: Record<string, string[]>;
  fontSize: Record<
    string,
    [string, { lineHeight: string; letterSpacing?: string }]
  >;
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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Group colors by category
 */
function groupColorsByCategory(
  colors: ColorToken[],
): Record<string, ColorToken[]> {
  return colors.reduce(
    (acc, color) => {
      if (!acc[color.category]) {
        acc[color.category] = [];
      }
      acc[color.category].push(color);
      return acc;
    },
    {} as Record<string, ColorToken[]>,
  );
}

// ============================================
// GENERATORS
// ============================================

/**
 * Generate Tailwind colors object from tokens
 */
function generateColors(
  colors: ColorToken[],
): Record<string, string | Record<string, string>> {
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
        const shade = shadeMatch
          ? shadeMatch[1]
          : tokenToVariableName(color.name.replace(category, ""));
        nested[shade || "DEFAULT"] = color.value;
      });
      result[category] = nested;
    }
  }

  return result;
}

/**
 * Generate Tailwind font family from tokens
 */
function generateFontFamily(
  typography: TypographyToken[],
): Record<string, string[]> {
  const families = new Set<string>();
  typography.forEach((t) => families.add(t.fontFamily));

  const result: Record<string, string[]> = {};
  families.forEach((family) => {
    const key = tokenToVariableName(family);
    result[key] = [family, "sans-serif"];
  });

  // Add default sans and mono
  if (!result["sans"]) {
    result["sans"] = ["Inter", "system-ui", "sans-serif"];
  }
  if (!result["mono"]) {
    result["mono"] = ["JetBrains Mono", "Menlo", "monospace"];
  }

  return result;
}

/**
 * Generate Tailwind font sizes from tokens
 */
function generateFontSizes(
  typography: TypographyToken[],
): Record<string, [string, { lineHeight: string; letterSpacing?: string }]> {
  const result: Record<
    string,
    [string, { lineHeight: string; letterSpacing?: string }]
  > = {};

  typography.forEach((t) => {
    const key = tokenToVariableName(t.name);
    const lineHeight = (t.lineHeight / t.fontSize).toFixed(3);
    const letterSpacing =
      t.letterSpacing !== 0 ? `${t.letterSpacing}px` : undefined;

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
    const key = s.name.replace("spacing-", "");
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
    result[r.name] = r.value === 9999 ? "9999px" : `${r.value}px`;
  });

  return result;
}

/**
 * Generate CSS variables from tokens
 */
function generateCSSVariables(tokens: DesignTokens): string {
  const lines: string[] = [":root {"];

  // Colors
  lines.push("  /* Colors */");
  tokens.colors.forEach((color) => {
    const hsl = hexToHSL(color.value);
    const varName = `--color-${tokenToVariableName(color.name)}`;
    lines.push(`  ${varName}: ${hsl.h} ${hsl.s}% ${hsl.l}%;`);
  });

  // Typography
  lines.push("");
  lines.push("  /* Typography */");
  const families = new Set<string>();
  tokens.typography.forEach((t) => families.add(t.fontFamily));
  families.forEach((family) => {
    const varName = `--font-${tokenToVariableName(family)}`;
    lines.push(`  ${varName}: "${family}", sans-serif;`);
  });

  // Spacing
  lines.push("");
  lines.push("  /* Spacing */");
  tokens.spacing.forEach((s) => {
    const varName = `--spacing-${s.name.replace("spacing-", "")}`;
    lines.push(`  ${varName}: ${s.value}px;`);
  });

  // Border Radius
  lines.push("");
  lines.push("  /* Border Radius */");
  tokens.radii.forEach((r) => {
    const varName = `--radius-${r.name}`;
    lines.push(
      `  ${varName}: ${r.value === 9999 ? "9999px" : `${r.value}px`};`,
    );
  });

  lines.push("}");

  return lines.join("\n");
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
    "# Design Tokens",
    "",
    `Generated from: ${tokens.metadata.fileName}`,
    `Last updated: ${new Date(tokens.metadata.extractedAt).toLocaleString()}`,
    "",
    "## Colors",
    "",
    "| Name | Value | Category |",
    "|------|-------|----------|",
  ];

  tokens.colors.forEach((c) => {
    lines.push(`| ${c.name} | \`${c.value}\` | ${c.category} |`);
  });

  lines.push("");
  lines.push("## Typography");
  lines.push("");
  lines.push("| Name | Font | Size | Weight | Line Height |");
  lines.push("|------|------|------|--------|-------------|");

  tokens.typography.forEach((t) => {
    lines.push(
      `| ${t.name} | ${t.fontFamily} | ${t.fontSize}px | ${t.fontWeight} | ${t.lineHeight.toFixed(1)}px |`,
    );
  });

  lines.push("");
  lines.push("## Spacing");
  lines.push("");
  lines.push("| Name | Value |");
  lines.push("|------|-------|");

  tokens.spacing.forEach((s) => {
    lines.push(`| ${s.name} | ${s.value}px |`);
  });

  lines.push("");
  lines.push("## Border Radius");
  lines.push("");
  lines.push("| Name | Value |");
  lines.push("|------|-------|");

  tokens.radii.forEach((r) => {
    lines.push(
      `| ${r.name} | ${r.value === 9999 ? "9999px" : `${r.value}px`} |`,
    );
  });

  return lines.join("\n");
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
 * Generate default tokens from CentrexStyle design system
 * Returns official Centrex brand tokens for the style guide
 */
export function generateDefaultTokens(): DesignTokens {
  // Import dynamically to avoid circular dependencies
  // Uses the CentrexStyle design system as the default
  return {
    colors: [
      // Primary palette - Centrex Green
      {
        name: "Centrex Primary (Green)",
        value: "#3dae2b",
        rgba: { r: 61, g: 174, b: 43, a: 1 },
        category: "primary",
      },
      {
        name: "Centrex Primary Light",
        value: "#4ade80",
        rgba: { r: 74, g: 222, b: 128, a: 1 },
        category: "primary",
      },
      // Secondary palette - Centrex Blue
      {
        name: "Centrex Secondary (Blue)",
        value: "#0071ce",
        rgba: { r: 0, g: 113, b: 206, a: 1 },
        category: "secondary",
      },
      {
        name: "Centrex Secondary Light",
        value: "#3b82f6",
        rgba: { r: 59, g: 130, b: 246, a: 1 },
        category: "secondary",
      },
      // Accent - Centrex Orange
      {
        name: "Centrex Tertiary (Orange)",
        value: "#ff8300",
        rgba: { r: 255, g: 131, b: 0, a: 1 },
        category: "accent",
      },
      {
        name: "Centrex Tertiary Light",
        value: "#fb923c",
        rgba: { r: 251, g: 146, b: 60, a: 1 },
        category: "accent",
      },
      // Semantic - Centrex Red
      {
        name: "Centrex Accent (Red)",
        value: "#e1251b",
        rgba: { r: 225, g: 37, b: 27, a: 1 },
        category: "semantic",
      },
      {
        name: "Centrex Accent Light",
        value: "#f87171",
        rgba: { r: 248, g: 113, b: 113, a: 1 },
        category: "semantic",
      },
      // Backgrounds (Dark theme)
      {
        name: "Background Body",
        value: "#050505",
        rgba: { r: 5, g: 5, b: 5, a: 1 },
        category: "background",
      },
      {
        name: "Background Card",
        value: "#121212",
        rgba: { r: 18, g: 18, b: 18, a: 1 },
        category: "background",
      },
      {
        name: "Background Panel",
        value: "#1a1a1a",
        rgba: { r: 26, g: 26, b: 26, a: 1 },
        category: "background",
      },
      {
        name: "Background Input",
        value: "#262626",
        rgba: { r: 38, g: 38, b: 38, a: 1 },
        category: "background",
      },
      // Foreground/Text
      {
        name: "Text Primary",
        value: "#e5e5e5",
        rgba: { r: 229, g: 229, b: 229, a: 1 },
        category: "foreground",
      },
      {
        name: "Text Secondary",
        value: "#a3a3a3",
        rgba: { r: 163, g: 163, b: 163, a: 1 },
        category: "foreground",
      },
      {
        name: "Text Muted",
        value: "#525252",
        rgba: { r: 82, g: 82, b: 82, a: 1 },
        category: "foreground",
      },
      // Border
      {
        name: "Border",
        value: "#262626",
        rgba: { r: 38, g: 38, b: 38, a: 1 },
        category: "border",
      },
    ],
    typography: [
      {
        name: "Display",
        fontFamily: "GilmerBold",
        fontSize: 72,
        fontWeight: 700,
        lineHeight: 80,
        letterSpacing: -1,
      },
      {
        name: "Heading 1",
        fontFamily: "GilmerBold",
        fontSize: 48,
        fontWeight: 700,
        lineHeight: 56,
        letterSpacing: -0.5,
      },
      {
        name: "Heading 2",
        fontFamily: "GilmerBold",
        fontSize: 36,
        fontWeight: 700,
        lineHeight: 44,
        letterSpacing: -0.25,
      },
      {
        name: "Heading 3",
        fontFamily: "GilmerBold",
        fontSize: 24,
        fontWeight: 600,
        lineHeight: 32,
        letterSpacing: 0,
      },
      {
        name: "Body Large",
        fontFamily: "Hind",
        fontSize: 20,
        fontWeight: 400,
        lineHeight: 28,
        letterSpacing: 0,
      },
      {
        name: "Body",
        fontFamily: "Hind",
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 24,
        letterSpacing: 0,
      },
      {
        name: "Body Small",
        fontFamily: "Hind",
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 20,
        letterSpacing: 0,
      },
      {
        name: "Caption",
        fontFamily: "Hind",
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 16,
        letterSpacing: 0.25,
      },
      {
        name: "Code",
        fontFamily: "Consolas",
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 20,
        letterSpacing: 0,
      },
    ],
    spacing: [
      { name: "spacing-0", value: 0, unit: "px" },
      { name: "spacing-1", value: 4, unit: "px" },
      { name: "spacing-2", value: 8, unit: "px" },
      { name: "spacing-3", value: 12, unit: "px" },
      { name: "spacing-4", value: 16, unit: "px" },
      { name: "spacing-5", value: 20, unit: "px" },
      { name: "spacing-6", value: 24, unit: "px" },
      { name: "spacing-8", value: 32, unit: "px" },
      { name: "spacing-9", value: 36, unit: "px" },
      { name: "spacing-10", value: 40, unit: "px" },
      { name: "spacing-12", value: 48, unit: "px" },
      { name: "spacing-16", value: 64, unit: "px" },
    ],
    shadows: [
      { name: "Natural", value: "6px 6px 9px rgba(0, 0, 0, 0.2)" },
      { name: "Deep", value: "12px 12px 50px rgba(0, 0, 0, 0.4)" },
      { name: "Crisp", value: "6px 6px 0px rgba(0, 0, 0, 1)" },
      { name: "Card", value: "0 20px 50px -12px rgba(0, 0, 0, 0.9)" },
      { name: "Primary Glow", value: "0 4px 12px rgba(61, 174, 43, 0.3)" },
    ],
    radii: [
      { name: "none", value: 0, unit: "px" },
      { name: "sm", value: 4, unit: "px" },
      { name: "md", value: 8, unit: "px" },
      { name: "lg", value: 12, unit: "px" },
      { name: "xl", value: 16, unit: "px" },
      { name: "2xl", value: 20, unit: "px" },
      { name: "full", value: 9999, unit: "px" },
    ],
    metadata: {
      source: "custom",
      fileKey: "centrexstyle",
      fileName: "CentrexStyle Design System",
      lastModified: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
    },
  };
}
