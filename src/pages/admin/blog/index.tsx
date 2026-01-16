import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Eye,
  Loader2,
  CheckSquare,
  Square,
  Send,
  Archive,
  Newspaper,
  PenTool,
  Star,
  ExternalLink,
  Ghost,
  Globe,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getBlogPosts,
  deleteBlogPost,
  bulkDeleteBlogPosts,
  bulkUpdateBlogPostStatus,
  getCuratedArticles,
  curateArticle,
  type BlogPost,
  type NewsArticle,
  type NewsSource,
} from '@/lib/supabase-queries';
import { getGhostPosts, type GhostPost } from '@/lib/ghost';
import { formatDate } from '@/lib/markdown';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

type ContentTab = 'all' | 'me' | 'news';
type ArticleWithSource = NewsArticle & { source: NewsSource | null };

// Unified content item for display
interface UnifiedContent {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  reading_time: number | null;
  status: 'published' | 'draft' | 'scheduled' | 'curated';
  source: 'local' | 'ghost' | 'news';
  url?: string;
  sourceName?: string;
  tags?: string[];
}

function localToUnified(post: BlogPost): UnifiedContent {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    cover_image: post.cover_image,
    published_at: post.published_at,
    reading_time: post.reading_time,
    status: post.status,
    source: 'local',
    tags: post.tags || [],
  };
}

function ghostToUnified(post: GhostPost): UnifiedContent {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || post.custom_excerpt || null,
    cover_image: post.feature_image || null,
    published_at: post.published_at || null,
    reading_time: post.reading_time || null,
    status: 'published',
    source: 'ghost',
    tags: post.tags?.map(t => t.name) || [],
  };
}

function newsToUnified(article: ArticleWithSource): UnifiedContent {
  return {
    id: article.id,
    title: article.title,
    slug: article.id,
    excerpt: article.curated_summary || article.description,
    cover_image: article.image_url,
    published_at: article.curated_at || article.published_at,
    reading_time: null,
    status: 'curated',
    source: 'news',
    url: article.url,
    sourceName: article.source?.name || 'External',
  };
}

