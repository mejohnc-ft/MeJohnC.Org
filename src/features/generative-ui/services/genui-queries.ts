/**
 * Generative UI Supabase Queries
 *
 * Database operations for panels, templates, and generations.
 */

import { supabase } from '@/lib/supabase';
import type { GeneratedUI, GenerativePanel } from '../schemas';

// ============================================
// TYPES
// ============================================

export interface CreatePanelInput {
  name: string;
  slug: string;
  description?: string;
  prompt: string;
  generated_ui: GeneratedUI;
  created_by?: string;
}

export interface UpdatePanelInput {
  name?: string;
  slug?: string;
  description?: string;
  prompt?: string;
  generated_ui?: GeneratedUI;
  is_published?: boolean;
}

export interface CatalogComponent {
  id: string;
  component_type: string;
  display_name: string;
  description: string;
  category: string;
  icon: string;
  props_schema: Record<string, unknown>;
  default_props: Record<string, unknown>;
  example_prompt: string;
  sort_order: number;
}

export interface PanelTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url?: string;
  prompt: string;
  generated_ui: GeneratedUI;
  is_featured: boolean;
  use_count: number;
}

export interface GenerationRecord {
  id: string;
  panel_id?: string;
  prompt: string;
  context: Record<string, unknown>;
  generated_ui: GeneratedUI;
  model: string;
  tokens_used: number;
  generation_time_ms: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
}

// ============================================
// PANELS
// ============================================

/**
 * Get all panels (optionally filtered by published status)
 */
export async function getPanels(publishedOnly = false) {
  let query = supabase
    .from('genui_panels')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (publishedOnly) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as GenerativePanel[];
}

/**
 * Get a single panel by ID
 */
export async function getPanelById(id: string) {
  const { data, error } = await supabase
    .from('genui_panels')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as GenerativePanel;
}

/**
 * Get a panel by slug (for public viewing)
 */
export async function getPanelBySlug(slug: string) {
  const { data, error } = await supabase
    .from('genui_panels')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single();

  if (error) throw error;

  // Increment view count
  await supabase.rpc('genui_increment_view_count', { panel_slug: slug });

  return data as GenerativePanel;
}

/**
 * Create a new panel
 */
export async function createPanel(input: CreatePanelInput) {
  const { data, error } = await supabase
    .from('genui_panels')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
      prompt: input.prompt,
      generated_ui: input.generated_ui,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GenerativePanel;
}

/**
 * Update an existing panel
 */
export async function updatePanel(id: string, input: UpdatePanelInput) {
  const updateData: Record<string, unknown> = { ...input };

  if (input.is_published !== undefined) {
    updateData.published_at = input.is_published ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('genui_panels')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as GenerativePanel;
}

/**
 * Soft delete a panel
 */
export async function deletePanel(id: string) {
  const { error } = await supabase
    .from('genui_panels')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Publish a panel
 */
export async function publishPanel(id: string) {
  return updatePanel(id, { is_published: true });
}

/**
 * Unpublish a panel
 */
export async function unpublishPanel(id: string) {
  return updatePanel(id, { is_published: false });
}

/**
 * Duplicate a panel
 */
export async function duplicatePanel(id: string, newName?: string) {
  const original = await getPanelById(id);

  const timestamp = Date.now();
  const name = newName || `${original.name} (Copy)`;
  const slug = `${original.slug}-copy-${timestamp}`;

  return createPanel({
    name,
    slug,
    description: original.description || undefined,
    prompt: original.prompt,
    generated_ui: original.generated_ui,
  });
}

// ============================================
// CATALOG
// ============================================

/**
 * Get all catalog components
 */
export async function getCatalog() {
  const { data, error } = await supabase
    .from('genui_catalog')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as CatalogComponent[];
}

/**
 * Get catalog by category
 */
export async function getCatalogByCategory(category: string) {
  const { data, error } = await supabase
    .from('genui_catalog')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as CatalogComponent[];
}

// ============================================
// TEMPLATES
// ============================================

/**
 * Get all templates
 */
export async function getTemplates(featuredOnly = false) {
  let query = supabase
    .from('genui_templates')
    .select('*')
    .order('use_count', { ascending: false });

  if (featuredOnly) {
    query = query.eq('is_featured', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as PanelTemplate[];
}

/**
 * Get a template by ID
 */
export async function getTemplateById(id: string) {
  const { data, error } = await supabase
    .from('genui_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  // Increment use count
  await supabase.rpc('genui_increment_template_use', { template_id: id });

  return data as PanelTemplate;
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(category: string) {
  const { data, error } = await supabase
    .from('genui_templates')
    .select('*')
    .eq('category', category)
    .order('use_count', { ascending: false });

  if (error) throw error;
  return data as PanelTemplate[];
}

// ============================================
// GENERATIONS
// ============================================

/**
 * Record a generation
 */
export async function recordGeneration(input: {
  panel_id?: string;
  prompt: string;
  context?: Record<string, unknown>;
  generated_ui: GeneratedUI;
  model?: string;
  tokens_used?: number;
  generation_time_ms?: number;
  status?: 'pending' | 'generating' | 'completed' | 'failed';
  error_message?: string;
  created_by?: string;
}) {
  const { data, error } = await supabase
    .from('genui_generations')
    .insert({
      panel_id: input.panel_id,
      prompt: input.prompt,
      context: input.context || {},
      generated_ui: input.generated_ui,
      model: input.model || 'mock',
      tokens_used: input.tokens_used || 0,
      generation_time_ms: input.generation_time_ms || 0,
      status: input.status || 'completed',
      error_message: input.error_message,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GenerationRecord;
}

/**
 * Get generation history
 */
export async function getGenerations(limit = 50) {
  const { data, error } = await supabase
    .from('genui_generations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as GenerationRecord[];
}

/**
 * Get generations for a specific panel
 */
export async function getPanelGenerations(panelId: string) {
  const { data, error } = await supabase
    .from('genui_generations')
    .select('*')
    .eq('panel_id', panelId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as GenerationRecord[];
}

// ============================================
// STATS
// ============================================

/**
 * Get generative UI statistics
 */
export async function getStats() {
  const [panels, templates, generations] = await Promise.all([
    supabase
      .from('genui_panels')
      .select('id, is_published', { count: 'exact' })
      .is('deleted_at', null),
    supabase
      .from('genui_templates')
      .select('id', { count: 'exact' }),
    supabase
      .from('genui_generations')
      .select('id, tokens_used', { count: 'exact' })
      .eq('status', 'completed'),
  ]);

  const publishedCount = panels.data?.filter(p => p.is_published).length || 0;
  const totalTokens = generations.data?.reduce((sum, g) => sum + (g.tokens_used || 0), 0) || 0;

  return {
    total_panels: panels.count || 0,
    published_panels: publishedCount,
    draft_panels: (panels.count || 0) - publishedCount,
    total_templates: templates.count || 0,
    total_generations: generations.count || 0,
    total_tokens_used: totalTokens,
  };
}

// ============================================
// EXPORTS
// ============================================

export const genuiQueries = {
  // Panels
  getPanels,
  getPanelById,
  getPanelBySlug,
  createPanel,
  updatePanel,
  deletePanel,
  publishPanel,
  unpublishPanel,
  duplicatePanel,
  // Catalog
  getCatalog,
  getCatalogByCategory,
  // Templates
  getTemplates,
  getTemplateById,
  getTemplatesByCategory,
  // Generations
  recordGeneration,
  getGenerations,
  getPanelGenerations,
  // Stats
  getStats,
};

export default genuiQueries;
