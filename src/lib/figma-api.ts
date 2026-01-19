/**
 * Figma API Integration
 * Fetches design tokens from Figma files
 *
 * Setup:
 * 1. Get a Figma Personal Access Token from https://www.figma.com/developers/api#access-tokens
 * 2. Store the token securely (env var or metrics_sources.auth_config)
 * 3. Get your Figma file key from the URL (figma.com/file/{FILE_KEY}/...)
 *
 * API Reference: https://www.figma.com/developers/api
 */

// Figma API base URL
const FIGMA_API = 'https://api.figma.com/v1';

// ============================================
// TYPES
// ============================================

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

export interface FigmaTextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent: number;
  textCase: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
}

export interface FigmaPaint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  color?: FigmaColor;
  opacity?: number;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  style?: FigmaTextStyle;
  styles?: Record<string, string>;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FigmaFile {
  name: string;
  lastModified: string;
  version: string;
  document: FigmaNode;
  styles: Record<string, FigmaStyle>;
}

export interface FigmaStylesResponse {
  meta: {
    styles: FigmaStyle[];
  };
}

// ============================================
// DESIGN TOKEN TYPES
// ============================================

export interface ColorToken {
  name: string;
  value: string; // hex
  rgba: { r: number; g: number; b: number; a: number };
  category: string; // e.g., 'primary', 'neutral', 'semantic'
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface SpacingToken {
  name: string;
  value: number;
  unit: 'px' | 'rem';
}

export interface ShadowToken {
  name: string;
  value: string; // CSS box-shadow value
}

export interface RadiusToken {
  name: string;
  value: number;
  unit: 'px' | 'rem';
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  radii: RadiusToken[];
  metadata: {
    source: string;
    fileKey: string;
    fileName: string;
    lastModified: string;
    extractedAt: string;
  };
}

// ============================================
// API CLIENT
// ============================================

class FigmaApiClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${FIGMA_API}${endpoint}`, {
      headers: {
        'X-Figma-Token': this.token,
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Invalid Figma access token');
      }
      if (response.status === 404) {
        throw new Error('Figma file not found');
      }
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get file metadata and structure
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    return this.fetch<FigmaFile>(`/files/${fileKey}`);
  }

  /**
   * Get file styles
   */
  async getFileStyles(fileKey: string): Promise<FigmaStylesResponse> {
    return this.fetch<FigmaStylesResponse>(`/files/${fileKey}/styles`);
  }

  /**
   * Get specific nodes by ID
   */
  async getNodes(fileKey: string, nodeIds: string[]): Promise<{ nodes: Record<string, FigmaNode> }> {
    const ids = nodeIds.join(',');
    return this.fetch(`/files/${fileKey}/nodes?ids=${ids}`);
  }
}

// ============================================
// TOKEN EXTRACTION
// ============================================

/**
 * Convert Figma RGBA to hex
 */
function rgbaToHex(color: FigmaColor): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Parse color name to determine category
 */
function parseColorCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('primary')) return 'primary';
  if (lower.includes('secondary')) return 'secondary';
  if (lower.includes('accent')) return 'accent';
  if (lower.includes('success') || lower.includes('green')) return 'semantic';
  if (lower.includes('warning') || lower.includes('yellow') || lower.includes('orange')) return 'semantic';
  if (lower.includes('error') || lower.includes('danger') || lower.includes('red')) return 'semantic';
  if (lower.includes('info') || lower.includes('blue')) return 'semantic';
  if (lower.includes('gray') || lower.includes('grey') || lower.includes('neutral')) return 'neutral';
  if (lower.includes('background') || lower.includes('bg')) return 'background';
  if (lower.includes('foreground') || lower.includes('text')) return 'foreground';
  if (lower.includes('border')) return 'border';
  return 'other';
}

/**
 * Extract color tokens from Figma file
 */
function extractColors(file: FigmaFile, styles: FigmaStyle[]): ColorToken[] {
  const colors: ColorToken[] = [];
  const fillStyles = styles.filter((s) => s.styleType === 'FILL');

  // We need to find the actual color values from the document
  // This requires traversing the document to find nodes using these styles
  const styleMap = new Map<string, FigmaStyle>(fillStyles.map((s) => [s.key, s]));

  function traverse(node: FigmaNode) {
    if (node.styles && node.fills) {
      Object.entries(node.styles).forEach(([type, styleKey]) => {
        if (type === 'fill' || type === 'fills') {
          const style = styleMap.get(styleKey);
          if (style && node.fills && node.fills.length > 0) {
            const fill = node.fills[0];
            if (fill.type === 'SOLID' && fill.color) {
              const existing = colors.find((c) => c.name === style.name);
              if (!existing) {
                colors.push({
                  name: style.name,
                  value: rgbaToHex(fill.color),
                  rgba: {
                    r: Math.round(fill.color.r * 255),
                    g: Math.round(fill.color.g * 255),
                    b: Math.round(fill.color.b * 255),
                    a: fill.color.a,
                  },
                  category: parseColorCategory(style.name),
                });
              }
            }
          }
        }
      });
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(file.document);
  return colors;
}

/**
 * Extract typography tokens from Figma file
 */
function extractTypography(file: FigmaFile, styles: FigmaStyle[]): TypographyToken[] {
  const typography: TypographyToken[] = [];
  const textStyles = styles.filter((s) => s.styleType === 'TEXT');
  const styleMap = new Map<string, FigmaStyle>(textStyles.map((s) => [s.key, s]));

  function traverse(node: FigmaNode) {
    if (node.styles && node.style) {
      const textStyleKey = node.styles.text;
      if (textStyleKey) {
        const style = styleMap.get(textStyleKey);
        if (style) {
          const existing = typography.find((t) => t.name === style.name);
          if (!existing && node.style) {
            typography.push({
              name: style.name,
              fontFamily: node.style.fontFamily,
              fontSize: node.style.fontSize,
              fontWeight: node.style.fontWeight,
              lineHeight: node.style.lineHeightPx || node.style.fontSize * 1.5,
              letterSpacing: node.style.letterSpacing || 0,
            });
          }
        }
      }
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(file.document);
  return typography;
}

/**
 * Generate default spacing scale
 */
function generateSpacingScale(): SpacingToken[] {
  const baseUnit = 4;
  const scale = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64];

  return scale.map((multiplier) => ({
    name: `spacing-${multiplier}`,
    value: baseUnit * multiplier,
    unit: 'px' as const,
  }));
}

/**
 * Generate default radius scale
 */
function generateRadiusScale(): RadiusToken[] {
  return [
    { name: 'none', value: 0, unit: 'px' },
    { name: 'sm', value: 2, unit: 'px' },
    { name: 'md', value: 4, unit: 'px' },
    { name: 'lg', value: 8, unit: 'px' },
    { name: 'xl', value: 12, unit: 'px' },
    { name: '2xl', value: 16, unit: 'px' },
    { name: '3xl', value: 24, unit: 'px' },
    { name: 'full', value: 9999, unit: 'px' },
  ];
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if Figma credentials are configured
 */
export function isFigmaConfigured(token?: string): boolean {
  return !!token && token.length > 0;
}

/**
 * Extract all design tokens from a Figma file
 */
export async function extractDesignTokens(
  fileKey: string,
  token: string
): Promise<DesignTokens> {
  const client = new FigmaApiClient(token);

  // Fetch file and styles in parallel
  const [file, stylesResponse] = await Promise.all([
    client.getFile(fileKey),
    client.getFileStyles(fileKey),
  ]);

  const styles = stylesResponse.meta.styles;

  // Extract tokens
  const colors = extractColors(file, styles);
  const typography = extractTypography(file, styles);
  const spacing = generateSpacingScale();
  const radii = generateRadiusScale();

  return {
    colors,
    typography,
    spacing,
    shadows: [], // Would need effect styles from Figma
    radii,
    metadata: {
      source: 'figma',
      fileKey,
      fileName: file.name,
      lastModified: file.lastModified,
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get file info without extracting tokens
 */
export async function getFigmaFileInfo(
  fileKey: string,
  token: string
): Promise<{ name: string; lastModified: string; version: string }> {
  const client = new FigmaApiClient(token);
  const file = await client.getFile(fileKey);

  return {
    name: file.name,
    lastModified: file.lastModified,
    version: file.version,
  };
}

/**
 * Validate Figma token by making a test request
 */
export async function validateFigmaToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${FIGMA_API}/me`, {
      headers: { 'X-Figma-Token': token },
    });
    return response.ok;
  } catch {
    return false;
  }
}
