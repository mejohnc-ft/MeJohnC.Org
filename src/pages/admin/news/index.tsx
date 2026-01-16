import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper,
  Rss,
  Filter,
  Settings,
  RefreshCw,
  Loader2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Check,
  Archive,
  Search,
  Star,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  X,
  Globe,
  LayoutGrid,
  Columns2,
  Columns3,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Tag,
  Palette,
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
  getNewsCategories,
  getNewsFilters,
  markArticleRead,
  markArticlesRead,
  toggleArticleBookmark,
  curateArticle,
  archiveArticles,
  createNewsSource,
  updateNewsSource,
  deleteNewsSource,
  createNewsFilter,
  updateNewsFilter,
  deleteNewsFilter,
  createNewsDashboardTab,
  updateNewsDashboardTab,
  deleteNewsDashboardTab,
  reorderNewsDashboardTabs,
  createNewsCategory,
  updateNewsCategory,
  deleteNewsCategory,
  generateSlug,
  type NewsDashboardTab,
  type NewsArticle,
  type NewsSource,
  type NewsCategory,
  type NewsFilter,
  type NewsArticleQueryOptions,
} from '@/lib/supabase-queries';

type ArticleWithSource = NewsArticle & { source: NewsSource | null };
type MainTab = 'feed' | 'sources' | 'filters' | 'settings';
type ColumnView = 1 | 2 | 3;
type FilterType = 'include_keyword' | 'exclude_keyword' | 'include_topic' | 'exclude_source';
type TabType = 'filter' | 'category' | 'source' | 'saved_search' | 'custom';

interface NewsStats {
  total_articles: number;
  unread_count: number;
  bookmarked_count: number;
  curated_count: number;
  sources_count: number;
  active_sources_count: number;
  last_fetch: string | null;
}

const filterTypeLabels: Record<FilterType, string> = {
  include_keyword: 'Include Keywords',
  exclude_keyword: 'Exclude Keywords',
  include_topic: 'Topics',
  exclude_source: 'Excluded Sources',
};