const AdminContentList = () => {
  useSEO({ title: 'Manage Content', noIndex: true });
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as ContentTab) || 'all';
  const statusFilter = searchParams.get('status');
  const { supabase } = useAuthenticatedSupabase();

  const [localPosts, setLocalPosts] = useState<BlogPost[]>([]);
  const [ghostPosts, setGhostPosts] = useState<GhostPost[]>([]);
  const [curatedNews, setCuratedNews] = useState<ArticleWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [uncuratingId, setUncuratingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    try {
      const [posts, ghost, curated] = await Promise.all([
        getBlogPosts(true, supabase),
        getGhostPosts().catch(() => []),
        getCuratedArticles(100, supabase),
      ]);
      setLocalPosts(posts);
      setGhostPosts(ghost);
      setCuratedNews(curated);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminContent.fetchData' });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert to unified format
  const unifiedLocal = localPosts.map(localToUnified);
  const unifiedGhost = ghostPosts.map(ghostToUnified);
  const unifiedNews = curatedNews.map(newsToUnified);

  // Get content based on active tab
  const getFilteredContent = (): UnifiedContent[] => {
    let content: UnifiedContent[] = [];

    switch (activeTab) {
      case 'me':
        content = [...unifiedLocal, ...unifiedGhost];
        break;
      case 'news':
        content = unifiedNews;
        break;
      case 'all':
      default:
        content = [...unifiedLocal, ...unifiedGhost, ...unifiedNews];
    }

    // Apply status filter for local posts
    if (statusFilter && activeTab !== 'news') {
      content = content.filter(c =>
        c.source === 'news' ? true : c.status === statusFilter
      );
    }

    // Sort by date
    return content.sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });
  };

  const filteredContent = getFilteredContent();

  // Handlers
  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setDeletingId(id);
    try {
      await deleteBlogPost(id, supabase);
      setLocalPosts(localPosts.filter((p) => p.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminContent.deletePost' });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUncurate(id: string) {
    setUncuratingId(id);
    try {
      await curateArticle(id, false, undefined, supabase!);
      setCuratedNews(curatedNews.filter((a) => a.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminContent.uncurate' });
    } finally {
      setUncuratingId(null);
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    const localIds = filteredContent.filter(c => c.source === 'local').map(c => c.id);
    if (selectedIds.size === localIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localIds));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} post(s)?`)) return;
    setIsBulkProcessing(true);
    try {
      await bulkDeleteBlogPosts(Array.from(selectedIds), supabase);
      setLocalPosts(localPosts.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminContent.bulkDelete' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkPublish() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateBlogPostStatus(Array.from(selectedIds), 'published', supabase);
      setLocalPosts(localPosts.map((p) =>
        selectedIds.has(p.id)
          ? { ...p, status: 'published' as const, published_at: p.published_at || new Date().toISOString() }
          : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminContent.bulkPublish' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkUnpublish() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateBlogPostStatus(Array.from(selectedIds), 'draft', supabase);
      setLocalPosts(localPosts.map((p) =>
        selectedIds.has(p.id) ? { ...p, status: 'draft' as const } : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminContent.bulkUnpublish' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  const setTab = (tab: ContentTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    params.delete('status');
    setSearchParams(params);
    setSelectedIds(new Set());
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'local': return <PenTool className="w-3 h-3" />;
      case 'ghost': return <Ghost className="w-3 h-3" />;
      case 'news': return <Globe className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'local': return 'Site';
      case 'ghost': return 'Ghost';
      case 'news': return 'News';
      default: return source;
    }
  };

  // Count stats
  const localPublished = localPosts.filter(p => p.status === 'published').length;
  const localDrafts = localPosts.filter(p => p.status === 'draft').length;
  const localScheduled = localPosts.filter(p => p.status === 'scheduled').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content</h1>
            <p className="text-muted-foreground">
              Manage all your content from one place
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/blog/new">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setTab('all')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-4 h-4" />
            All
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {unifiedLocal.length + unifiedGhost.length + unifiedNews.length}
            </span>
          </button>
          <button
            onClick={() => setTab('me')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'me'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PenTool className="w-4 h-4" />
            Me
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {unifiedLocal.length + unifiedGhost.length}
            </span>
          </button>
          <button
            onClick={() => setTab('news')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'news'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            News
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {unifiedNews.length}
            </span>
          </button>
        </div>

        {/* Status Filters (only for Me tab) */}
        {activeTab === 'me' && (
          <div className="flex gap-2">
            <Link to="/admin/blog?tab=me">
              <Badge variant={!statusFilter ? 'default' : 'secondary'}>
                All ({localPosts.length + ghostPosts.length})
              </Badge>
            </Link>
            <Link to="/admin/blog?tab=me&status=published">
              <Badge variant={statusFilter === 'published' ? 'default' : 'secondary'}>
                Published ({localPublished + ghostPosts.length})
              </Badge>
            </Link>
            <Link to="/admin/blog?tab=me&status=draft">
              <Badge variant={statusFilter === 'draft' ? 'default' : 'secondary'}>
                Drafts ({localDrafts})
              </Badge>
            </Link>
            <Link to="/admin/blog?tab=me&status=scheduled">
              <Badge variant={statusFilter === 'scheduled' ? 'default' : 'secondary'}>
                Scheduled ({localScheduled})
              </Badge>
            </Link>
          </div>
        )}

        {/* News Tab Info */}
        {activeTab === 'news' && (
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Star className="w-4 h-4" />
              <span>Curated articles appear on your public content page</span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/news">
                Manage News Feed
              </Link>
            </Button>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg"
            >
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkPublish}
                  disabled={isBulkProcessing}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkUnpublish}
                  disabled={isBulkProcessing}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Unpublish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={isBulkProcessing}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto"
              >
                Clear selection
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {activeTab === 'news' ? 'No curated articles' : 'No content yet'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {activeTab === 'news'
                ? 'Curate articles from your news feed to show them here.'
                : 'Create your first post to get started.'}
            </p>
            {activeTab === 'news' ? (
              <Button asChild>
                <Link to="/admin/news">
                  <Newspaper className="w-4 h-4 mr-2" />
                  Go to News Feed
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/admin/blog/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {/* Select All Header (only for local posts) */}
            {activeTab !== 'news' && filteredContent.some(c => c.source === 'local') && (
              <div className="flex items-center gap-4 p-4 bg-muted/30">
                <button
                  onClick={toggleSelectAll}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {selectedIds.size === filteredContent.filter(c => c.source === 'local').length ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <span className="text-sm text-muted-foreground">
                  Select all site posts
                </span>
              </div>
            )}
            {filteredContent.map((item, index) => (
              <motion.div
                key={`${item.source}-${item.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-4 p-4 ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}
              >
                {/* Checkbox (only for local posts) */}
                {item.source === 'local' ? (
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedIds.has(item.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                ) : (
                  <div className="w-5" />
                )}

                {/* Cover image thumbnail */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  {item.cover_image ? (
                    <img
                      src={item.cover_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.source === 'news' ? (
                        <Newspaper className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate max-w-md">
                      {item.title}
                    </h3>
                    {/* Source badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.source === 'local' ? 'bg-blue-500/10 text-blue-500' :
                      item.source === 'ghost' ? 'bg-purple-500/10 text-purple-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {getSourceIcon(item.source)}
                      {getSourceLabel(item.source)}
                    </span>
                    {/* Status badge */}
                    {item.source === 'news' ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        <Star className="w-3 h-3 mr-1" fill="currentColor" />
                        Curated
                      </Badge>
                    ) : (
                      <Badge variant={item.status === 'published' ? 'default' : item.status === 'scheduled' ? 'outline' : 'secondary'}>
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.excerpt || 'No excerpt'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.published_at ? formatDate(item.published_at) : 'Not published'}
                    {item.reading_time && ` · ${item.reading_time} min read`}
                    {item.sourceName && ` · via ${item.sourceName}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {item.source === 'local' && (
                    <>
                      {item.status === 'published' && (
                        <Button asChild size="sm" variant="ghost" title="View post">
                          <Link to={`/blog/${item.slug}`} target="_blank">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost" title="Edit post">
                        <Link to={`/admin/blog/${item.id}/edit`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        title="Delete post"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}
                  {item.source === 'ghost' && (
                    <Button asChild size="sm" variant="ghost" title="View on Ghost">
                      <a href={`/blog/${item.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {item.source === 'news' && (
                    <>
                      <Button asChild size="sm" variant="ghost" title="View original">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUncurate(item.id)}
                        disabled={uncuratingId === item.id}
                        className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
                        title="Remove from curated"
                      >
                        {uncuratingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4" fill="currentColor" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminContentList;
