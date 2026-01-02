import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileText, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBlogPosts, deleteBlogPost, type BlogPost } from '@/lib/supabase-queries';
import { formatDate } from '@/lib/markdown';

const AdminBlogList = () => {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const data = await getBlogPosts(true); // Include unpublished
      setPosts(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    setDeletingId(id);
    try {
      await deleteBlogPost(id);
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting post:', err);
    } finally {
      setDeletingId(null);
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
        </div>

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
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4"
              >
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
                    <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {post.excerpt || 'No excerpt'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.published_at
                      ? formatDate(post.published_at)
                      : `Updated ${formatDate(post.updated_at)}`}
                    {post.reading_time && ` · ${post.reading_time} min read`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {post.status === 'published' && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/blog/${post.slug}`} target="_blank">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
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
