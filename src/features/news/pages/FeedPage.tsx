/**
 * Feed Page
 *
 * Main news feed page with article list, filtering, and search.
 */

'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Loader2 } from 'lucide-react';
import { NewsFeed } from '../components/NewsFeed';
import { CategoryFilter } from '../components/CategoryFilter';
import { NewsServiceSupabase } from '@/services/news';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { type NewsArticleWithSource, type NewsCategory } from '../schemas';

const newsService = new NewsServiceSupabase();

export default function FeedPage() {
  useSEO({ title: 'News Feed', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [articles, setArticles] = useState<NewsArticleWithSource[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchArticles();
    }
  }, [selectedCategory]);

  const fetchData = async () => {
    try {
      const [articlesData, categoriesData] = await Promise.all([
        newsService.getArticles({ client: supabase }),
        newsService.getCategories({ client: supabase }),
      ]);

      setArticles(articlesData);
      setCategories(categoriesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'FeedPage.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const options = selectedCategory ? { categorySlug: selectedCategory } : {};
      const articlesData = await newsService.getArticles({ client: supabase }, options);
      setArticles(articlesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'FeedPage.fetchArticles',
      });
    }
  };

  const handleArticleRead = async (id: string) => {
    try {
      await newsService.markArticleRead({ client: supabase }, id);
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'FeedPage.handleArticleRead',
      });
    }
  };

  const handleArticleBookmark = async (id: string, bookmarked: boolean) => {
    try {
      await newsService.toggleArticleBookmark({ client: supabase }, id, !bookmarked);
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_bookmarked: !bookmarked } : a))
      );
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'FeedPage.handleArticleBookmark',
      });
    }
  };

  const handleArticleCurate = async (id: string, curated: boolean) => {
    try {
      await newsService.curateArticle({ client: supabase }, id, !curated);
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_curated: !curated } : a)));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'FeedPage.handleArticleCurate',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Newspaper className="w-8 h-8" />
          News Feed
        </h1>
        <p className="text-muted-foreground mt-1">
          Stay updated with the latest news from your sources
        </p>
      </div>

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* News Feed */}
      <NewsFeed
        articles={articles}
        onRefresh={fetchArticles}
        onArticleRead={handleArticleRead}
        onArticleBookmark={handleArticleBookmark}
        onArticleCurate={handleArticleCurate}
      />
    </div>
  );
}
