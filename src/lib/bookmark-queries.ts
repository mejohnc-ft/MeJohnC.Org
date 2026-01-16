import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabase } from './supabase';
import { handleQueryResult } from './errors';
import { parseArrayResponse } from './schemas';
import {
  BookmarkCategorySchema,
  type Bookmark,
  type BookmarkCreate,
  type BookmarkCollection,
  type BookmarkImportJob,
  type BookmarkCategory,
  type BookmarkQueryOptions,
  type BookmarkStats,
} from './bookmark-schemas';

// Re-export types
export type {
  Bookmark,
  BookmarkCreate,
  BookmarkCollection,
  BookmarkImportJob,
  BookmarkCategory,
  BookmarkQueryOptions,
  BookmarkStats,
};

// ============================================
// BOOKMARKS
// ============================================

export async function getBookmarks(
  options: BookmarkQueryOptions = {},
  client: SupabaseClient = getSupabase()
) {
  let query = client
    .from('bookmarks')
    .select('*')
    .order('imported_at', { ascending: false });

  // Apply filters
  if (options.source) {
    query = query.eq('source', options.source);
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  if (options.isRead !== undefined) {
    query = query.eq('is_read', options.isRead);
  }

  if (options.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    // By default, exclude archived bookmarks
    query = query.eq('is_archived', false);
  }

  if (options.isFavorite) {
    query = query.eq('is_favorite', true);
  }

  if (options.isPublic) {
    query = query.eq('is_public', true);
  }

  if (options.aiProcessed === true) {
    query = query.not('ai_processed_at', 'is', null);
  } else if (options.aiProcessed === false) {
    query = query.is('ai_processed_at', null);
  }

  if (options.authorHandle) {
    query = query.eq('author_handle', options.authorHandle);
  }

  if (options.tags && options.tags.length > 0) {
    query = query.overlaps('tags', options.tags);
  }

  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%,content.ilike.%${options.search}%`);
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
    operation: 'getBookmarks',
    returnFallback: true,
    fallback: [] as Bookmark[],
  });
}

export async function getBookmarkById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmarks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Bookmark;
}

export async function getPublicBookmarks(limit = 50, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmarks')
    .select('*')
    .eq('is_public', true)
    .eq('is_archived', false)
    .order('imported_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getPublicBookmarks',
    returnFallback: true,
    fallback: [] as Bookmark[],
  });
}

export async function getUnprocessedBookmarks(limit = 50, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmarks')
    .select('*')
    .is('ai_processed_at', null)
    .eq('is_archived', false)
    .order('imported_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getUnprocessedBookmarks',
    returnFallback: true,
    fallback: [] as Bookmark[],
  });
}

export async function createBookmark(
  bookmark: BookmarkCreate,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmarks')
    .insert(bookmark)
    .select()
    .single();

  if (error) throw error;
  return data as Bookmark;
}

export async function upsertBookmark(
  bookmark: BookmarkCreate,
  client: SupabaseClient = supabase
) {
  // Upsert by source + source_id to prevent duplicates
  const { data, error } = await client
    .from('bookmarks')
    .upsert(bookmark, { onConflict: 'source,source_id', ignoreDuplicates: true })
    .select()
    .single();

  // Ignore "no rows returned" on duplicate
  if (error && error.code !== 'PGRST116') throw error;
  return data as Bookmark | null;
}

export async function updateBookmark(
  id: string,
  updates: Partial<Bookmark>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmarks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Bookmark;
}

export async function deleteBookmark(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmarks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Bulk operations
export async function bulkUpdateBookmarks(
  ids: string[],
  updates: Partial<Bookmark>,
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('bookmarks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;
}

export async function bulkDeleteBookmarks(ids: string[], client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmarks')
    .delete()
    .in('id', ids);

  if (error) throw error;
}

export async function markBookmarkRead(id: string, client: SupabaseClient = supabase) {
  return updateBookmark(id, { is_read: true }, client);
}

export async function markBookmarksRead(ids: string[], client: SupabaseClient = supabase) {
  return bulkUpdateBookmarks(ids, { is_read: true }, client);
}

export async function toggleBookmarkFavorite(id: string, isFavorite: boolean, client: SupabaseClient = supabase) {
  return updateBookmark(id, { is_favorite: isFavorite }, client);
}

export async function toggleBookmarkPublic(id: string, isPublic: boolean, client: SupabaseClient = supabase) {
  return updateBookmark(id, { is_public: isPublic }, client);
}

export async function archiveBookmarks(ids: string[], client: SupabaseClient = supabase) {
  return bulkUpdateBookmarks(ids, { is_archived: true }, client);
}

export async function updateBookmarkWithAI(
  id: string,
  aiData: { ai_summary: string; ai_tags: string[]; ai_category: string },
  client: SupabaseClient = supabase
) {
  return updateBookmark(id, {
    ...aiData,
    ai_processed_at: new Date().toISOString(),
  }, client);
}

// ============================================
// BOOKMARK COLLECTIONS
// ============================================

export async function getBookmarkCollections(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_collections')
    .select('*')
    .order('sort_order');

  return handleQueryResult(data, error, {
    operation: 'getBookmarkCollections',
    returnFallback: true,
    fallback: [] as BookmarkCollection[],
  });
}

export async function getBookmarkCollectionById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_collections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as BookmarkCollection;
}

export async function getBookmarkCollectionBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_collections')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as BookmarkCollection;
}

export async function createBookmarkCollection(
  collection: Omit<BookmarkCollection, 'id' | 'created_at' | 'updated_at' | 'item_count'>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_collections')
    .insert(collection)
    .select()
    .single();

  if (error) throw error;
  return data as BookmarkCollection;
}

export async function updateBookmarkCollection(
  id: string,
  collection: Partial<BookmarkCollection>,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_collections')
    .update({ ...collection, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BookmarkCollection;
}

export async function deleteBookmarkCollection(id: string, client: SupabaseClient = supabase) {
  const { error } = await client
    .from('bookmark_collections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Collection items
export async function getBookmarksInCollection(collectionId: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_collection_items')
    .select('bookmark_id, sort_order, notes, added_at, bookmark:bookmarks(*)')
    .eq('collection_id', collectionId)
    .order('sort_order');

  return handleQueryResult(data, error, {
    operation: 'getBookmarksInCollection',
    returnFallback: true,
    fallback: [],
  });
}

export async function addBookmarkToCollection(
  bookmarkId: string,
  collectionId: string,
  notes?: string,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_collection_items')
    .insert({
      bookmark_id: bookmarkId,
      collection_id: collectionId,
      notes: notes ?? null,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeBookmarkFromCollection(
  bookmarkId: string,
  collectionId: string,
  client: SupabaseClient = supabase
) {
  const { error } = await client
    .from('bookmark_collection_items')
    .delete()
    .eq('bookmark_id', bookmarkId)
    .eq('collection_id', collectionId);

  if (error) throw error;
}

// ============================================
// IMPORT JOBS
// ============================================

export async function getImportJobs(limit = 20, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_import_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return handleQueryResult(data, error, {
    operation: 'getImportJobs',
    returnFallback: true,
    fallback: [] as BookmarkImportJob[],
  });
}

export async function getImportJobById(id: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_import_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as BookmarkImportJob;
}

export async function createImportJob(
  source: string,
  totalItems: number,
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_import_jobs')
    .insert({
      source,
      status: 'pending',
      total_items: totalItems,
      processed_items: 0,
      imported_items: 0,
      skipped_items: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BookmarkImportJob;
}

export async function updateImportJobProgress(
  id: string,
  progress: {
    status?: BookmarkImportJob['status'];
    processed_items?: number;
    imported_items?: number;
    skipped_items?: number;
    error_log?: string;
    started_at?: string;
    completed_at?: string;
  },
  client: SupabaseClient = supabase
) {
  const { data, error } = await client
    .from('bookmark_import_jobs')
    .update(progress)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BookmarkImportJob;
}

// ============================================
// BOOKMARK CATEGORIES
// ============================================

export async function getBookmarkCategories(client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_categories')
    .select('*')
    .order('sort_order');

  return handleQueryResult(data, error, {
    operation: 'getBookmarkCategories',
    returnFallback: true,
    fallback: [] as BookmarkCategory[],
  });
}

export async function getBookmarkCategoryBySlug(slug: string, client: SupabaseClient = getSupabase()) {
  const { data, error } = await client
    .from('bookmark_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return parseArrayResponse(BookmarkCategorySchema, [data], 'getBookmarkCategoryBySlug')[0];
}

// ============================================
// STATS
// ============================================

export async function getBookmarkStats(client: SupabaseClient = getSupabase()): Promise<BookmarkStats> {
  // Run multiple count queries in parallel
  const [
    totalResult,
    unreadResult,
    favoriteResult,
    publicResult,
    aiProcessedResult,
    collectionsResult,
    bySourceResult,
    byCategoryResult,
  ] = await Promise.all([
    client.from('bookmarks').select('id', { count: 'exact', head: true }),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_read', false).eq('is_archived', false),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_favorite', true),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).eq('is_public', true),
    client.from('bookmarks').select('id', { count: 'exact', head: true }).not('ai_processed_at', 'is', null),
    client.from('bookmark_collections').select('id', { count: 'exact', head: true }),
    client.from('bookmarks').select('source').eq('is_archived', false),
    client.from('bookmarks').select('category').eq('is_archived', false).not('category', 'is', null),
  ]);

  // Count by source
  const bySource: Record<string, number> = {};
  if (bySourceResult.data) {
    bySourceResult.data.forEach((row: { source: string }) => {
      bySource[row.source] = (bySource[row.source] || 0) + 1;
    });
  }

  // Count by category
  const byCategory: Record<string, number> = {};
  if (byCategoryResult.data) {
    byCategoryResult.data.forEach((row: { category: string }) => {
      if (row.category) {
        byCategory[row.category] = (byCategory[row.category] || 0) + 1;
      }
    });
  }

  return {
    total_bookmarks: totalResult.count ?? 0,
    unread_count: unreadResult.count ?? 0,
    favorite_count: favoriteResult.count ?? 0,
    public_count: publicResult.count ?? 0,
    ai_processed_count: aiProcessedResult.count ?? 0,
    collections_count: collectionsResult.count ?? 0,
    by_source: bySource,
    by_category: byCategory,
  };
}
