/**
 * News Feature - Schemas
 *
 * Re-exports news-related Zod schemas from the main schemas file.
 * In the future, these will be moved here directly.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/112
 */

// Re-export news schemas from central schemas.ts
// These will eventually be moved here as the primary location
export {
  // Schemas
  NewsCategorySchema,
  NewsCategoryColorSchema,
  NewsSourceSchema,
  NewsSourceTypeSchema,
  NewsSourceWithCategorySchema,
  NewsArticleSchema,
  NewsArticleWithSourceSchema,
  NewsFilterSchema,
  NewsFilterTypeSchema,
  NewsDashboardTabSchema,
  // Types
  type NewsCategory,
  type NewsSource,
  type NewsSourceWithCategory,
  type NewsArticle,
  type NewsArticleWithSource,
  type NewsFilter,
  type NewsDashboardTab,
} from '@/lib/schemas';
