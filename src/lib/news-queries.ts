import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import {
  NewsCategorySchema,
  NewsSourceSchema,
  NewsDashboardTabSchema,
  parseResponse,
  type NewsCategory,
  type NewsSource,
  type NewsArticle,
  type NewsFilter,
  type NewsDashboardTab,
} from './schemas';

// Re-export types for consumers
export type {
  NewsCategory,
  NewsSource,
  NewsArticle,
  NewsFilter,
  NewsDashboardTab,
};

// ============================================
// NEWS CATEGORIES
// ============================================

export async function getNewsCategories(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_categories')
    .select('*')
    .order('order_index');

  return handleQueryResult(data, error, {
    operation: 'getNewsCategories',
    returnFallback: true,
    fallback: [] as NewsCategory[],
  });
}

export async function getNewsCategoryBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseResponse(NewsCategorySchema, data, 'getNewsCategoryBySlug');
}

export async function createNewsCategory(
  category: Omit<NewsCategory, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data as NewsCategory;
}

export async function updateNewsCategory(
  id: string,
  category: Partial<NewsCategory>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_categories')
    .update({ ...category, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsCategory;
}

export async function deleteNewsCategory(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderNewsCategories(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('news_categories')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// NEWS SOURCES
// ============================================

export async function getNewsSources(includeInactive = false, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('news_sources')
    .select('*')
    .order('order_index');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsSources',
    returnFallback: true,
    fallback: [] as NewsSource[],
  });
}

export async function getNewsSourceById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(NewsSourceSchema, data, 'getNewsSourceById');
}

export async function createNewsSource(
  source: Omit<NewsSource, 'id' | 'created_at' | 'updated_at' | 'last_fetched_at' | 'fetch_error'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_sources')
    .insert(source)
    .select()
    .single();

  if (error) throw error;
  return data as NewsSource;
}

export async function updateNewsSource(
  id: string,
  source: Partial<NewsSource>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_sources')
    .update({ ...source, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsSource;
}

export async function deleteNewsSource(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_sources')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderNewsSources(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('news_sources')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function updateNewsSourceFetchStatus(
  id: string,
  status: { last_fetched_at: string; fetch_error: string | null },
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('news_sources')
    .update({ ...status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// NEWS ARTICLES
// ============================================

export interface NewsArticleQueryOptions {
  sourceId?: string;
  categorySlug?: string;
  isRead?: boolean;
  isBookmarked?: boolean;
  isCurated?: boolean;
  isArchived?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getNewsArticles(
  options: NewsArticleQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('news_articles')
    .select('*, source:news_sources(*)')
    .order('published_at', { ascending: false, nullsFirst: false });

  // Apply filters
  if (options.sourceId) {
    query = query.eq('source_id', options.sourceId);
  }

  if (options.isRead !== undefined) {
    query = query.eq('is_read', options.isRead);
  }

  if (options.isBookmarked !== undefined) {
    query = query.eq('is_bookmarked', options.isBookmarked);
  }

  if (options.isCurated !== undefined) {
    query = query.eq('is_curated', options.isCurated);
  }

  if (options.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    // By default, exclude archived articles
    query = query.eq('is_archived', false);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsArticles',
    returnFallback: true,
    fallback: [] as (NewsArticle & { source: NewsSource | null })[],
  });
}

export async function getNewsArticleById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_articles')
    .select('*, source:news_sources(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as NewsArticle & { source: NewsSource | null };
}

export async function getCuratedArticles(limit = 20, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_articles')
    .select('*, source:news_sources(*)')
    .eq('is_curated', true)
    .eq('is_archived', false)
    .order('curated_order', { ascending: true, nullsFirst: false })
    .order('curated_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getCuratedArticles',
    returnFallback: true,
    fallback: [] as (NewsArticle & { source: NewsSource | null })[],
  });
}

export async function createNewsArticle(
  article: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_articles')
    .insert(article)
    .select()
    .single();

  if (error) throw error;
  return data as NewsArticle;
}

export async function upsertNewsArticle(
  article: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  // Upsert by source_id + external_id
  const { data, error } = await client
    .from('news_articles')
    .upsert(article, { onConflict: 'source_id,external_id', ignoreDuplicates: true })
    .select()
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows returned" on duplicate
  return data as NewsArticle | null;
}

export async function updateNewsArticle(
  id: string,
  article: Partial<NewsArticle>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_articles')
    .update({ ...article, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsArticle;
}

export async function markArticleRead(id: string, client: SupabaseClient = supabase) {
  return updateNewsArticle(id, { is_read: true }, client);
}

export async function markArticlesRead(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;
}

export async function toggleArticleBookmark(id: string, isBookmarked: boolean, client: SupabaseClient = supabase) {
  return updateNewsArticle(id, { is_bookmarked: isBookmarked }, client);
}

export async function curateArticle(
  id: string,
  curated: boolean,
  summary?: string,
  client: SupabaseClient = supabase
) {
  const update: Partial<NewsArticle> = {
    is_curated: curated,
    curated_at: curated ? new Date().toISOString() : null,
    curated_summary: summary ?? null,
  };

  return updateNewsArticle(id, update, client);
}

export async function archiveArticles(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;
}

export async function deleteNewsArticle(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bulkDeleteNewsArticles(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_articles')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

// ============================================
// NEWS FILTERS
// ============================================

export async function getNewsFilters(activeOnly = true, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('news_filters')
    .select('*')
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsFilters',
    returnFallback: true,
    fallback: [] as NewsFilter[],
  });
}

export async function createNewsFilter(
  filter: Omit<NewsFilter, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_filters')
    .insert(filter)
    .select()
    .single();

  if (error) throw error;
  return data as NewsFilter;
}

export async function updateNewsFilter(
  id: string,
  filter: Partial<NewsFilter>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_filters')
    .update({ ...filter, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsFilter;
}

export async function deleteNewsFilter(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('news_filters')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// NEWS DASHBOARD TABS
// ============================================

export async function getNewsDashboardTabs(activeOnly = true, client: SupabaseClient = getSupabase()) {
  let query = client
    .from('news_dashboard_tabs')
    .select('*')
    .order('order_index');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  return handleQueryResult(data, error, {
    operation: 'getNewsDashboardTabs',
    returnFallback: true,
    fallback: [] as NewsDashboardTab[],
  });
}

export async function getNewsDashboardTabById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('news_dashboard_tabs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return parseResponse(NewsDashboardTabSchema, data, 'getNewsDashboardTabById');
}

export async function createNewsDashboardTab(
  tab: Omit<NewsDashboardTab, 'id' | 'created_at' | 'updated_at'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_dashboard_tabs')
    .insert(tab)
    .select()
    .single();

  if (error) throw error;
  return data as NewsDashboardTab;
}

export async function updateNewsDashboardTab(
  id: string,
  tab: Partial<NewsDashboardTab>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('news_dashboard_tabs')
    .update({ ...tab, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsDashboardTab;
}

export async function deleteNewsDashboardTab(id: string, client: SupabaseClient = supabase) {
  // First check if it's pinned
  const tab = await getNewsDashboardTabById(id, client);
  if (tab.is_pinned) {
    throw new Error('Cannot delete a pinned tab');
  }

  const { error } = await client
    .from('news_dashboard_tabs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderNewsDashboardTabs(
  orderedIds: string[],
  client: SupabaseClient = supabase
) {
  const updates = orderedIds.map((id, index) =>
    client
      .from('news_dashboard_tabs')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
}

// ============================================
// NEWS STATS
// ============================================

export async function getNewsStats(client: SupabaseClient = getSupabase()) {
  // Run multiple count queries in parallel
  const [
    totalResult,
    unreadResult,
    bookmarkedResult,
    curatedResult,
    sourcesResult,
    activeSourcesResult,
    lastFetchResult,
  ] = await Promise.all([
    client.from('news_articles').select('id', { count: 'exact', head: true }),
    client.from('news_articles').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('is_archived', false),
    client.from('news_articles').select('id', { count: 'exact', head: true }).eq('is_bookmarked', true),
    client.from('news_articles').select('id', { count: 'exact', head: true }).eq('is_curated', true),
    client.from('news_sources').select('id', { count: 'exact', head: true }),
    client.from('news_sources').select('id', { count: 'exact', head: true }).eq('is_active', true),
    client.from('news_sources').select('last_fetched_at').order('last_fetched_at', { ascending: false }).limit(1).single(),
  ]);

  return {
    total_articles: totalResult.count ?? 0,
    unread_count: unreadResult.count ?? 0,
    bookmarked_count: bookmarkedResult.count ?? 0,
    curated_count: curatedResult.count ?? 0,
    sources_count: sourcesResult.count ?? 0,
    active_sources_count: activeSourcesResult.count ?? 0,
    last_fetch: lastFetchResult.data?.last_fetched_at ?? null,
  };
}
