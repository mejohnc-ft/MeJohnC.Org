/**
 * Style Guide Feature Module
 *
 * Public API for the style guide feature.
 * This module provides design token management, brand asset library,
 * and style guideline documentation.
 *
 * Standalone value: MSPs and agencies can use this independently for
 * managing multiple client brands and design systems.
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

// Module definition
export { styleGuideModule } from './module';

// Components
export {
  ColorPalette,
  TypographyScale,
  ComponentShowcase,
  AssetLibrary,
} from './components';

// Pages (lazy-loaded, also available via module.frontendRoutes)
export {
  BrandPage,
  ColorsPage,
  TypographyPage,
  ComponentsPage,
} from './pages';

// Schemas
export {
  // Color schemas
  ColorTokenSchema,
  type ColorToken,
  // Typography schemas
  TypographyTokenSchema,
  type TypographyToken,
  // Spacing schemas
  SpacingTokenSchema,
  type SpacingToken,
  // Shadow schemas
  ShadowTokenSchema,
  type ShadowToken,
  // Radius schemas
  RadiusTokenSchema,
  type RadiusToken,
  // Design tokens schemas
  DesignTokensMetadataSchema,
  type DesignTokensMetadata,
  DesignTokensSchema,
  type DesignTokens,
  // Brand schemas
  BrandSchema,
  type Brand,
  CreateBrandInputSchema,
  type CreateBrandInput,
  UpdateBrandInputSchema,
  type UpdateBrandInput,
  // Asset schemas
  AssetTypeSchema,
  type AssetType,
  AssetSchema,
  type Asset,
  CreateAssetInputSchema,
  type CreateAssetInput,
  UpdateAssetInputSchema,
  type UpdateAssetInput,
  // Guideline schemas
  GuidelineCategorySchema,
  type GuidelineCategory,
  GuidelineSchema,
  type Guideline,
  CreateGuidelineInputSchema,
  type CreateGuidelineInput,
  UpdateGuidelineInputSchema,
  type UpdateGuidelineInput,
} from './schemas';

// Adapters
export { FigmaAdapter } from './adapters/figma-adapter';
export type { FigmaFileInfo } from './adapters/figma-adapter';
