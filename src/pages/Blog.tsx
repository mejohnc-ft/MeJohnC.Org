import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, FileText, Search } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import BlogCard from '@/components/BlogCard';
import { Badge } from '@/components/ui/badge';
import { getBlogPosts, type BlogPost } from '@/lib/supabase-queries';

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const data = await getBlogPosts();
        setPosts(data);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load blog posts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // Get all unique tags
  const allTags = Array.from(
    new Set(posts.flatMap((post) => post.tags || []))
  ).sort();

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag || post.tags?.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  // Featured post is the first post
  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Blog
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Thoughts on AI, automation, engineering, and building things.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedTag === null ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </Badge>
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery || selectedTag ? 'No matching posts' : 'No posts yet'}
              </h2>
              <p className="text-muted-foreground">
                {searchQuery || selectedTag
                  ? 'Try adjusting your search or filters.'
                  : 'Check back soon for new content.'}
              </p>
            </motion.div>
          )}

          {/* Posts */}
          {!isLoading && !error && filteredPosts.length > 0 && (
            <div className="space-y-12">
              {/* Featured Post */}
              {featuredPost && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pb-8 border-b border-border"
                >
                  <BlogCard post={featuredPost} featured />
                </motion.div>
              )}

              {/* Rest of posts */}
              {remainingPosts.length > 0 && (
                <div className="grid gap-8 md:grid-cols-2">
                  {remainingPosts.map((post, index) => (
                    <BlogCard key={post.id} post={post} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Blog;
