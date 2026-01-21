/**
 * Asset Registry - Modular Design System Manager
 *
 * Central registry for all design system assets, components, and tokens.
 * Provides plug-and-play access for the generative UI render engine.
 *
 * @see src/lib/centrexstyle.ts - Core design tokens
 * @see src/features/generative-ui - Component implementations
 * @see src/features/style-guide - Style documentation
 */

import {
  CENTREX_BRAND_COLORS,
  CENTREX_GRADIENT_COLORS,
  CENTREX_DARK_THEME,
  CENTREX_LIGHT_THEME,
  CENTREX_TYPOGRAPHY,
  CENTREX_SHADOWS,
  CENTREX_SPACING,
  CENTREX_RADII,
  CENTREX_COMPONENT_VARIANTS,
  CENTREX_COMPONENT_CATALOG,
  CENTREX_COLOR_MAP,
  generateCentrexDesignTokens,
  type CentrexComponentType,
} from './centrexstyle';

// ============================================
// TYPES
// ============================================

export type AssetType = 'color' | 'typography' | 'shadow' | 'spacing' | 'radius' | 'component' | 'variant';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  value: unknown;
  metadata?: {
    cssVar?: string;
    usage?: string;
    pms?: string;
    hex?: string;
    preview?: string;
  };
}

export interface ComponentAsset extends Asset {
  type: 'component';
  props: Record<string, unknown>;
  variants?: string[];
  previewJson?: string;
}

export interface ColorAsset extends Asset {
  type: 'color';
  value: string;
  metadata: {
    hex: string;
    rgb: string;
    cssVar: string;
    usage: string;
    pms?: string;
  };
}

// ============================================
// ASSET REGISTRY CLASS
// ============================================

class AssetRegistry {
  private colors: Map<string, ColorAsset> = new Map();
  private typography: Map<string, Asset> = new Map();
  private shadows: Map<string, Asset> = new Map();
  private spacing: Map<string, Asset> = new Map();
  private radii: Map<string, Asset> = new Map();
  private components: Map<string, ComponentAsset> = new Map();
  private initialized = false;

  /**
   * Initialize the registry with CentrexStyle tokens
   */
  initialize(): void {
    if (this.initialized) return;

    this.registerColors();
    this.registerTypography();
    this.registerShadows();
    this.registerSpacing();
    this.registerRadii();
    this.registerComponents();

    this.initialized = true;
  }

  private registerColors(): void {
    Object.entries(CENTREX_BRAND_COLORS).forEach(([key, color]) => {
      this.colors.set(key, {
        id: `color-${key}`,
        name: color.name,
        type: 'color',
        category: key === 'primary' ? 'primary' : key === 'secondary' ? 'secondary' : 'accent',
        value: color.hex,
        metadata: {
          hex: color.hex,
          rgb: `rgb(${color.rgbString})`,
          cssVar: color.cssVar,
          usage: color.usage,
          pms: color.pms,
        },
      });
    });

    // Add gradient colors
    Object.entries(CENTREX_GRADIENT_COLORS).forEach(([key, hex]) => {
      this.colors.set(key, {
        id: `color-${key}`,
        name: key.replace(/([A-Z])/g, ' $1').trim(),
        type: 'color',
        category: 'gradient',
        value: hex,
        metadata: {
          hex,
          rgb: '',
          cssVar: `--${key}`,
          usage: 'Gradient endpoint color',
        },
      });
    });

    // Add theme colors
    Object.entries(CENTREX_DARK_THEME).forEach(([key, value]) => {
      this.colors.set(`dark-${key}`, {
        id: `color-dark-${key}`,
        name: `Dark ${key.replace(/([A-Z])/g, ' $1').trim()}`,
        type: 'color',
        category: 'theme-dark',
        value,
        metadata: {
          hex: value.startsWith('#') ? value : '',
          rgb: '',
          cssVar: `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
          usage: 'Dark theme color',
        },
      });
    });

    Object.entries(CENTREX_LIGHT_THEME).forEach(([key, value]) => {
      this.colors.set(`light-${key}`, {
        id: `color-light-${key}`,
        name: `Light ${key.replace(/([A-Z])/g, ' $1').trim()}`,
        type: 'color',
        category: 'theme-light',
        value,
        metadata: {
          hex: value.startsWith('#') ? value : '',
          rgb: '',
          cssVar: `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
          usage: 'Light theme color',
        },
      });
    });
  }

  private registerTypography(): void {
    // Register fonts
    Object.entries(CENTREX_TYPOGRAPHY.fonts).forEach(([key, font]) => {
      this.typography.set(`font-${key}`, {
        id: `typography-font-${key}`,
        name: font.family,
        type: 'typography',
        category: 'font',
        value: { family: font.family, fallback: font.fallback },
        metadata: {
          cssVar: font.cssVar,
        },
      });
    });

    // Register sizes
    Object.entries(CENTREX_TYPOGRAPHY.sizes).forEach(([key, size]) => {
      this.typography.set(`size-${key}`, {
        id: `typography-size-${key}`,
        name: size.name,
        type: 'typography',
        category: 'size',
        value: `${size.value}${size.unit}`,
      });
    });

    // Register weights
    Object.entries(CENTREX_TYPOGRAPHY.weights).forEach(([key, weight]) => {
      this.typography.set(`weight-${key}`, {
        id: `typography-weight-${key}`,
        name: key,
        type: 'typography',
        category: 'weight',
        value: weight,
      });
    });
  }

