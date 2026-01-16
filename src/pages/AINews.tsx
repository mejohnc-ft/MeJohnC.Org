import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Loader2, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/lib/seo';
import { useSupabaseClient } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import {
  getCuratedArticles,
  getNewsCategories,
  type NewsArticle,
  type NewsSource,
  type NewsCategory,
} from '@/lib/supabase-queries';

type ArticleWithSource = NewsArticle & { source: NewsSource | null };

const categoryColors: Record<string, string> = {
  'ai-research': 'bg-blue-500/10 text-blue-500',
  'industry': 'bg-green-500/10 text-green-500',
  'tools': 'bg-purple-500/10 text-purple-500',
  'tutorials': 'bg-orange-500/10 text-orange-500',
};

const AINews = () => {
  useSEO({
    title: 'AI News',
    description: 'Curated AI news from Anthropic, OpenAI, HuggingFace, and more. Stay updated on the latest in AI research and tools.',
    url: '/ai-news',
  });

  const supabase = useSupabaseClient();
  const [articles, setArticles] = useState<ArticleWithSource[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(12);

  const fetchData = useCallback(async () => {
    if (!supabase) return;

    try {
      const [articlesData, categoriesData] = await Promise.all([
        getCuratedArticles(50, supabase),
        getNewsCategories(supabase),
      ]);
      setArticles(articlesData);
      setCategories(categoriesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AINews.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredArticles = selectedCategory
    ? articles.filter(a => a.source?.category_slug === selectedCategory)
    : articles;

  const visibleArticles = filteredArticles.slice(0, loadedCount);
  const hasMore = loadedCount < filteredArticles.length;

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const featuredArticle = visibleArticles[0];
  const gridArticles = visibleArticles.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-12 px-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              AI News
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Curated updates from the AI frontier. Research papers, industry news, and tools.
            </p>
          </motion.div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 mb-8"
          >
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>
        )}

        {/* No Articles */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No curated articles yet</p>
            <p className="text-sm mt-2">Check back soon for AI news and insights</p>
          </div>
        )}

        {/* Featured Article */}
        {featuredArticle && (
          <motion.a
            href={featuredArticle.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="block mb-12 group"
          >
            <div className="relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
              {featuredArticle.image_url && (
                <div className="aspect-[21/9] bg-muted">
                  <img
                    src={featuredArticle.image_url}
                    alt={featuredArticle.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  {featuredArticle.source?.category_slug && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      categoryColors[featuredArticle.source.category_slug] || 'bg-muted text-muted-foreground'
                    }`}>
                      {categories.find(c => c.slug === featuredArticle.source?.category_slug)?.name || 'News'}
                    </span>
                  )}
                  {featuredArticle.source && (
                    <span className="text-xs text-muted-foreground">
                      {featuredArticle.source.name}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {featuredArticle.title}
                </h2>
                {(featuredArticle.curated_summary || featuredArticle.description) && (
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {featuredArticle.curated_summary || featuredArticle.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatTimeAgo(featuredArticle.published_at)}
                  </span>
                  {featuredArticle.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {featuredArticle.author}
                    </span>
                  )}
                  <ExternalLink className="w-4 h-4 ml-auto group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </motion.a>
        )}

        {/* Article Grid */}
        {gridArticles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {gridArticles.map((article, index) => (
              <motion.a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index % 6) }}
                className="group"
              >
                <div className="h-full bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                  {article.image_url && (
                    <div className="aspect-video bg-muted">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {article.source?.category_slug && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          categoryColors[article.source.category_slug] || 'bg-muted text-muted-foreground'
                        }`}>
                          {categories.find(c => c.slug === article.source?.category_slug)?.name || 'News'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {article.curated_summary || article.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{article.source?.name}</span>
                      <span>{formatTimeAgo(article.published_at)}</span>
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setLoadedCount(prev => prev + 12)}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AINews;
