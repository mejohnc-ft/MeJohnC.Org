/**
 * News Feature Module
 *
 * Public API for the news feature.
 * This module provides news aggregation functionality including:
 * - RSS feed parsing
 * - NewsAPI integration (interface)
 * - Webhook receiver (interface)
 * - Article management
 * - Source management
 * - Category organization
 *
 * @see docs/modular-app-design-spec.md
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/112
 */

// Module definition
export { newsModule } from './module';

// Components
export { NewsFeed, ArticleCard, SourceManager, CategoryFilter } from './components';

// Pages (lazy-loaded, so also available via module.frontendRoutes)
export { FeedPage, SourcesPage } from './pages';

// Schemas (re-exported from central schemas for convenience)
export {
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
  type NewsCategory,
  type NewsSource,
  type NewsSourceWithCategory,
  type NewsArticle,
  type NewsArticleWithSource,
  type NewsFilter,
  type NewsDashboardTab,
} from './schemas';

// Adapters
export { RssAdapter, rssAdapter } from './adapters/rss-adapter';
export { NewsApiAdapter, type INewsApiAdapter } from './adapters/newsapi-adapter';
export { WebhookAdapter, webhookAdapter, type IWebhookAdapter } from './adapters/webhook-adapter';