  private registerShadows(): void {
    Object.entries(CENTREX_SHADOWS).forEach(([key, shadow]) => {
      this.shadows.set(key, {
        id: `shadow-${key}`,
        name: shadow.name,
        type: 'shadow',
        category: 'shadow',
        value: shadow.value,
        metadata: {
          usage: shadow.usage,
          cssVar: `--shadow-${key}`,
        },
      });
    });
  }

  private registerSpacing(): void {
    Object.entries(CENTREX_SPACING).forEach(([key, value]) => {
      this.spacing.set(key, {
        id: `spacing-${key}`,
        name: `Space ${key}`,
        type: 'spacing',
        category: 'spacing',
        value: `${value}px`,
        metadata: {
          cssVar: `--space-${key}`,
        },
      });
    });
  }

  private registerRadii(): void {
    Object.entries(CENTREX_RADII).forEach(([key, value]) => {
      this.radii.set(key, {
        id: `radius-${key}`,
        name: key,
        type: 'radius',
        category: 'radius',
        value: value === 9999 ? '9999px' : `${value}px`,
        metadata: {
          cssVar: `--radius-${key}`,
        },
      });
    });
  }

  private registerComponents(): void {
    Object.entries(CENTREX_COMPONENT_CATALOG).forEach(([key, component]) => {
      this.components.set(key, {
        id: `component-${key}`,
        name: component.name,
        type: 'component',
        category: component.category,
        value: component,
        props: {},
        variants: 'variants' in component ? (component.variants as string[]) : undefined,
        metadata: {
          usage: component.description,
        },
      });
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get all colors
   */
  getColors(): ColorAsset[] {
    this.initialize();
    return Array.from(this.colors.values());
  }

  /**
   * Get color by key
   */
  getColor(key: string): ColorAsset | undefined {
    this.initialize();
    return this.colors.get(key);
  }

  /**
   * Get colors by category
   */
  getColorsByCategory(category: string): ColorAsset[] {
    this.initialize();
    return Array.from(this.colors.values()).filter(c => c.category === category);
  }

  /**
   * Get all typography tokens
   */
  getTypography(): Asset[] {
    this.initialize();
    return Array.from(this.typography.values());
  }

  /**
   * Get all shadows
   */
  getShadows(): Asset[] {
    this.initialize();
    return Array.from(this.shadows.values());
  }

  /**
   * Get all spacing values
   */
  getSpacing(): Asset[] {
    this.initialize();
    return Array.from(this.spacing.values());
  }

  /**
   * Get all radii
   */
  getRadii(): Asset[] {
    this.initialize();
    return Array.from(this.radii.values());
  }

  /**
   * Get all components
   */
  getComponents(): ComponentAsset[] {
    this.initialize();
    return Array.from(this.components.values());
  }

  /**
   * Get component by type
   */
  getComponent(type: CentrexComponentType): ComponentAsset | undefined {
    this.initialize();
    return this.components.get(type);
  }

  /**
   * Get components by category
   */
  getComponentsByCategory(category: string): ComponentAsset[] {
    this.initialize();
    return Array.from(this.components.values()).filter(c => c.category === category);
  }

  /**
   * Get complete design tokens (for style guide integration)
   */
  getDesignTokens() {
    return generateCentrexDesignTokens();
  }

  /**
   * Get color map for generative UI
   */
  getColorMap() {
    return CENTREX_COLOR_MAP;
  }

  /**
   * Get component variants (for generative UI)
   */
  getComponentVariants() {
    return CENTREX_COMPONENT_VARIANTS;
  }

  /**
   * Search all assets
   */
  search(query: string): Asset[] {
    this.initialize();
    const q = query.toLowerCase();
    const results: Asset[] = [];

    // Search colors
    this.colors.forEach(asset => {
      if (asset.name.toLowerCase().includes(q) || asset.category.includes(q)) {
        results.push(asset);
      }
    });

    // Search typography
    this.typography.forEach(asset => {
      if (asset.name.toLowerCase().includes(q) || asset.category.includes(q)) {
        results.push(asset);
      }
    });

    // Search components
    this.components.forEach(asset => {
      if (asset.name.toLowerCase().includes(q) || asset.category.includes(q)) {
        results.push(asset);
      }
    });

    return results;
  }

  /**
   * Get all assets as a flat list
   */
  getAllAssets(): Asset[] {
    this.initialize();
    return [
      ...this.colors.values(),
      ...this.typography.values(),
      ...this.shadows.values(),
      ...this.spacing.values(),
      ...this.radii.values(),
      ...this.components.values(),
    ];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    this.initialize();
    return {
      colors: this.colors.size,
      typography: this.typography.size,
      shadows: this.shadows.size,
      spacing: this.spacing.size,
      radii: this.radii.size,
      components: this.components.size,
      total: this.getAllAssets().length,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const assetRegistry = new AssetRegistry();

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/**
 * Get the global asset registry instance
 */
export function getAssetRegistry(): AssetRegistry {
  assetRegistry.initialize();
  return assetRegistry;
}

/**
 * Quick access to brand colors
 */
export function getBrandColors() {
  return CENTREX_BRAND_COLORS;
}

/**
 * Quick access to color by name
 */
export function getColorHex(color: keyof typeof CENTREX_COLOR_MAP): string {
  return CENTREX_COLOR_MAP[color];
}

/**
 * Get gradient for a color
 */
export function getGradient(color: 'green' | 'blue' | 'orange' | 'red') {
  return CENTREX_COMPONENT_VARIANTS.statCard[color];
}

/**
 * Get button variant
 */
export function getButtonVariant(variant: keyof typeof CENTREX_COMPONENT_VARIANTS.button) {
  return CENTREX_COMPONENT_VARIANTS.button[variant];
}

// Default export
export default assetRegistry;
