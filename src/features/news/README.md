# News Feature Module

A standalone, modular news aggregation system for MeJohnC.Org.

## Overview

The News module provides comprehensive news aggregation functionality with support for:
- RSS feed parsing
- NewsAPI integration (interface)
- Custom webhook receivers
- Article management and curation
- Multi-source organization
- Category-based filtering

## Architecture

This module follows the modular app design pattern, making it:
- **Portable**: Can be extracted as a standalone product
- **Multi-tenant**: Full tenant isolation support
- **Service-based**: Clean separation between UI and data access
- **Adapter-ready**: Pluggable adapters for different news sources

## Directory Structure

```
src/features/news/
├── index.ts              # Public API
├── module.ts             # FeatureModule definition
├── schemas.ts            # Zod schemas (re-exported)
├── README.md             # This file
├── adapters/
│   ├── rss-adapter.ts        # RSS feed parser (implemented)
│   ├── newsapi-adapter.ts    # NewsAPI integration (interface)
│   └── webhook-adapter.ts    # Custom webhook receiver (interface)
├── components/
│   ├── index.ts
│   ├── NewsFeed.tsx          # Main article feed
│   ├── ArticleCard.tsx       # Individual article display
│   ├── SourceManager.tsx     # Source management UI
│   └── CategoryFilter.tsx    # Category filtering
└── pages/
    ├── index.ts
    ├── FeedPage.tsx          # Main feed page
    └── SourcesPage.tsx       # Source management page
```

## Service Layer

```
src/services/news/
├── index.ts
├── news-service.interface.ts    # INewsService contract
└── news-service.supabase.ts     # Supabase implementation
```

## Usage

### Basic Import

```typescript
import { newsModule, NewsFeed, ArticleCard } from '@/features/news';
import { NewsServiceSupabase } from '@/services/news';
```

### Using the RSS Adapter

```typescript
import { rssAdapter } from '@/features/news';

// Fetch and parse an RSS feed
const feed = await rssAdapter.fetchFeed('https://example.com/feed.xml');

// Convert to articles
const articles = rssAdapter.convertToArticles(feed.items, sourceId);

// Validate a feed URL
const isValid = await rssAdapter.validateSource('https://example.com/feed.xml');
```

### Using the Service

```typescript
import { NewsServiceSupabase } from '@/services/news';

const newsService = new NewsServiceSupabase();
const ctx = { client: supabase };

// Get articles
const articles = await newsService.getArticles(ctx, {
  categorySlug: 'ai-research',
  limit: 20
});

// Manage sources
const sources = await newsService.getSources(ctx);
const newSource = await newsService.createSource(ctx, {
  name: 'Anthropic Blog',
  source_type: 'rss',
  url: 'https://www.anthropic.com/feed.xml',
  is_active: true,
  // ...
});

// Curate articles
await newsService.curateArticle(ctx, articleId, true, 'Great insights!');
```

### Using Components

```typescript
import { NewsFeed, CategoryFilter } from '@/features/news';

function NewsPage() {
  return (
    <div>
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />
      <NewsFeed
        articles={articles}
        onRefresh={fetchArticles}
        onArticleRead={handleRead}
        onArticleBookmark={handleBookmark}
        onArticleCurate={handleCurate}
      />
    </div>
  );
}
```

## Database Tables

The news module uses these tables (all prefixed with `news_`):

- `news_categories` - Category organization
- `news_sources` - RSS feeds and API endpoints
- `news_articles` - Article content and metadata
- `news_filters` - Keyword and topic filters
- `news_dashboard_tabs` - Custom dashboard views

## Adapters

### RSS Adapter (Implemented)

Full RSS 2.0 and Atom feed support:
- XML parsing with error handling
- Field extraction and normalization
- Request timeout and user-agent configuration

### NewsAPI Adapter (Interface)

Interface for NewsAPI.org integration:
- Search articles by keyword
- Get top headlines by category
- Requires API key (not implemented)

### Webhook Adapter (Interface)

Interface for receiving articles via webhooks:
- Custom payload validation
- HMAC signature verification
- IP whitelisting

## Permissions

The module defines these permissions:
- `news:read` - View news articles and sources

## Routes

- `/admin/news` - Main news feed
- `/admin/news/sources` - Source management

## Future Enhancements

1. **Implement NewsAPI adapter** - Add actual API calls with key management
2. **Implement webhook adapter** - Add signature validation and endpoint
3. **Add AI summarization** - Integrate with AI service for article summaries
4. **RSS feed polling** - Background job to fetch new articles
5. **Advanced filtering** - ML-based content filtering
6. **Reading list** - Save articles for later
7. **Email digests** - Daily/weekly email summaries

## Testing

```bash
# Run service tests
npm test -- src/services/news

# Run component tests
npm test -- src/features/news
```

## Migration

To extract this module as a standalone app:

1. Copy `src/features/news/` and `src/services/news/`
2. Copy relevant schemas from `src/lib/schemas.ts`
3. Copy news-related queries from `src/lib/news-queries.ts`
4. Set up database with tables listed above
5. Configure environment variables for API keys
6. Deploy as independent service

## License

Part of MeJohnC.Org - See main LICENSE file
