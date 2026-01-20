/**
 * News Service - Supabase Implementation
 *
 * Implements INewsService using direct Supabase client access.
 * Delegates to news-queries.ts for actual database operations.
 */

import { INewsService } from './news-service.interface';
import { ServiceContext } from '../types';
import { getSupabase } from '@/lib/supabase';
import * as newsQueries from '@/lib/news-queries';
import {
  type NewsCategory,
  type NewsSource,
  type NewsArticle,
  type NewsArticleWithSource,
  type NewsFilter,
  type NewsDashboardTab,
} from '@/lib/schemas';
import { type NewsArticleQueryOptions } from '@/lib/news-queries';

/**
 * Get Supabase client from context, falling back to default.
 */
function getClient(ctx: ServiceContext) {
  return ctx.client ?? getSupabase();
}

export class NewsServiceSupabase implements INewsService {
  readonly serviceName = 'NewsService';

  // ============================================
  // NEWS CATEGORIES
  // ============================================

  async getCategories(ctx: ServiceContext): Promise<NewsCategory[]> {
    return newsQueries.getNewsCategories(getClient(ctx));
  }

  async getCategoryById(ctx: ServiceContext, id: string): Promise<NewsCategory> {
    const categories = await newsQueries.getNewsCategories(getClient(ctx));
    const category = categories.find(c => c.id === id);
    if (!category) throw new Error(`Category not found: ${id}`);
    return category;
  }

  async getCategoryBySlug(ctx: ServiceContext, slug: string): Promise<NewsCategory> {
    return newsQueries.getNewsCategoryBySlug(slug, getClient(ctx));
  }

