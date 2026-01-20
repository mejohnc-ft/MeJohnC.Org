/**
 * News Service Interface
 *
 * Defines the contract for news management operations.
 * Implementations can use Supabase directly or call a REST API.
 */

import {
  type NewsCategory,
  type NewsSource,
  type NewsArticle,
  type NewsArticleWithSource,
  type NewsFilter,
  type NewsDashboardTab,
} from '@/lib/schemas';
import { type NewsArticleQueryOptions } from '@/lib/news-queries';
import { BaseService, ServiceContext } from '../types';

export interface INewsService extends BaseService {
  // ============================================
  // NEWS CATEGORIES
  // ============================================

  /** Get all news categories, ordered by order_index */
  getCategories(ctx: ServiceContext): Promise<NewsCategory[]>;

  /** Get a single category by ID */
  getCategoryById(ctx: ServiceContext, id: string): Promise<NewsCategory>;

  /** Get a single category by slug */
  getCategoryBySlug(ctx: ServiceContext, slug: string): Promise<NewsCategory>;

  /** Create a new news category */
  createCategory(
    ctx: ServiceContext,
    data: Omit<NewsCategory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsCategory>;

  /** Update an existing news category */
  updateCategory(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsCategory>
  ): Promise<NewsCategory>;

  /** Delete a news category */
  deleteCategory(ctx: ServiceContext, id: string): Promise<void>;

  /** Reorder news categories */
  reorderCategories(ctx: ServiceContext, orderedIds: string[]): Promise<void>;

  // ============================================
  // NEWS SOURCES
  // ============================================

  /** Get all news sources */
  getSources(ctx: ServiceContext, includeInactive?: boolean): Promise<NewsSource[]>;

  /** Get a single source by ID */
  getSourceById(ctx: ServiceContext, id: string): Promise<NewsSource>;

  /** Get sources by category */
  getSourcesByCategory(ctx: ServiceContext, categorySlug: string): Promise<NewsSource[]>;

  /** Create a new news source */
  createSource(
    ctx: ServiceContext,
    data: Omit<NewsSource, 'id' | 'created_at' | 'updated_at' | 'last_fetched_at' | 'fetch_error'>
  ): Promise<NewsSource>;

  /** Update an existing news source */
  updateSource(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsSource>
  ): Promise<NewsSource>;

  /** Delete a news source */
  deleteSource(ctx: ServiceContext, id: string): Promise<void>;

  /** Reorder news sources */
  reorderSources(ctx: ServiceContext, orderedIds: string[]): Promise<void>;

  // ============================================
  // NEWS ARTICLES
  // ============================================

  /** Get articles with optional filtering */
  getArticles(ctx: ServiceContext, options?: NewsArticleQueryOptions): Promise<NewsArticleWithSource[]>;

  /** Get a single article by ID */
  getArticleById(ctx: ServiceContext, id: string): Promise<NewsArticleWithSource>;

  /** Get recent articles */
  getRecentArticles(ctx: ServiceContext, limit?: number): Promise<NewsArticleWithSource[]>;

  /** Get curated articles */
  getCuratedArticles(ctx: ServiceContext): Promise<NewsArticleWithSource[]>;

  /** Search articles */
  searchArticles(ctx: ServiceContext, query: string): Promise<NewsArticleWithSource[]>;

  /** Create a new article (typically from adapter) */
  createArticle(
    ctx: ServiceContext,
    data: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsArticle>;

  /** Update an existing article */
  updateArticle(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsArticle>
  ): Promise<NewsArticle>;

  /** Mark article as read */
  markArticleRead(ctx: ServiceContext, id: string): Promise<void>;

  /** Mark multiple articles as read */
  markArticlesRead(ctx: ServiceContext, ids: string[]): Promise<void>;

  /** Toggle article bookmark */
  toggleArticleBookmark(ctx: ServiceContext, id: string, bookmarked: boolean): Promise<void>;

  /** Curate an article */
  curateArticle(
    ctx: ServiceContext,
    id: string,
    curated: boolean,
    summary?: string
  ): Promise<NewsArticle>;

  /** Archive articles */
  archiveArticles(ctx: ServiceContext, ids: string[]): Promise<void>;

  /** Delete an article */
  deleteArticle(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // NEWS FILTERS
  // ============================================

  /** Get all news filters */
  getFilters(ctx: ServiceContext, activeOnly?: boolean): Promise<NewsFilter[]>;

  /** Create a new filter */
  createFilter(
    ctx: ServiceContext,
    data: Omit<NewsFilter, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsFilter>;

  /** Update an existing filter */
  updateFilter(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsFilter>
  ): Promise<NewsFilter>;

  /** Delete a filter */
  deleteFilter(ctx: ServiceContext, id: string): Promise<void>;

  // ============================================
  // DASHBOARD TABS
  // ============================================

  /** Get all dashboard tabs */
  getDashboardTabs(ctx: ServiceContext, activeOnly?: boolean): Promise<NewsDashboardTab[]>;

  /** Create a new dashboard tab */
  createDashboardTab(
    ctx: ServiceContext,
    data: Omit<NewsDashboardTab, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsDashboardTab>;

  /** Update an existing dashboard tab */
  updateDashboardTab(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsDashboardTab>
  ): Promise<NewsDashboardTab>;

  /** Delete a dashboard tab */
  deleteDashboardTab(ctx: ServiceContext, id: string): Promise<void>;

  /** Reorder dashboard tabs */
  reorderDashboardTabs(ctx: ServiceContext, orderedIds: string[]): Promise<void>;

  // ============================================
  // STATS
  // ============================================

  /** Get news statistics */
  getStats(ctx: ServiceContext): Promise<{
    total_articles: number;
    unread_count: number;
    bookmarked_count: number;
    curated_count: number;
    sources_count: number;
    active_sources_count: number;
    last_fetch: string | null;
  }>;
}
