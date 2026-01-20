/**
 * Style Service Interface
 *
 * Defines the contract for style guide operations including brands,
 * design tokens, assets, and guidelines.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import type { ServiceContext, BaseService, ListResponse } from '../types';
import type {
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
  Asset,
  CreateAssetInput,
  UpdateAssetInput,
  Guideline,
  CreateGuidelineInput,
  UpdateGuidelineInput,
  DesignTokens,
  AssetType,
  GuidelineCategory,
} from '@/features/style-guide/schemas';

/**
 * Style service interface
 */
export interface IStyleService extends BaseService {
  readonly serviceName: 'style';

  // ============================================
  // BRANDS
  // ============================================

  /**
   * Get all brands for the tenant
   */
  getBrands(ctx: ServiceContext): Promise<Brand[]>;

  /**
   * Get a brand by ID
   */
  getBrandById(ctx: ServiceContext, id: string): Promise<Brand | null>;

  /**
   * Create a new brand
   */
  createBrand(ctx: ServiceContext, data: CreateBrandInput): Promise<Brand>;

  /**
   * Update an existing brand
   */
  updateBrand(ctx: ServiceContext, id: string, data: UpdateBrandInput): Promise<Brand>;

  /**
   * Delete a brand (soft delete)
   */
  deleteBrand(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // DESIGN TOKENS
  // ============================================

  /**
   * Get design tokens for a brand
   */
  getDesignTokens(ctx: ServiceContext, brandId: string): Promise<DesignTokens | null>;

  /**
   * Update design tokens for a brand
   */
  updateDesignTokens(
    ctx: ServiceContext,
    brandId: string,
    tokens: DesignTokens
  ): Promise<Brand>;

  /**
   * Sync design tokens from Figma
   */
  syncFromFigma(
    ctx: ServiceContext,
    brandId: string,
    fileKey: string,
    token: string
  ): Promise<DesignTokens>;

  // ============================================
  // ASSETS
  // ============================================

  /**
   * Get all assets for the tenant
   */
  getAssets(
    ctx: ServiceContext,
    filters?: {
      brandId?: string;
      type?: AssetType;
      tags?: string[];
    }
  ): Promise<Asset[]>;

  /**
   * Get an asset by ID
   */
  getAssetById(ctx: ServiceContext, id: string): Promise<Asset | null>;

  /**
   * Create a new asset
   */
  createAsset(ctx: ServiceContext, data: CreateAssetInput): Promise<Asset>;

  /**
   * Update an existing asset
   */
  updateAsset(ctx: ServiceContext, id: string, data: UpdateAssetInput): Promise<Asset>;

  /**
   * Delete an asset (soft delete)
   */
  deleteAsset(ctx: ServiceContext, id: string): Promise<void>;

  /**
   * Search assets by name or tags
   */
  searchAssets(ctx: ServiceContext, query: string): Promise<Asset[]>;

  // ============================================
  // GUIDELINES
  // ============================================

  /**
   * Get all guidelines for the tenant
   */
  getGuidelines(
    ctx: ServiceContext,
    filters?: {
      brandId?: string;
      category?: GuidelineCategory;
    }
  ): Promise<Guideline[]>;

  /**
   * Get a guideline by ID
   */
  getGuidelineById(ctx: ServiceContext, id: string): Promise<Guideline | null>;

  /**
   * Create a new guideline
   */
  createGuideline(ctx: ServiceContext, data: CreateGuidelineInput): Promise<Guideline>;

  /**
   * Update an existing guideline
   */
  updateGuideline(
    ctx: ServiceContext,
    id: string,
    data: UpdateGuidelineInput
  ): Promise<Guideline>;

  /**
   * Delete a guideline (soft delete)
   */
  deleteGuideline(ctx: ServiceContext, id: string): Promise<void>;

  /**
   * Search guidelines by title or content
   */
  searchGuidelines(ctx: ServiceContext, query: string): Promise<Guideline[]>;
}
