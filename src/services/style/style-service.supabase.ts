/**
 * Style Service - Supabase Implementation
 *
 * Implements the IStyleService interface using Supabase as the backend.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import type { IStyleService } from './style-service.interface';
import type { ServiceContext } from '../types';
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
import { getTenantId } from '../types';
import { FigmaAdapter } from '@/features/style-guide/adapters/figma-adapter';

/**
 * Supabase implementation of IStyleService
 */
export class StyleServiceSupabase implements IStyleService {
  readonly serviceName = 'style' as const;

  // ============================================
  // BRANDS
  // ============================================

  async getBrands(ctx: ServiceContext): Promise<Brand[]> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data, error } = await client
      .from('style_brands')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) throw error;
    return data as Brand[];
  }

  async getBrandById(ctx: ServiceContext, id: string): Promise<Brand | null> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data, error } = await client
      .from('style_brands')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as Brand;
  }

  async createBrand(ctx: ServiceContext, data: CreateBrandInput): Promise<Brand> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data: brand, error } = await client
      .from('style_brands')
      .insert({
        tenant_id: tenantId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return brand as Brand;
  }

  async updateBrand(
    ctx: ServiceContext,
    id: string,
    data: UpdateBrandInput
  ): Promise<Brand> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data: brand, error } = await client
      .from('style_brands')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return brand as Brand;
  }

  async deleteBrand(ctx: ServiceContext, id: string): Promise<void> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { error } = await client
      .from('style_brands')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  // ============================================
  // DESIGN TOKENS
  // ============================================

  async getDesignTokens(ctx: ServiceContext, brandId: string): Promise<DesignTokens | null> {
    const brand = await this.getBrandById(ctx, brandId);
    return brand?.design_tokens ?? null;
  }

  async updateDesignTokens(
    ctx: ServiceContext,
    brandId: string,
    tokens: DesignTokens
  ): Promise<Brand> {
    return this.updateBrand(ctx, brandId, { design_tokens: tokens });
  }

  async syncFromFigma(
    ctx: ServiceContext,
    brandId: string,
    fileKey: string,
    token: string
  ): Promise<DesignTokens> {
    const adapter = new FigmaAdapter();
    const tokens = await adapter.extractDesignTokens(fileKey, token);

    // Update brand with new tokens
    await this.updateBrand(ctx, brandId, {
      design_tokens: tokens,
      figma_file_key: fileKey,
    });

    return tokens;
  }

  // ============================================
  // ASSETS
  // ============================================

  async getAssets(
    ctx: ServiceContext,
    filters?: {
      brandId?: string;
      type?: AssetType;
      tags?: string[];
    }
  ): Promise<Asset[]> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    let query = client
      .from('style_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (filters?.brandId) {
      query = query.eq('brand_id', filters.brandId);
    }

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;
    return data as Asset[];
  }

  async getAssetById(ctx: ServiceContext, id: string): Promise<Asset | null> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data, error } = await client
      .from('style_assets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Asset;
  }

  async createAsset(ctx: ServiceContext, data: CreateAssetInput): Promise<Asset> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data: asset, error } = await client
      .from('style_assets')
      .insert({
        tenant_id: tenantId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return asset as Asset;
  }

  async updateAsset(
    ctx: ServiceContext,
    id: string,
    data: UpdateAssetInput
  ): Promise<Asset> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data: asset, error } = await client
      .from('style_assets')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return asset as Asset;
  }

  async deleteAsset(ctx: ServiceContext, id: string): Promise<void> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { error } = await client
      .from('style_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  async searchAssets(ctx: ServiceContext, query: string): Promise<Asset[]> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data, error } = await client
      .from('style_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name');

    if (error) throw error;
    return data as Asset[];
  }

  // ============================================
  // GUIDELINES
  // ============================================

  async getGuidelines(
    ctx: ServiceContext,
    filters?: {
      brandId?: string;
      category?: GuidelineCategory;
    }
  ): Promise<Guideline[]> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    let query = client
      .from('style_guidelines')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (filters?.brandId) {
      query = query.eq('brand_id', filters.brandId);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query.order('sort_order').order('title');

    if (error) throw error;
    return data as Guideline[];
  }

  async getGuidelineById(ctx: ServiceContext, id: string): Promise<Guideline | null> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data, error } = await client
      .from('style_guidelines')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as Guideline;
  }

  async createGuideline(ctx: ServiceContext, data: CreateGuidelineInput): Promise<Guideline> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data: guideline, error } = await client
      .from('style_guidelines')
      .insert({
        tenant_id: tenantId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;
    return guideline as Guideline;
  }

  async updateGuideline(
    ctx: ServiceContext,
    id: string,
    data: UpdateGuidelineInput
  ): Promise<Guideline> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data: guideline, error } = await client
      .from('style_guidelines')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return guideline as Guideline;
  }

  async deleteGuideline(ctx: ServiceContext, id: string): Promise<void> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { error } = await client
      .from('style_guidelines')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }

  async searchGuidelines(ctx: ServiceContext, query: string): Promise<Guideline[]> {
    const { client } = ctx;
    if (!client) throw new Error('Supabase client required');

    const tenantId = getTenantId(ctx);

    const { data, error } = await client
      .from('style_guidelines')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('sort_order')
      .order('title');

    if (error) throw error;
    return data as Guideline[];
  }
}
