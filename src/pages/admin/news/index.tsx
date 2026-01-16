import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper,
  Settings,
  Rss,
  Filter,
  RefreshCw,
  Loader2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Check,
  Archive,
  Search,
  Star,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getNewsDashboardTabs,
  getNewsArticles,
  getNewsStats,
  getNewsSources,
  markArticleRead,
  markArticlesRead,
  toggleArticleBookmark,
  curateArticle,
  archiveArticles,
  type NewsDashboardTab,
  type NewsArticle,
  type NewsSource,
  type NewsArticleQueryOptions,
} from '@/lib/supabase-queries';

type ArticleWithSource = NewsArticle & { source: NewsSource | null };

interface NewsStats {
  total_articles: number;
  unread_count: number;
  bookmarked_count: number;
  curated_count: number;
  sources_count: number;
  active_sources_count: number;
  last_fetch: string | null;
}

const AdminNewsDashboard = () => {
  useSEO({ title: 'News Feed', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  // State
  const [tabs, setTabs] = useState<NewsDashboardTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [articles, setArticles] = useState<ArticleWithSource[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!supabase) return;

    try {
      const [tabsData, sourcesData, statsData] = await Promise.all([
        getNewsDashboardTabs(true, supabase),
        getNewsSources(true, supabase),
        getNewsStats(supabase),
      ]);

      setTabs(tabsData);
      setSources(sourcesData);
      setStats(statsData);

      // Set default active tab
      if (tabsData.length > 0 && !tabsData.find(t => t.slug === activeTab)) {
        setActiveTab(tabsData[0].slug);
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, activeTab]);

  // Fetch articles based on active tab and filters
  const fetchArticles = useCallback(async () => {
    if (!supabase) return;

    setIsRefreshing(true);
    try {
      const currentTab = tabs.find(t => t.slug === activeTab);
      const options: NewsArticleQueryOptions = {
        limit: 50,
        search: searchQuery || undefined,
      };

      // Apply tab config filters
      if (currentTab?.config) {
        const config = currentTab.config as Record<string, unknown>;
        if (config.filter === 'unread') {
          options.isRead = false;
        } else if (config.filter === 'bookmarked') {
          options.isBookmarked = true;
        } else if (config.filter === 'curated') {
          options.isCurated = true;
        } else if (config.filter === 'archived') {
          options.isArchived = true;
        }

        if (config.source_id) {
          options.sourceId = config.source_id as string;
        }
      }

      // Apply quick filters
      if (selectedSource) {
        options.sourceId = selectedSource;
      }

      const articlesData = await getNewsArticles(options, supabase);
      setArticles(articlesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.fetchArticles',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, activeTab, tabs, searchQuery, selectedSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tabs.length > 0) {
      fetchArticles();
    }
  }, [fetchArticles, tabs.length]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  };

  // Action handlers
  const handleMarkRead = async (ids: string[]) => {
    if (!supabase) return;
    try {
      await markArticlesRead(ids, supabase);
      setArticles(prev => prev.map(a =>
        ids.includes(a.id) ? { ...a, is_read: true } : a
      ));
      setSelectedIds(new Set());
      // Refresh stats
      const statsData = await getNewsStats(supabase);
      setStats(statsData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleMarkRead',
      });
    }
  };

  const handleToggleBookmark = async (id: string, isBookmarked: boolean) => {
    if (!supabase) return;
    try {
      await toggleArticleBookmark(id, !isBookmarked, supabase);
      setArticles(prev => prev.map(a =>
        a.id === id ? { ...a, is_bookmarked: !isBookmarked } : a
      ));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleToggleBookmark',
      });
    }
  };

  const handleCurate = async (ids: string[]) => {
    if (!supabase) return;
    try {
      await Promise.all(ids.map(id => curateArticle(id, true, undefined, supabase)));
      setArticles(prev => prev.map(a =>
        ids.includes(a.id) ? { ...a, is_curated: true } : a
      ));
      setSelectedIds(new Set());
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleCurate',
      });
    }
  };

  const handleArchive = async (ids: string[]) => {
    if (!supabase) return;
    try {
      await archiveArticles(ids, supabase);
      setArticles(prev => prev.filter(a => !ids.includes(a.id)));
      setSelectedIds(new Set());
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleArchive',
      });
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Newspaper className="w-8 h-8" />
              News Feed
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI news sources and curate content
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/news/sources" className="gap-2">
                <Rss className="w-4 h-4" />
                Sources
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/news/filters" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/news/settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Articles</p>
              <p className="text-2xl font-bold text-foreground">{stats.total_articles}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Unread</p>
              <p className="text-2xl font-bold text-blue-500">{stats.unread_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Bookmarked</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.bookmarked_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Curated</p>
              <p className="text-2xl font-bold text-green-500">{stats.curated_count}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.slug;
            const config = tab.config as Record<string, unknown>;
            let count: number | undefined;

            if (stats) {
              if (config.filter === 'unread') count = stats.unread_count;
              else if (config.filter === 'bookmarked') count = stats.bookmarked_count;
              else if (config.filter === 'curated') count = stats.curated_count;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.slug)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    isActive ? 'bg-primary-foreground/20' : 'bg-background'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchArticles}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg"
            >
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkRead(Array.from(selectedIds))}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  Mark Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCurate(Array.from(selectedIds))}
                  className="gap-2"
                >
                  <Star className="w-4 h-4" />
                  Curate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchive(Array.from(selectedIds))}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Article List */}
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
            <input
              type="checkbox"
              checked={selectedIds.size === articles.length && articles.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm text-muted-foreground">
              {articles.length} articles
            </span>
          </div>

          {/* Articles */}
          {articles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No articles found</p>
              <p className="text-sm mt-1">
                Add some sources to start fetching news
              </p>
            </div>
          ) : (
            articles.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors ${
                  !article.is_read ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(article.id)}
                  onChange={() => toggleSelection(article.id)}
                  className="w-4 h-4 mt-1 rounded border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {article.source && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {article.source.name}
                      </span>
                    )}
                    {article.is_curated && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
                        Curated
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground line-clamp-1">
                    {article.title}
                  </h3>
                  {article.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{formatTimeAgo(article.published_at)}</span>
                    {article.author && <span>by {article.author}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleBookmark(article.id, article.is_bookmarked)}
                    className={article.is_bookmarked ? 'text-yellow-500' : 'text-muted-foreground'}
                  >
                    {article.is_bookmarked ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => !article.is_read && markArticleRead(article.id, supabase!)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNewsDashboard;
