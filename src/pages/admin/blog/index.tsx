import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Edit, Trash2, Eye, Loader2, CheckSquare, Square, Send, Archive } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseClient } from '@/lib/supabase';
import { getBlogPosts, deleteBlogPost, bulkDeleteBlogPosts, bulkUpdateBlogPostStatus, type BlogPost } from '@/lib/supabase-queries';
import { formatDate } from '@/lib/markdown';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

const AdminBlogList = () => {
  useSEO({ title: 'Manage Blog Posts', noIndex: true });
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const supabase = useSupabaseClient();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getBlogPosts(true, supabase); // Include unpublished
      setPosts(data);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminBlog.fetchPosts' });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setDeletingId(id);
    try {
      await deleteBlogPost(id, supabase);
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminBlog.deletePost' });
    } finally {
      setDeletingId(null);
    }
  }

  // Bulk operations
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
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map((p) => p.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} post(s)?`)) return;

    setIsBulkProcessing(true);
    try {
      await bulkDeleteBlogPosts(Array.from(selectedIds), supabase);
      setPosts(posts.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminBlog.bulkDelete' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkPublish() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateBlogPostStatus(Array.from(selectedIds), 'published', supabase);
      setPosts(posts.map((p) =>
        selectedIds.has(p.id)
          ? { ...p, status: 'published' as const, published_at: p.published_at || new Date().toISOString() }
          : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminBlog.bulkPublish' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkUnpublish() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateBlogPostStatus(Array.from(selectedIds), 'draft', supabase);
      setPosts(posts.map((p) =>
        selectedIds.has(p.id) ? { ...p, status: 'draft' as const } : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminBlog.bulkUnpublish' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  const filteredPosts = statusFilter
    ? posts.filter((p) => p.status === statusFilter)
    : posts;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
            <p className="text-muted-foreground">
              Manage your blog content
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/blog/new">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Link to="/admin/blog">
            <Badge variant={!statusFilter ? 'default' : 'secondary'}>
              All ({posts.length})
            </Badge>
          </Link>
          <Link to="/admin/blog?status=published">
            <Badge variant={statusFilter === 'published' ? 'default' : 'secondary'}>
              Published ({posts.filter((p) => p.status === 'published').length})
            </Badge>
          </Link>
          <Link to="/admin/blog?status=draft">
            <Badge variant={statusFilter === 'draft' ? 'default' : 'secondary'}>
              Drafts ({posts.filter((p) => p.status === 'draft').length})
            </Badge>
          </Link>
          <Link to="/admin/blog?status=scheduled">
            <Badge variant={statusFilter === 'scheduled' ? 'default' : 'secondary'}>
              Scheduled ({posts.filter((p) => p.status === 'scheduled').length})
            </Badge>
          </Link>
        </div>

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

        {/* Posts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No posts yet
            </h2>
            <p className="text-muted-foreground mb-4">
              Create your first blog post to get started.
            </p>
            <Button asChild>
              <Link to="/admin/blog/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Link>
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {/* Select All Header */}
            {filteredPosts.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-muted/30">
                <button
                  onClick={toggleSelectAll}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={selectedIds.size === filteredPosts.length ? 'Deselect all posts' : 'Select all posts'}
                >
                  {selectedIds.size === filteredPosts.length ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size === filteredPosts.length ? 'Deselect all' : 'Select all'}
                </span>
              </div>
            )}
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 ${selectedIds.has(post.id) ? 'bg-primary/5' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(post.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={selectedIds.has(post.id) ? `Deselect ${post.title}` : `Select ${post.title}`}
                >
                  {selectedIds.has(post.id) ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                {/* Cover image thumbnail */}
                <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  {post.cover_image ? (
                    <img
                      src={post.cover_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {post.title}
                    </h3>
                    <Badge variant={post.status === 'published' ? 'default' : post.status === 'scheduled' ? 'outline' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {post.excerpt || 'No excerpt'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.status === 'scheduled' && post.scheduled_for
                      ? `Scheduled for ${formatDate(post.scheduled_for)}`
                      : post.published_at
                        ? formatDate(post.published_at)
                        : `Updated ${formatDate(post.updated_at)}`}
                    {post.reading_time && ` · ${post.reading_time} min read`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {post.status === 'published' && (
                    <Button asChild size="sm" variant="ghost" aria-label={`View ${post.title}`}>
                      <Link to={`/blog/${post.slug}`} target="_blank">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost" aria-label={`Edit ${post.title}`}>
                    <Link to={`/admin/blog/${post.id}/edit`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    aria-label={`Delete ${post.title}`}
                  >
                    {deletingId === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBlogList;
