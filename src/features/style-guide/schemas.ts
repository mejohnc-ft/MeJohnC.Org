/**
 * Style Guide Feature - Schemas
 *
 * Zod schemas for design tokens, brand assets, and style guidelines.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { z } from 'zod';

// ============================================
// DESIGN TOKENS
// ============================================

/**
 * Color token schema
 */
export const ColorTokenSchema = z.object({
  name: z.string(),
  value: z.string(), // hex color
  rgba: z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
    a: z.number().min(0).max(1),
  }),
  category: z.enum([
    'primary',
    'secondary',
    'accent',
    'semantic',
    'neutral',
    'background',
    'foreground',
    'border',
    'other',
  ]),
});

export type ColorToken = z.infer<typeof ColorTokenSchema>;

/**
 * Typography token schema
 */
export const TypographyTokenSchema = z.object({
  name: z.string(),
  fontFamily: z.string(),
  fontSize: z.number().positive(),
  fontWeight: z.number().min(100).max(900),
  lineHeight: z.number().positive(),
  letterSpacing: z.number(),
});

export type TypographyToken = z.infer<typeof TypographyTokenSchema>;

/**
 * Spacing token schema
 */
export const SpacingTokenSchema = z.object({
  name: z.string(),
  value: z.number().nonnegative(),
  unit: z.enum(['px', 'rem']),
});

export type SpacingToken = z.infer<typeof SpacingTokenSchema>;

/**
 * Shadow token schema
 */
export const ShadowTokenSchema = z.object({
  name: z.string(),
  value: z.string(), // CSS box-shadow value
});

export type ShadowToken = z.infer<typeof ShadowTokenSchema>;

/**
 * Radius token schema
 */
export const RadiusTokenSchema = z.object({
  name: z.string(),
  value: z.number().nonnegative(),
  unit: z.enum(['px', 'rem']),
});

export type RadiusToken = z.infer<typeof RadiusTokenSchema>;

/**
 * Design tokens metadata schema
 */
export const DesignTokensMetadataSchema = z.object({
  source: z.enum(['figma', 'default', 'custom']),
  fileKey: z.string().optional(),
  fileName: z.string(),
  lastModified: z.string(),
  extractedAt: z.string(),
});

export type DesignTokensMetadata = z.infer<typeof DesignTokensMetadataSchema>;

/**
 * Complete design tokens schema
 */
export const DesignTokensSchema = z.object({
  colors: z.array(ColorTokenSchema),
  typography: z.array(TypographyTokenSchema),
  spacing: z.array(SpacingTokenSchema),
  shadows: z.array(ShadowTokenSchema),
  radii: z.array(RadiusTokenSchema),
  metadata: DesignTokensMetadataSchema,
});

export type DesignTokens = z.infer<typeof DesignTokensSchema>;

// ============================================
// BRAND
// ============================================

/**
 * Brand schema
 */
export const BrandSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  design_tokens: DesignTokensSchema.optional(),
  figma_file_key: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type Brand = z.infer<typeof BrandSchema>;

/**
 * Create brand input schema
 */
export const CreateBrandInputSchema = BrandSchema.pick({
  name: true,
  description: true,
  logo_url: true,
  primary_color: true,
  secondary_color: true,
  design_tokens: true,
  figma_file_key: true,
});

export type CreateBrandInput = z.infer<typeof CreateBrandInputSchema>;

/**
 * Update brand input schema
 */
export const UpdateBrandInputSchema = CreateBrandInputSchema.partial();

export type UpdateBrandInput = z.infer<typeof UpdateBrandInputSchema>;

// ============================================
// ASSETS
// ============================================

/**
 * Asset type enum
 */
export const AssetTypeSchema = z.enum([
  'logo',
  'icon',
  'image',
  'illustration',
  'font',
  'document',
  'other',
]);

export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Asset schema
 */
export const AssetSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  brand_id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: AssetTypeSchema,
  url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  file_size: z.number().nonnegative().optional(),
  mime_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type Asset = z.infer<typeof AssetSchema>;

/**
 * Create asset input schema
 */
export const CreateAssetInputSchema = AssetSchema.pick({
  brand_id: true,
  name: true,
  description: true,
  type: true,
  url: true,
  thumbnail_url: true,
  file_size: true,
  mime_type: true,
  tags: true,
  metadata: true,
});

export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;

/**
 * Update asset input schema
 */
export const UpdateAssetInputSchema = CreateAssetInputSchema.partial();

export type UpdateAssetInput = z.infer<typeof UpdateAssetInputSchema>;

// ============================================
// GUIDELINES
// ============================================

/**
 * Guideline category enum
 */
export const GuidelineCategorySchema = z.enum([
  'logo-usage',
  'color-palette',
  'typography',
  'imagery',
  'voice-tone',
  'spacing',
  'components',
  'accessibility',
  'other',
]);

export type GuidelineCategory = z.infer<typeof GuidelineCategorySchema>;

/**
 * Guideline schema
 */
export const GuidelineSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  brand_id: z.string().uuid().optional(),
  category: GuidelineCategorySchema,
  title: z.string().min(1),
  content: z.string(),
  examples: z.array(z.string().url()).default([]),
  do_examples: z.array(z.string()).default([]),
  dont_examples: z.array(z.string()).default([]),
  sort_order: z.number().int().nonnegative().default(0),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type Guideline = z.infer<typeof GuidelineSchema>;

/**
 * Create guideline input schema
 */
export const CreateGuidelineInputSchema = GuidelineSchema.pick({
  brand_id: true,
  category: true,
  title: true,
  content: true,
  examples: true,
  do_examples: true,
  dont_examples: true,
  sort_order: true,
});

export type CreateGuidelineInput = z.infer<typeof CreateGuidelineInputSchema>;

/**
 * Update guideline input schema
 */
export const UpdateGuidelineInputSchema = CreateGuidelineInputSchema.partial();

export type UpdateGuidelineInput = z.infer<typeof UpdateGuidelineInputSchema>;