const filterTypeColors: Record<FilterType, string> = {
  include_keyword: 'bg-green-500/10 text-green-500 border-green-500/20',
  exclude_keyword: 'bg-red-500/10 text-red-500 border-red-500/20',
  include_topic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  exclude_source: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

const tabTypeLabels: Record<TabType, string> = {
  filter: 'Predefined Filter',
  category: 'Category',
  source: 'Source',
  saved_search: 'Saved Search',
  custom: 'Custom',
};

const AdminNewsDashboard = () => {
  useSEO({ title: 'News Feed', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  // Main navigation
  const [mainTab, setMainTab] = useState<MainTab>('feed');

  // Feed state
  const [feedTabs, setFeedTabs] = useState<NewsDashboardTab[]>([]);
  const [activeFeedTab, setActiveFeedTab] = useState<string>('all');
  const [articles, setArticles] = useState<ArticleWithSource[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [filters, setFilters] = useState<NewsFilter[]>([]);
  const [stats, setStats] = useState<NewsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [columnView, setColumnView] = useState<ColumnView>(2);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  // Source editor state
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [sourceFormData, setSourceFormData] = useState({
    name: '',
    source_type: 'rss' as 'rss' | 'api',
    url: '',
    api_key: '',
    category_slug: '',
    refresh_interval_minutes: 60,
    is_active: true,
  });

  // Filter state
  const [newFilterType, setNewFilterType] = useState<FilterType>('include_keyword');
  const [newFilterValue, setNewFilterValue] = useState('');
  const [isAddingFilter, setIsAddingFilter] = useState(false);

  // Settings/Tab state
  const [showTabEditor, setShowTabEditor] = useState(false);
  const [editingTab, setEditingTab] = useState<NewsDashboardTab | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [tabFormData, setTabFormData] = useState({
    label: '',
    tab_type: 'filter' as TabType,
    config: {} as Record<string, unknown>,
    icon: '',
    is_active: true,
  });

  // Category state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: 'blue',
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!supabase) return;

    try {
      const [tabsData, sourcesData, categoriesData, filtersData, statsData] = await Promise.all([
        getNewsDashboardTabs(true, supabase),
        getNewsSources(true, supabase),
        getNewsCategories(supabase),
        getNewsFilters(false, supabase),
        getNewsStats(supabase),
      ]);

      setFeedTabs(tabsData);
      setSources(sourcesData);
      setCategories(categoriesData);
      setFilters(filtersData);
      setStats(statsData);

      if (tabsData.length > 0 && !tabsData.find(t => t.slug === activeFeedTab)) {
        setActiveFeedTab(tabsData[0].slug);
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, activeFeedTab]);

  // Fetch articles based on active tab and filters
  const fetchArticles = useCallback(async () => {
    if (!supabase) return;

    setIsRefreshing(true);
    try {
      const currentTab = feedTabs.find(t => t.slug === activeFeedTab);
      const options: NewsArticleQueryOptions = {
        limit: 100,
        search: searchQuery || undefined,
      };

      if (currentTab?.config) {
        const config = currentTab.config as Record<string, unknown>;
        if (config.filter === 'unread') options.isRead = false;
        else if (config.filter === 'bookmarked') options.isBookmarked = true;
        else if (config.filter === 'curated') options.isCurated = true;
        else if (config.filter === 'archived') options.isArchived = true;
        if (config.source_id) options.sourceId = config.source_id as string;
      }

      if (selectedSource) options.sourceId = selectedSource;

      const articlesData = await getNewsArticles(options, supabase);
      setArticles(articlesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.fetchArticles',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, activeFeedTab, feedTabs, searchQuery, selectedSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (feedTabs.length > 0 && mainTab === 'feed') {
      fetchArticles();
    }
  }, [fetchArticles, feedTabs.length, mainTab]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === articles.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(articles.map(a => a.id)));
  };

  // Article action handlers
  const handleMarkRead = async (ids: string[]) => {
    if (!supabase) return;
    try {
      await markArticlesRead(ids, supabase);
      setArticles(prev => prev.map(a => ids.includes(a.id) ? { ...a, is_read: true } : a));
      setSelectedIds(new Set());
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
      setArticles(prev => prev.map(a => a.id === id ? { ...a, is_bookmarked: !isBookmarked } : a));
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
      setArticles(prev => prev.map(a => ids.includes(a.id) ? { ...a, is_curated: true } : a));
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

  const toggleArticle = (articleId: string) => {
    setExpandedArticleId(prev => prev === articleId ? null : articleId);
  };

  // Source handlers
  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setSourceError(null);
    setIsSavingSource(true);

    try {
      const sourceData = {
        name: sourceFormData.name,
        source_type: sourceFormData.source_type,
        url: sourceFormData.url,
        api_key: sourceFormData.api_key || null,
        category_slug: sourceFormData.category_slug || null,
        refresh_interval_minutes: sourceFormData.refresh_interval_minutes,
        is_active: sourceFormData.is_active,
        icon_url: null,
        order_index: sources.length,
      };

      if (editingSource) {
        const updated = await updateNewsSource(editingSource.id, sourceData, supabase);
        setSources(prev => prev.map(s => s.id === editingSource.id ? updated : s));
      } else {
        const created = await createNewsSource(sourceData, supabase);
        setSources(prev => [...prev, created]);
      }

      resetSourceForm();
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleSourceDelete = async (id: string) => {
    if (!supabase || !confirm('Delete this source? All associated articles will also be deleted.')) return;
    try {
      await deleteNewsSource(id, supabase);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleSourceDelete',
      });
    }
  };

  const handleSourceEdit = (source: NewsSource) => {
    setEditingSource(source);
    setSourceFormData({
      name: source.name,
      source_type: source.source_type as 'rss' | 'api',
      url: source.url,
      api_key: source.api_key || '',
      category_slug: source.category_slug || '',
      refresh_interval_minutes: source.refresh_interval_minutes,
      is_active: source.is_active,
    });
    setShowSourceEditor(true);
  };

  const resetSourceForm = () => {
    setShowSourceEditor(false);
    setEditingSource(null);
    setSourceError(null);
    setSourceFormData({
      name: '',
      source_type: 'rss',
      url: '',
      api_key: '',
      category_slug: '',
      refresh_interval_minutes: 60,
      is_active: true,
    });
  };

  // Filter handlers
  const handleAddFilter = async () => {
    if (!supabase || !newFilterValue.trim()) return;

    setIsAddingFilter(true);
    try {
      const created = await createNewsFilter({
        filter_type: newFilterType,
        value: newFilterValue.trim(),
        is_active: true,
      }, supabase);
      setFilters(prev => [created, ...prev]);
      setNewFilterValue('');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleAddFilter',
      });
    } finally {
      setIsAddingFilter(false);
    }
  };

  const handleToggleFilter = async (filter: NewsFilter) => {
    if (!supabase) return;
    try {
      const updated = await updateNewsFilter(filter.id, { is_active: !filter.is_active }, supabase);
      setFilters(prev => prev.map(f => f.id === filter.id ? updated : f));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleToggleFilter',
      });
    }
  };

  const handleDeleteFilter = async (id: string) => {
    if (!supabase) return;
    try {
      await deleteNewsFilter(id, supabase);
      setFilters(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleDeleteFilter',
      });
    }
  };

  // Tab handlers
  const handleTabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    try {
      const slug = editingTab?.slug || generateSlug(tabFormData.label);
      const tabData = {
        slug,
        label: tabFormData.label,
        tab_type: tabFormData.tab_type,
        config: tabFormData.config,
        icon: tabFormData.icon || null,
        is_active: tabFormData.is_active,
        is_pinned: false,
        order_index: feedTabs.length,
      };

      if (editingTab) {
        const updated = await updateNewsDashboardTab(editingTab.id, tabData, supabase);
        setFeedTabs(prev => prev.map(t => t.id === editingTab.id ? updated : t));
      } else {
        const created = await createNewsDashboardTab(tabData, supabase);
        setFeedTabs(prev => [...prev, created]);
      }

      resetTabForm();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleTabSubmit',
      });
    }
  };

  const handleTabDelete = async (tab: NewsDashboardTab) => {
    if (!supabase || tab.is_pinned || !confirm('Delete this tab?')) return;
    try {
      await deleteNewsDashboardTab(tab.id, supabase);
      setFeedTabs(prev => prev.filter(t => t.id !== tab.id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleTabDelete',
      });
    }
  };

  const handleTabToggleActive = async (tab: NewsDashboardTab) => {
    if (!supabase) return;
    try {
      const updated = await updateNewsDashboardTab(tab.id, { is_active: !tab.is_active }, supabase);
      setFeedTabs(prev => prev.map(t => t.id === tab.id ? updated : t));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleTabToggleActive',
      });
    }
  };

  const handleTabEdit = (tab: NewsDashboardTab) => {
    setEditingTab(tab);
    setTabFormData({
      label: tab.label,
      tab_type: tab.tab_type as TabType,
      config: tab.config as Record<string, unknown>,
      icon: tab.icon || '',
      is_active: tab.is_active,
    });
    setShowTabEditor(true);
  };

  const resetTabForm = () => {
    setShowTabEditor(false);
    setEditingTab(null);
    setTabFormData({
      label: '',
      tab_type: 'filter',
      config: {},
      icon: '',
      is_active: true,
    });
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newTabs = [...feedTabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(index, 0, draggedTab);
    setFeedTabs(newTabs);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (!supabase || draggedIndex === null) return;
    setDraggedIndex(null);
    try {
      await reorderNewsDashboardTabs(feedTabs.map(t => t.id), supabase);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsDashboard.handleDragEnd',
      });
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setCategoryError(null);
    setIsSavingCategory(true);

    try {
      const slug = editingCategory?.slug || generateSlug(categoryFormData.name);
      const categoryData = {
        name: categoryFormData.name,
        slug,
        description: categoryFormData.description || null,
        color: categoryFormData.color,
        order_index: categories.length,
      };

      if (editingCategory) {
        const updated = await updateNewsCategory(editingCategory.id, categoryData, supabase);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? updated : c));
      } else {
        const created = await createNewsCategory(categoryData, supabase);
        setCategories(prev => [...prev, created]);
      }

      resetCategoryForm();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleCategoryDelete = async (category: NewsCategory) => {
    if (!supabase || !confirm(`Delete category "${category.name}"?`)) return;
    try {
      await deleteNewsCategory(category.id, supabase);
      setCategories(prev => prev.filter(c => c.id !== category.id));
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCategoryEdit = (category: NewsCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || 'blue',
    });
    setShowCategoryEditor(true);
  };

  const resetCategoryForm = () => {
    setShowCategoryEditor(false);
    setEditingCategory(null);
    setCategoryError(null);
    setCategoryFormData({ name: '', slug: '', description: '', color: 'blue' });
  };

  // Utility functions
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

  const getGridClass = () => {
    switch (columnView) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  const getCategoryColorClass = (color: string | null) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500',
      orange: 'bg-orange-500', red: 'bg-red-500', yellow: 'bg-yellow-500',
    };
    return colorMap[color || 'blue'] || 'bg-blue-500';
  };

  const categoryColors = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  ];

  const groupedFilters = filters.reduce((acc, filter) => {
    const type = filter.filter_type as FilterType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(filter);
    return acc;
  }, {} as Record<FilterType, NewsFilter[]>);

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
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {[
            { id: 'feed', label: 'Feed', icon: Newspaper },
            { id: 'sources', label: 'Sources', icon: Rss },
            { id: 'filters', label: 'Filters', icon: Filter },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as MainTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mainTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feed Tab */}
        {mainTab === 'feed' && (
          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Total</p>
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

            {/* Feed Tabs + View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {feedTabs.map((tab) => {
                  const isActive = activeFeedTab === tab.slug;
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
                      onClick={() => setActiveFeedTab(tab.slug)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tab.label}
                      {count !== undefined && count > 0 && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                          isActive ? 'bg-primary-foreground/20' : 'bg-background'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Column View Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setColumnView(1)}
                  className={`p-2 rounded transition-colors ${
                    columnView === 1 ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  }`}
                  title="Single column"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setColumnView(2)}
                  className={`p-2 rounded transition-colors ${
                    columnView === 2 ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  }`}
                  title="Two columns"
                >
                  <Columns2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setColumnView(3)}
                  className={`p-2 rounded transition-colors ${
                    columnView === 3 ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                  }`}
                  title="Three columns"
                >
                  <Columns3 className="w-4 h-4" />
                </button>
              </div>
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
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="">All Sources</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" onClick={fetchArticles} disabled={isRefreshing} className="gap-2">
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
                  <span className="text-sm font-medium">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => handleMarkRead(Array.from(selectedIds))} className="gap-2">
                      <Check className="w-4 h-4" /> Mark Read
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCurate(Array.from(selectedIds))} className="gap-2">
                      <Star className="w-4 h-4" /> Curate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleArchive(Array.from(selectedIds))} className="gap-2 text-destructive">
                      <Archive className="w-4 h-4" /> Archive
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Select All */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
              <input
                type="checkbox"
                checked={selectedIds.size === articles.length && articles.length > 0}
                onChange={selectAll}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm text-muted-foreground">{articles.length} articles</span>
            </div>

            {/* Article Grid */}
            {articles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No articles found</p>
              </div>
            ) : (
              <div className={`grid ${getGridClass()} gap-4`}>
                {articles.map((article) => {
                  const isExpanded = expandedArticleId === article.id;
                  const hasContent = article.content || article.description;

                  return (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`group ${isExpanded && columnView > 1 ? 'col-span-full' : ''}`}
                    >
                      <div className={`h-full bg-card border rounded-lg overflow-hidden transition-colors ${
                        !article.is_read ? 'border-l-4 border-l-primary border-border' : 'border-border'
                      } ${isExpanded ? 'border-primary/50' : 'hover:border-primary/30'}`}>
                        {/* Article Header */}
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(article.id)}
                              onChange={() => toggleSelection(article.id)}
                              className="w-4 h-4 mt-1 rounded border-border"
                            />
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleArticle(article.id)}>
                              <div className="flex items-center gap-2 mb-1">
                                {article.source && (
                                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{article.source.name}</span>
                                )}
                                {article.is_curated && (
                                  <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">Curated</span>
                                )}
                              </div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={`font-medium text-foreground group-hover:text-primary transition-colors ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {article.title}
                                </h3>
                                {hasContent && (
                                  <button className="flex-shrink-0 p-1 rounded hover:bg-muted">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                              {!isExpanded && article.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{stripHtml(article.description)}</p>
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
                                {article.is_bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && hasContent && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 border-t border-border">
                                <div className="pt-4 prose prose-sm dark:prose-invert max-w-none">
                                  {article.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: article.content }} className="text-muted-foreground" />
                                  ) : article.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: article.description }} className="text-muted-foreground" />
                                  ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!article.is_read) markArticleRead(article.id, supabase!);
                                    }}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    {article.source_url ? 'View linked article' : 'Read full article'}
                                  </a>
                                  {article.source_url && (
                                    <a
                                      href={article.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FileText className="w-4 h-4" />
                                      View {article.source?.name || 'source'} post
                                    </a>
                                  )}
                                  {article.author && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                      <User className="w-3 h-3" /> {article.author}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sources Tab */}
        {mainTab === 'sources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Configure RSS feeds and API endpoints</p>
              <Button onClick={() => setShowSourceEditor(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Source
              </Button>
            </div>

            {sources.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Rss className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sources configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg">
                    <div className={`p-2 rounded-lg ${source.source_type === 'rss' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                      {source.source_type === 'rss' ? <Rss className="w-5 h-5 text-orange-500" /> : <Globe className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{source.name}</h3>
                        {source.is_active ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{source.url}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Last: {formatTimeAgo(source.last_fetched_at)}</span>
                        {source.fetch_error && <span className="text-destructive">Error: {source.fetch_error}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleSourceEdit(source)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSourceDelete(source.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters Tab */}
        {mainTab === 'filters' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Add Filter</h2>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newFilterType}
                    onChange={(e) => setNewFilterType(e.target.value as FilterType)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  >
                    <option value="include_keyword">Include Keyword</option>
                    <option value="exclude_keyword">Exclude Keyword</option>
                    <option value="include_topic">Topic</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="text"
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                    placeholder="e.g., Claude, GPT"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                  />
                </div>
                <Button onClick={handleAddFilter} disabled={isAddingFilter || !newFilterValue.trim()} className="gap-2">
                  {isAddingFilter ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                </Button>
              </div>
            </div>

            {Object.entries(filterTypeLabels).map(([type, label]) => {
              const typeFilters = groupedFilters[type as FilterType] || [];
              if (typeFilters.length === 0 && type !== 'include_keyword') return null;

              return (
                <div key={type} className="space-y-3">
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <div className="flex flex-wrap gap-2">
                    {typeFilters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No filters added</p>
                    ) : (
                      typeFilters.map((filter) => (
                        <div
                          key={filter.id}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${filterTypeColors[type as FilterType]} ${!filter.is_active ? 'opacity-50' : ''}`}
                        >
                          <span className="text-sm font-medium">{filter.value}</span>
                          <button onClick={() => handleToggleFilter(filter)} className="hover:opacity-70">
                            <Check className={`w-3.5 h-3.5 ${filter.is_active ? '' : 'opacity-30'}`} />
                          </button>
                          <button onClick={() => handleDeleteFilter(filter.id)} className="hover:opacity-70">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Settings Tab */}
        {mainTab === 'settings' && (
          <div className="space-y-6">
            {/* Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><Tag className="w-5 h-5" /> Categories</h2>
                  <p className="text-sm text-muted-foreground">Organize news sources into categories</p>
                </div>
                <Button onClick={() => setShowCategoryEditor(true)} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Category
                </Button>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No categories yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColorClass(category.color)}`} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{category.name}</span>
                        {category.description && <p className="text-xs text-muted-foreground truncate">{category.description}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleCategoryEdit(category)}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCategoryDelete(category)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dashboard Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Dashboard Tabs</h2>
                  <p className="text-sm text-muted-foreground">Drag to reorder. Pinned tabs cannot be deleted.</p>
                </div>
                <Button onClick={() => setShowTabEditor(true)} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Tab
                </Button>
              </div>

              {feedTabs.map((tab, index) => (
                <div
                  key={tab.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-move ${
                    draggedIndex === index ? 'opacity-50' : ''
                  } ${!tab.is_active ? 'opacity-60' : ''}`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tab.label}</span>
                      {tab.is_pinned && <Lock className="w-3 h-3 text-muted-foreground" />}
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">{tabTypeLabels[tab.tab_type as TabType]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleTabToggleActive(tab)}>
                      {tab.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    {!tab.is_pinned && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleTabEdit(tab)}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleTabDelete(tab)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Editor Modal */}
        <AnimatePresence>
          {showSourceEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetSourceForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold mb-4">{editingSource ? 'Edit Source' : 'Add Source'}</h2>
                <form onSubmit={handleSourceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input type="text" value={sourceFormData.name} onChange={(e) => setSourceFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg" placeholder="e.g., Anthropic Blog" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select value={sourceFormData.source_type} onChange={(e) => setSourceFormData(prev => ({ ...prev, source_type: e.target.value as 'rss' | 'api' }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg">
                      <option value="rss">RSS Feed</option>
                      <option value="api">News API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL</label>
                    <input type="url" value={sourceFormData.url} onChange={(e) => setSourceFormData(prev => ({ ...prev, url: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg" placeholder="https://example.com/feed.xml" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={sourceFormData.category_slug} onChange={(e) => setSourceFormData(prev => ({ ...prev, category_slug: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg">
                      <option value="">No category</option>
                      {categories.map((cat) => (<option key={cat.id} value={cat.slug}>{cat.name}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="source_is_active" checked={sourceFormData.is_active} onChange={(e) => setSourceFormData(prev => ({ ...prev, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
                    <label htmlFor="source_is_active" className="text-sm">Active</label>
                  </div>
                  {sourceError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{sourceError}</div>}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetSourceForm} disabled={isSavingSource}>Cancel</Button>
                    <Button type="submit" disabled={isSavingSource}>{isSavingSource ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : editingSource ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Editor Modal */}
        <AnimatePresence>
          {showTabEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetTabForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold mb-4">{editingTab ? 'Edit Tab' : 'Add Tab'}</h2>
                <form onSubmit={handleTabSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Label</label>
                    <input type="text" value={tabFormData.label} onChange={(e) => setTabFormData(prev => ({ ...prev, label: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg" placeholder="e.g., Claude News" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select value={tabFormData.tab_type} onChange={(e) => setTabFormData(prev => ({ ...prev, tab_type: e.target.value as TabType, config: {} }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg">
                      {Object.entries(tabTypeLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                  </div>
                  {tabFormData.tab_type === 'filter' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Filter Type</label>
                      <select value={(tabFormData.config.filter as string) || ''} onChange={(e) => setTabFormData(prev => ({ ...prev, config: { filter: e.target.value } }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg">
                        <option value="">Select filter...</option>
                        <option value="all">All Articles</option>
                        <option value="unread">Unread</option>
                        <option value="bookmarked">Bookmarked</option>
                        <option value="curated">Curated</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  )}
                  {tabFormData.tab_type === 'source' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Source</label>
                      <select value={(tabFormData.config.source_id as string) || ''} onChange={(e) => setTabFormData(prev => ({ ...prev, config: { source_id: e.target.value } }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg">
                        <option value="">Select source...</option>
                        {sources.map((source) => (<option key={source.id} value={source.id}>{source.name}</option>))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="tab_is_active" checked={tabFormData.is_active} onChange={(e) => setTabFormData(prev => ({ ...prev, is_active: e.target.checked }))} className="w-4 h-4 rounded" />
                    <label htmlFor="tab_is_active" className="text-sm">Active</label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetTabForm}>Cancel</Button>
                    <Button type="submit">{editingTab ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Editor Modal */}
        <AnimatePresence>
          {showCategoryEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetCategoryForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input type="text" value={categoryFormData.name} onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))} required className="w-full px-3 py-2 bg-background border border-border rounded-lg" placeholder="e.g., AI Research" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (optional)</label>
                    <input type="text" value={categoryFormData.description} onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 bg-background border border-border rounded-lg" placeholder="Brief description" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Color</label>
                    <div className="flex gap-2">
                      {categoryColors.map((color) => (
                        <button key={color.value} type="button" onClick={() => setCategoryFormData(prev => ({ ...prev, color: color.value }))} className={`w-8 h-8 rounded-full ${color.class} ${categoryFormData.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''}`} title={color.label} />
                      ))}
                    </div>
                  </div>
                  {categoryError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{categoryError}</div>}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetCategoryForm} disabled={isSavingCategory}>Cancel</Button>
                    <Button type="submit" disabled={isSavingCategory}>{isSavingCategory ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : editingCategory ? 'Update' : 'Create'}</Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminNewsDashboard;
