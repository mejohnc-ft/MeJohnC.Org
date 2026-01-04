import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText } from 'lucide-react';
import { BlogCardSkeleton } from '@/components/Skeleton';
import { Badge } from '@/components/ui/badge';
import BlogCard from '@/components/BlogCard';
import { getBlogPosts, type BlogPost } from '@/lib/supabase-queries';
import { getGhostPosts, type GhostPost } from '@/lib/ghost';
import { captureException } from '@/lib/sentry';

// Unified post type for display
interface UnifiedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  feature_image: string | null;
  published_at: string | null;
  reading_time: number | null;
  tags: string[];
  source: 'local' | 'ghost';
}

// Convert local post to unified format
function localToUnified(post: BlogPost): UnifiedPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    feature_image: post.cover_image,
    published_at: post.published_at,
    reading_time: post.reading_time,
    tags: post.tags || [],
    source: 'local',
  };
}

// Convert Ghost post to unified format
function ghostToUnified(post: GhostPost): UnifiedPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || post.custom_excerpt || null,
    feature_image: post.feature_image || null,
    published_at: post.published_at || null,
    reading_time: post.reading_time || null,
    tags: post.tags?.map(t => t.name) || [],
    source: 'ghost',
  };
}

export default function ContentTab() {
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ghostPosts, localPosts] = await Promise.all([
          getGhostPosts(),
          getBlogPosts(false),
        ]);
        const unifiedGhost = ghostPosts.map(ghostToUnified);
        const unifiedLocal = localPosts.map(localToUnified);
        const combined = [...unifiedGhost, ...unifiedLocal].sort((a, b) => {
          const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
          const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
          return dateB - dateA;
        });
        setPosts(combined);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'ContentTab.fetchPosts' });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const allTags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort();
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });
  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  return (
    <motion.div
      key="content"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="mb-12">
        <span className="font-mono text-sm text-primary uppercase tracking-widest">
          Writing & Ideas
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground mt-2">
          Content
        </h2>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
          Thoughts on AI, automation, engineering, and building things.
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
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
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          <BlogCardSkeleton />
          <div className="grid gap-8 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPosts.length === 0 && (
        <div className="text-center py-20">
          <div className="inline-flex p-4 bg-muted rounded-full mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery || selectedTag ? 'No matching posts' : 'No posts yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedTag
              ? 'Try adjusting your search or filters.'
              : 'Check back soon for new content.'}
          </p>
        </div>
      )}

      {/* Posts */}
      {!isLoading && filteredPosts.length > 0 && (
        <div className="space-y-12">
          {featuredPost && (
            <div className="pb-8 border-b border-border">
              <BlogCard post={featuredPost} featured />
            </div>
          )}
          {remainingPosts.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2">
              {remainingPosts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
