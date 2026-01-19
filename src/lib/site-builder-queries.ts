import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { parseResponse, parseArrayResponse } from './schemas';
import {
  SiteBuilderPageSchema,
  SiteBuilderPageVersionSchema,
  SiteBuilderPageComponentSchema,
  SiteBuilderComponentTemplateSchema,
  type SiteBuilderPage,
  type SiteBuilderPageComponent,
  type SiteBuilderComponentTemplate,
  type SiteBuilderPageWithComponents,
} from './schemas';

// ============================================
// PAGES
// ============================================

export async function getSiteBuilderPages(
  includeUnpublished = false,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('sb_pages')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!includeUnpublished) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query;

  if (error) throw error;
  return parseArrayResponse(SiteBuilderPageSchema, data, 'getSiteBuilderPages');
}

export async function getSiteBuilderPageBySlug(
  slug: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('sb_pages')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageSchema, data, 'getSiteBuilderPageBySlug');
}

export async function getSiteBuilderPageById(
  id: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('sb_pages')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageSchema, data, 'getSiteBuilderPageById');
}

export async function getSiteBuilderPageWithComponents(
  id: string,
  client: SupabaseClient = getSupabase()
): Promise<SiteBuilderPageWithComponents> {
  const [page, components] = await Promise.all([
    getSiteBuilderPageById(id, client),
    getSiteBuilderPageComponents(id, client),
  ]);

  return {
    ...page,
    components,
  };
}

export async function createSiteBuilderPage(
  page: Omit<SiteBuilderPage, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_pages')
    .insert(page)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageSchema, data, 'createSiteBuilderPage');
}

export async function updateSiteBuilderPage(
  id: string,
  page: Partial<SiteBuilderPage>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_pages')
    .update({ ...page, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageSchema, data, 'updateSiteBuilderPage');
}

export async function deleteSiteBuilderPage(
  id: string,
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('sb_pages')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function publishSiteBuilderPage(
  id: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_pages')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageSchema, data, 'publishSiteBuilderPage');
}

export async function unpublishSiteBuilderPage(
  id: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_pages')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageSchema, data, 'unpublishSiteBuilderPage');
}

// ============================================
// PAGE COMPONENTS
// ============================================

export async function getSiteBuilderPageComponents(
  pageId: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('sb_page_components')
    .select('*')
    .eq('page_id', pageId)
    .order('order_index');

  if (error) throw error;
  return parseArrayResponse(SiteBuilderPageComponentSchema, data, 'getSiteBuilderPageComponents');
}

export async function createSiteBuilderPageComponent(
  component: Omit<SiteBuilderPageComponent, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_page_components')
    .insert(component)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageComponentSchema, data, 'createSiteBuilderPageComponent');
}

export async function updateSiteBuilderPageComponent(
  id: string,
  component: Partial<SiteBuilderPageComponent>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_page_components')
    .update({ ...component, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageComponentSchema, data, 'updateSiteBuilderPageComponent');
}

export async function deleteSiteBuilderPageComponent(
  id: string,
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('sb_page_components')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderSiteBuilderPageComponents(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('sb_page_components')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function duplicateSiteBuilderPageComponent(
  componentId: string,
  client: SupabaseClient = supabase
) {
  // Get the original component
  const { data: original, error: fetchError } = await client
    .from('sb_page_components')
    .select('*')
    .eq('id', componentId)
    .single();

  if (fetchError) throw fetchError;

  // Get max order index for this page
  const { data: maxOrderData } = await client
    .from('sb_page_components')
    .select('order_index')
    .eq('page_id', original.page_id)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const newOrderIndex = (maxOrderData?.order_index ?? 0) + 1;

  // Create duplicate
  const { data, error } = await client
    .from('sb_page_components')
    .insert({
      page_id: original.page_id,
      component_type: original.component_type,
      props: original.props,
      order_index: newOrderIndex,
      parent_id: original.parent_id,
    })
    .select()
    .single();

  if (error) throw error;
  return parseResponse(SiteBuilderPageComponentSchema, data, 'duplicateSiteBuilderPageComponent');
}

// ============================================
// PAGE VERSIONS
// ============================================

export async function getSiteBuilderPageVersions(
  pageId: string,
  limit = 20,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('sb_page_versions')
    .select('*')
    .eq('page_id', pageId)
    .order('version_number', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return parseArrayResponse(SiteBuilderPageVersionSchema, data, 'getSiteBuilderPageVersions');
}

export async function createSiteBuilderPageVersion(
  pageId: string,
  createdBy: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client.rpc('create_page_version', {
    p_page_id: pageId,
    p_created_by: createdBy,
  });

  if (error) throw error;
  return data as string; // Returns version ID
}

export async function restoreSiteBuilderPageVersion(
  versionId: string,
  updatedBy: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client.rpc('restore_page_version', {
    p_version_id: versionId,
    p_updated_by: updatedBy,
  });

  if (error) throw error;
  return data as string; // Returns page ID
}

// ============================================
// COMPONENT TEMPLATES
// ============================================

export async function getSiteBuilderComponentTemplates(
  componentType?: string,
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('sb_component_templates')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (componentType) {
    query = query.eq('component_type', componentType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return parseArrayResponse(
    SiteBuilderComponentTemplateSchema,
    data,
    'getSiteBuilderComponentTemplates'
  );
}

export async function getSiteBuilderComponentTemplateById(
  id: string,
  client: SupabaseClient = getSupabase()
) {
  const { data, error } = await client
    .from('sb_component_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(
    SiteBuilderComponentTemplateSchema,
    data,
    'getSiteBuilderComponentTemplateById'
  );
}

export async function createSiteBuilderComponentTemplate(
  template: Omit<SiteBuilderComponentTemplate, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_component_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(
    SiteBuilderComponentTemplateSchema,
    data,
    'createSiteBuilderComponentTemplate'
  );
}

export async function updateSiteBuilderComponentTemplate(
  id: string,
  template: Partial<SiteBuilderComponentTemplate>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('sb_component_templates')
    .update({ ...template, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return parseResponse(
    SiteBuilderComponentTemplateSchema,
    data,
    'updateSiteBuilderComponentTemplate'
  );
}

export async function deleteSiteBuilderComponentTemplate(
  id: string,
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('sb_component_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkDeleteSiteBuilderPages(
  ids: string[],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('sb_pages')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function bulkPublishSiteBuilderPages(
  ids: string[],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('sb_pages')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) throw error;
}

export async function bulkUnpublishSiteBuilderPages(
  ids: string[],
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('sb_pages')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) throw error;
}

// ============================================
// STATS
// ============================================

export async function getSiteBuilderStats(client: SupabaseClient = getSupabase()) {
  const [totalResult, publishedResult, draftResult, componentsResult] = await Promise.all([
    client.from('sb_pages').select('id', { count: 'exact', head: true }),
    client.from('sb_pages').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    client.from('sb_pages').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    client.from('sb_page_components').select('id', { count: 'exact', head: true }),
  ]);

  return {
    total_pages: totalResult.count ?? 0,
    published_pages: publishedResult.count ?? 0,
    draft_pages: draftResult.count ?? 0,
    total_components: componentsResult.count ?? 0,
  };
}
