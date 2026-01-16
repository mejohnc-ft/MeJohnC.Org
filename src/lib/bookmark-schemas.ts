import { z } from 'zod';

// ============================================
// BOOKMARK SCHEMAS
// ============================================

// Bookmark source types
export const BookmarkSourceSchema = z.enum(['twitter', 'pocket', 'raindrop', 'manual', 'other']);
export type BookmarkSource = z.infer<typeof BookmarkSourceSchema>;

// Bookmark category colors
export const BookmarkCategoryColorSchema = z.enum([
  'blue', 'purple', 'gray', 'red', 'sky', 'green', 'orange', 'yellow', 'pink', 'slate'
]);
export type BookmarkCategoryColor = z.infer<typeof BookmarkCategoryColorSchema>;

// Main Bookmark schema
export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  source: BookmarkSourceSchema,
  source_id: z.string().nullable(),
  source_url: z.string().nullable(),
  url: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  author: z.string().nullable(),
  author_handle: z.string().nullable(),
  author_avatar_url: z.string().nullable(),
  tags: z.array(z.string()).nullable().transform(v => v ?? []),
  category: z.string().nullable(),
  ai_summary: z.string().nullable(),
  ai_tags: z.array(z.string()).nullable().transform(v => v ?? []),
  ai_category: z.string().nullable(),
  ai_processed_at: z.string().nullable(),
  is_read: z.boolean(),
  is_archived: z.boolean(),
  is_favorite: z.boolean(),
  is_public: z.boolean(),
  image_url: z.string().nullable(),
  favicon_url: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  published_at: z.string().nullable(),
  imported_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Bookmark = z.infer<typeof BookmarkSchema>;

// Bookmark for creation (without auto-generated fields)
export type BookmarkCreate = Omit<Bookmark, 'id' | 'created_at' | 'updated_at'>;

// Bookmark Collection schema
export const BookmarkCollectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  cover_image: z.string().nullable(),
  color: z.string(),
  is_public: z.boolean(),
  is_smart: z.boolean(),
  smart_rules: z.record(z.unknown()).nullable(),
  sort_order: z.number(),
  item_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type BookmarkCollection = z.infer<typeof BookmarkCollectionSchema>;

// Bookmark Collection Item (many-to-many)
export const BookmarkCollectionItemSchema = z.object({
  bookmark_id: z.string().uuid(),
  collection_id: z.string().uuid(),
  sort_order: z.number(),
  notes: z.string().nullable(),
  added_at: z.string(),
});
export type BookmarkCollectionItem = z.infer<typeof BookmarkCollectionItemSchema>;

// Import Job status
export const ImportJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'partial']);
export type ImportJobStatus = z.infer<typeof ImportJobStatusSchema>;

// Bookmark Import Job schema
export const BookmarkImportJobSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  status: ImportJobStatusSchema,
  file_path: z.string().nullable(),
  total_items: z.number(),
  processed_items: z.number(),
  imported_items: z.number(),
  skipped_items: z.number(),
  error_log: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});
export type BookmarkImportJob = z.infer<typeof BookmarkImportJobSchema>;

// Bookmark Category schema
export const BookmarkCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  icon: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type BookmarkCategory = z.infer<typeof BookmarkCategorySchema>;

// ============================================
// PARSED SMAUG BOOKMARK (before database insert)
// ============================================

export const ParsedSmaugBookmarkSchema = z.object({
  title: z.string().nullable(),
  type: z.string().nullable(), // 'tool', 'article', 'thread', etc.
  date_added: z.string().nullable(),
  source_url: z.string(), // Original tweet URL
  url: z.string(), // Linked content URL (may be same as source_url)
  tags: z.array(z.string()),
  author: z.string().nullable(),
  author_handle: z.string().nullable(), // @username
  content: z.string(), // Markdown body content
  published_at: z.string().nullable(),
});
export type ParsedSmaugBookmark = z.infer<typeof ParsedSmaugBookmarkSchema>;

// ============================================
// AI ENRICHMENT RESPONSE
// ============================================

export const AIEnrichmentResponseSchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
});
export type AIEnrichmentResponse = z.infer<typeof AIEnrichmentResponseSchema>;

// ============================================
// QUERY OPTIONS
// ============================================

export interface BookmarkQueryOptions {
  source?: BookmarkSource;
  category?: string;
  tags?: string[];
  isRead?: boolean;
  isArchived?: boolean;
  isFavorite?: boolean;
  isPublic?: boolean;
  aiProcessed?: boolean;
  search?: string;
  authorHandle?: string;
  collectionId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// STATS
// ============================================

export const BookmarkStatsSchema = z.object({
  total_bookmarks: z.number(),
  unread_count: z.number(),
  favorite_count: z.number(),
  public_count: z.number(),
  ai_processed_count: z.number(),
  collections_count: z.number(),
  by_source: z.record(z.number()),
  by_category: z.record(z.number()),
});
export type BookmarkStats = z.infer<typeof BookmarkStatsSchema>;
