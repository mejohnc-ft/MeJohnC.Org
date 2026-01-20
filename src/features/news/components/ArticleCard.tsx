/**
 * ArticleCard Component
 *
 * Displays a single news article with actions.
 */

'use client';

import { useState } from 'react';
import { ExternalLink, Bookmark, BookmarkCheck, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type NewsArticleWithSource } from '../schemas';

export interface ArticleCardProps {
  article: NewsArticleWithSource;
  onRead?: (id: string) => void;
  onBookmark?: (id: string, bookmarked: boolean) => void;
  onCurate?: (id: string, curated: boolean) => void;
}

export function ArticleCard({ article, onRead, onBookmark, onCurate }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleArticleClick = () => {
    if (!article.is_read && onRead) {
      onRead(article.id);
    }
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const stripHtml = (html: string | null) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const hasContent = article.content || article.description;

  return (
    <div
      className={`bg-card border rounded-lg overflow-hidden transition-colors ${
        !article.is_read ? 'border-l-4 border-l-primary border-border' : 'border-border'
      } ${isExpanded ? 'border-primary/50' : 'hover:border-primary/30'}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Source and badges */}
            <div className="flex items-center gap-2 mb-1">
              {article.source && (
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                  {article.source.name}
                </span>
              )}
              {article.is_curated && (
                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" fill="currentColor" />
                  Curated
                </span>
              )}
            </div>

            {/* Title */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block font-medium text-foreground hover:text-primary transition-colors ${
                isExpanded ? '' : 'line-clamp-2'
              }`}
              onClick={handleArticleClick}
            >
              {article.title}
            </a>

            {/* Description */}
            {!isExpanded && article.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {stripHtml(article.description)}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{formatTimeAgo(article.published_at)}</span>
              {article.author && <span>by {article.author}</span>}
              {hasContent && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {isExpanded ? (
                    <>
                      Hide preview <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show preview <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {onCurate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCurate(article.id, article.is_curated)}
                className={
                  article.is_curated
                    ? 'text-green-500 hover:text-green-600'
                    : 'text-muted-foreground hover:text-green-500'
                }
                title={article.is_curated ? 'Remove from curated' : 'Add to curated'}
              >
                <Star className="w-4 h-4" fill={article.is_curated ? 'currentColor' : 'none'} />
              </Button>
            )}
            {onBookmark && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onBookmark(article.id, article.is_bookmarked)}
                className={
                  article.is_bookmarked
                    ? 'text-yellow-500'
                    : 'text-muted-foreground hover:text-yellow-500'
                }
                title={article.is_bookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {article.is_bookmarked ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-primary transition-colors"
              title="Open article"
              onClick={handleArticleClick}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && hasContent && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {article.content ? (
                <div
                  dangerouslySetInnerHTML={{ __html: article.content }}
                  className="text-muted-foreground"
                />
              ) : article.description ? (
                <div
                  dangerouslySetInnerHTML={{ __html: article.description }}
                  className="text-muted-foreground"
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
