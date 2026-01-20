/**
 * NewsFeed Component
 *
 * Displays a scrollable feed of news articles with filtering and search.
 */

'use client';

import { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { ArticleCard } from './ArticleCard';
import { Button } from '@/components/ui/button';
import { type NewsArticleWithSource } from '../schemas';

export interface NewsFeedProps {
  articles: NewsArticleWithSource[];
  onRefresh?: () => void;
  onArticleRead?: (id: string) => void;
  onArticleBookmark?: (id: string, bookmarked: boolean) => void;
  onArticleCurate?: (id: string, curated: boolean) => void;
  isLoading?: boolean;
}

export function NewsFeed({
  articles,
  onRefresh,
  onArticleRead,
  onArticleBookmark,
  onArticleCurate,
  isLoading = false,
}: NewsFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Article List */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No articles found</p>
          </div>
        ) : (
          filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onRead={onArticleRead}
              onBookmark={onArticleBookmark}
              onCurate={onArticleCurate}
            />
          ))
        )}
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredArticles.length} of {articles.length} articles
        </p>
      )}
    </div>
  );
}
