import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, PenTool, Newspaper, Globe, ExternalLink } from 'lucide-react';
import { BlogCardSkeleton } from '@/components/Skeleton';
import { Badge } from '@/components/ui/badge';
import BlogCard from '@/components/BlogCard';
import { getBlogPosts, getCuratedArticles, type BlogPost, type NewsArticle, type NewsSource } from '@/lib/supabase-queries';
import { getGhostPosts, type GhostPost } from '@/lib/ghost';
import { captureException } from '@/lib/sentry';

type ContentSource = 'all' | 'me' | 'news';
type ArticleWithSource = NewsArticle & { source: NewsSource | null };

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
  source: 'local' | 'ghost' | 'news';
  url?: string;
  sourceName?: string;
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

// Convert curated news to unified format
function newsToUnified(article: ArticleWithSource): UnifiedPost {
  return {
    id: article.id,
    title: article.title,
    slug: article.id,
    excerpt: article.curated_summary || article.description,
    feature_image: article.image_url,
    published_at: article.curated_at || article.published_at,
    reading_time: null,
    tags: ['AI News'],
    source: 'news',
    url: article.url,
    sourceName: article.source?.name || 'External',
  };
}

export default function ContentTab() {
  const [localPosts, setLocalPosts] = useState<BlogPost[]>([]);
  const [ghostPosts, setGhostPosts] = useState<GhostPost[]>([]);
  const [curatedNews, setCuratedNews] = useState<ArticleWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<ContentSource>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [ghost, local, curated] = await Promise.all([
          getGhostPosts().catch(() => []),
          getBlogPosts(false),
          getCuratedArticles(50),
        ]);
        setGhostPosts(ghost);
        setLocalPosts(local);
        setCuratedNews(curated);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), { context: 'ContentTab.fetchPosts' });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Convert to unified format
  const unifiedGhost = ghostPosts.map(ghostToUnified);
  const unifiedLocal = localPosts.map(localToUnified);
  const unifiedNews = curatedNews.map(newsToUnified);

  // Get posts based on active source
  const getSourcePosts = (): UnifiedPost[] => {
    switch (activeSource) {
      case 'me':
        return [...unifiedGhost, ...unifiedLocal];
      case 'news':
        return unifiedNews;
      case 'all':
      default:
        return [...unifiedGhost, ...unifiedLocal, ...unifiedNews];
    }
  };

  const sourcePosts = getSourcePosts();
  const allTags = Array.from(new Set(sourcePosts.flatMap((post) => post.tags))).sort();

  const filteredPosts = sourcePosts
    .filter((post) => {
      const matchesSearch =
        !searchQuery ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !selectedTag || post.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      return dateB - dateA;
    });

  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  // Counts for tabs
  const meCount = unifiedGhost.length + unifiedLocal.length;
  const newsCount = unifiedNews.length;
  const allCount = meCount + newsCount;

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
          Thoughts on AI, automation, engineering, and curated news from around the web.
        </p>
      </div>

      {/* Source Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        <button
          onClick={() => { setActiveSource('all'); setSelectedTag(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSource === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          All
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{allCount}</span>
        </button>
        <button
          onClick={() => { setActiveSource('me'); setSelectedTag(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSource === 'me'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PenTool className="w-4 h-4" />
          My Posts
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{meCount}</span>
        </button>
        <button
          onClick={() => { setActiveSource('news'); setSelectedTag(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSource === 'news'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          AI News
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{newsCount}</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search content..."
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
            {searchQuery || selectedTag ? 'No matching content' : 'No content yet'}
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
              {featuredPost.source === 'news' ? (
                <NewsCard post={featuredPost} featured />
              ) : (
                <BlogCard post={featuredPost} featured />
              )}
            </div>
          )}
          {remainingPosts.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2">
              {remainingPosts.map((post, index) => (
                post.source === 'news' ? (
                  <NewsCard key={post.id} post={post} index={index} />
                ) : (
                  <BlogCard key={post.id} post={post} index={index} />
                )
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// News card component for curated articles
function NewsCard({ post, featured, index = 0 }: { post: UnifiedPost; featured?: boolean; index?: number }) {
  return (
    <motion.a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`group block bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg ${
        featured ? 'md:flex' : ''
      }`}
    >
      {/* Image */}
      {post.feature_image && (
        <div className={`relative overflow-hidden bg-muted ${featured ? 'md:w-1/2' : 'aspect-video'}`}>
          <img
            src={post.feature_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-500/90 text-white rounded-full">
              <Globe className="w-3 h-3" />
              {post.sourceName}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`p-6 ${featured ? 'md:w-1/2 md:flex md:flex-col md:justify-center' : ''}`}>
        {!post.feature_image && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-500/10 text-green-500 rounded-full">
              <Globe className="w-3 h-3" />
              {post.sourceName}
            </span>
          </div>
        )}

        <h3 className={`font-bold text-foreground group-hover:text-primary transition-colors ${
          featured ? 'text-2xl md:text-3xl' : 'text-lg'
        }`}>
          {post.title}
        </h3>

        {post.excerpt && (
          <p className={`text-muted-foreground mt-3 ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}>
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {post.published_at && new Date(post.published_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium group-hover:underline">
            Read article
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </motion.a>
  );
}