  async createCategory(
    ctx: ServiceContext,
    data: Omit<NewsCategory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsCategory> {
    return newsQueries.createNewsCategory(data, getClient(ctx));
  }

  async updateCategory(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsCategory>
  ): Promise<NewsCategory> {
    return newsQueries.updateNewsCategory(id, data, getClient(ctx));
  }

  async deleteCategory(ctx: ServiceContext, id: string): Promise<void> {
    return newsQueries.deleteNewsCategory(id, getClient(ctx));
  }

  async reorderCategories(ctx: ServiceContext, orderedIds: string[]): Promise<void> {
    return newsQueries.reorderNewsCategories(orderedIds, getClient(ctx));
  }

  // ============================================
  // NEWS SOURCES
  // ============================================

  async getSources(ctx: ServiceContext, includeInactive = false): Promise<NewsSource[]> {
    return newsQueries.getNewsSources(includeInactive, getClient(ctx));
  }

  async getSourceById(ctx: ServiceContext, id: string): Promise<NewsSource> {
    return newsQueries.getNewsSourceById(id, getClient(ctx));
  }

  async getSourcesByCategory(ctx: ServiceContext, categorySlug: string): Promise<NewsSource[]> {
    const allSources = await newsQueries.getNewsSources(true, getClient(ctx));
    return allSources.filter(s => s.category_slug === categorySlug);
  }

  async createSource(
    ctx: ServiceContext,
    data: Omit<NewsSource, 'id' | 'created_at' | 'updated_at' | 'last_fetched_at' | 'fetch_error'>
  ): Promise<NewsSource> {
    return newsQueries.createNewsSource(data, getClient(ctx));
  }

  async updateSource(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsSource>
  ): Promise<NewsSource> {
    return newsQueries.updateNewsSource(id, data, getClient(ctx));
  }

  async deleteSource(ctx: ServiceContext, id: string): Promise<void> {
    return newsQueries.deleteNewsSource(id, getClient(ctx));
  }

  async reorderSources(ctx: ServiceContext, orderedIds: string[]): Promise<void> {
    return newsQueries.reorderNewsSources(orderedIds, getClient(ctx));
  }

  // ============================================
  // NEWS ARTICLES
  // ============================================

  async getArticles(ctx: ServiceContext, options?: NewsArticleQueryOptions): Promise<NewsArticleWithSource[]> {
    return newsQueries.getNewsArticles(options, getClient(ctx));
  }

  async getArticleById(ctx: ServiceContext, id: string): Promise<NewsArticleWithSource> {
    return newsQueries.getNewsArticleById(id, getClient(ctx));
  }

  async getRecentArticles(ctx: ServiceContext, limit = 20): Promise<NewsArticleWithSource[]> {
    return newsQueries.getNewsArticles({ limit, isArchived: false }, getClient(ctx));
  }

  async getCuratedArticles(ctx: ServiceContext): Promise<NewsArticleWithSource[]> {
    return newsQueries.getCuratedArticles(20, getClient(ctx));
  }

  async searchArticles(ctx: ServiceContext, query: string): Promise<NewsArticleWithSource[]> {
    return newsQueries.getNewsArticles({ search: query }, getClient(ctx));
  }

  async createArticle(
    ctx: ServiceContext,
    data: Omit<NewsArticle, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsArticle> {
    return newsQueries.createNewsArticle(data, getClient(ctx));
  }

  async updateArticle(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsArticle>
  ): Promise<NewsArticle> {
    return newsQueries.updateNewsArticle(id, data, getClient(ctx));
  }

  async markArticleRead(ctx: ServiceContext, id: string): Promise<void> {
    await newsQueries.markArticleRead(id, getClient(ctx));
  }

  async markArticlesRead(ctx: ServiceContext, ids: string[]): Promise<void> {
    await newsQueries.markArticlesRead(ids, getClient(ctx));
  }

  async toggleArticleBookmark(ctx: ServiceContext, id: string, bookmarked: boolean): Promise<void> {
    await newsQueries.toggleArticleBookmark(id, bookmarked, getClient(ctx));
  }

  async curateArticle(
    ctx: ServiceContext,
    id: string,
    curated: boolean,
    summary?: string
  ): Promise<NewsArticle> {
    return newsQueries.curateArticle(id, curated, summary, getClient(ctx));
  }

  async archiveArticles(ctx: ServiceContext, ids: string[]): Promise<void> {
    await newsQueries.archiveArticles(ids, getClient(ctx));
  }

  async deleteArticle(ctx: ServiceContext, id: string): Promise<void> {
    await newsQueries.deleteNewsArticle(id, getClient(ctx));
  }

  // ============================================
  // NEWS FILTERS
  // ============================================

  async getFilters(ctx: ServiceContext, activeOnly = true): Promise<NewsFilter[]> {
    return newsQueries.getNewsFilters(activeOnly, getClient(ctx));
  }

  async createFilter(
    ctx: ServiceContext,
    data: Omit<NewsFilter, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsFilter> {
    return newsQueries.createNewsFilter(data, getClient(ctx));
  }

  async updateFilter(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsFilter>
  ): Promise<NewsFilter> {
    return newsQueries.updateNewsFilter(id, data, getClient(ctx));
  }

  async deleteFilter(ctx: ServiceContext, id: string): Promise<void> {
    await newsQueries.deleteNewsFilter(id, getClient(ctx));
  }

  // ============================================
  // DASHBOARD TABS
  // ============================================

  async getDashboardTabs(ctx: ServiceContext, activeOnly = true): Promise<NewsDashboardTab[]> {
    return newsQueries.getNewsDashboardTabs(activeOnly, getClient(ctx));
  }

  async createDashboardTab(
    ctx: ServiceContext,
    data: Omit<NewsDashboardTab, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NewsDashboardTab> {
    return newsQueries.createNewsDashboardTab(data, getClient(ctx));
  }

  async updateDashboardTab(
    ctx: ServiceContext,
    id: string,
    data: Partial<NewsDashboardTab>
  ): Promise<NewsDashboardTab> {
    return newsQueries.updateNewsDashboardTab(id, data, getClient(ctx));
  }

  async deleteDashboardTab(ctx: ServiceContext, id: string): Promise<void> {
    await newsQueries.deleteNewsDashboardTab(id, getClient(ctx));
  }

  async reorderDashboardTabs(ctx: ServiceContext, orderedIds: string[]): Promise<void> {
    await newsQueries.reorderNewsDashboardTabs(orderedIds, getClient(ctx));
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(ctx: ServiceContext): Promise<{
    total_articles: number;
    unread_count: number;
    bookmarked_count: number;
    curated_count: number;
    sources_count: number;
    active_sources_count: number;
    last_fetch: string | null;
  }> {
    return newsQueries.getNewsStats(getClient(ctx));
  }
}
