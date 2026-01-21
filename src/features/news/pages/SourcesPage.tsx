/**
 * Sources Page
 *
 * Manage news sources (RSS feeds, API endpoints).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Rss, Loader2 } from 'lucide-react';
import { SourceManager } from '../components/SourceManager';
import { NewsServiceSupabase } from '@/services/news';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { type NewsSource, type NewsCategory } from '../schemas';

const newsService = new NewsServiceSupabase();

export default function SourcesPage() {
  useSEO({ title: 'News Sources', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [sources, setSources] = useState<NewsSource[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sourcesData, categoriesData] = await Promise.all([
        newsService.getSources({ client: supabase }, true),
        newsService.getCategories({ client: supabase }),
      ]);

      setSources(sourcesData);
      setCategories(categoriesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SourcesPage.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSourceCreate = async (data: Partial<NewsSource>) => {
    try {
      const created = await newsService.createSource({ client: supabase }, {
        name: data.name || '',
        source_type: data.source_type || 'rss',
        url: data.url || '',
        api_key: data.api_key || null,
        category_slug: data.category_slug || null,
        refresh_interval_minutes: data.refresh_interval_minutes || 60,
        is_active: data.is_active ?? true,
        icon_url: null,
        order_index: sources.length,
        tenant_id: '00000000-0000-0000-0000-000000000001',
      });
      setSources((prev) => [...prev, created]);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SourcesPage.handleSourceCreate',
      });
    }
  };

  const handleSourceUpdate = async (id: string, data: Partial<NewsSource>) => {
    try {
      const updated = await newsService.updateSource({ client: supabase }, id, data);
      setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SourcesPage.handleSourceUpdate',
      });
    }
  };

  const handleSourceDelete = async (id: string) => {
    if (!confirm('Delete this source? All associated articles will also be deleted.')) {
      return;
    }

    try {
      await newsService.deleteSource({ client: supabase }, id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SourcesPage.handleSourceDelete',
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
          <Rss className="w-8 h-8" />
          News Sources
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your news sources and RSS feeds
        </p>
      </div>

      {/* Source Manager */}
      <SourceManager
        sources={sources}
        categories={categories}
        onSourceCreate={handleSourceCreate}
        onSourceUpdate={handleSourceUpdate}
        onSourceDelete={handleSourceDelete}
      />
    </div>
  );
}
