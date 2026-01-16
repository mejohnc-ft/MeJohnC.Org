import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  ExternalLink,
  Search,
  Star,
  Twitter,
  Tag,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSEO } from '@/lib/seo';
import PageTransition from '@/components/PageTransition';
import { supabase as getSupabase } from '@/lib/supabase';
import {
  getPublicBookmarks,
  getBookmarkCategories,
  type Bookmark as BookmarkType,
  type BookmarkCategory,
} from '@/lib/bookmark-queries';

const categoryColors: Record<string, string> = {
  articles: 'bg-blue-500/10 text-blue-500',
  tools: 'bg-purple-500/10 text-purple-500',
  repos: 'bg-gray-500/10 text-gray-400',
  videos: 'bg-red-500/10 text-red-500',
  threads: 'bg-sky-500/10 text-sky-500',
  papers: 'bg-green-500/10 text-green-500',
  news: 'bg-orange-500/10 text-orange-500',
  reference: 'bg-yellow-500/10 text-yellow-500',
  inspiration: 'bg-pink-500/10 text-pink-500',
  other: 'bg-slate-500/10 text-slate-500',
};

const PublicBookmarks = () => {
  useSEO({
    title: 'Bookmarks',
    description: 'A curated collection of interesting articles, tools, and resources.',
  });

  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    const loadBookmarks = async () => {
      setIsLoading(true);
      try {
        const supabase = getSupabase();
        const [bookmarksData, categoriesData] = await Promise.all([
          getPublicBookmarks(100, supabase),
          getBookmarkCategories(supabase),
        ]);
        setBookmarks(bookmarksData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookmarks();
  }, []);

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = !searchQuery ||
      bookmark.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.content?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory ||
      bookmark.ai_category === selectedCategory ||
      bookmark.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const bookmarksByCategory = filteredBookmarks.reduce((acc, bookmark) => {
    const cat = bookmark.ai_category || bookmark.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(bookmark);
    return acc;
  }, {} as Record<string, BookmarkType[]>);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <Bookmark className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Bookmarks</h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            A curated collection of interesting articles, tools, and resources I've found useful.
          </motion.p>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center gap-4 mb-8"
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="mb-6 text-sm text-muted-foreground">
          {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredBookmarks.length === 0 && (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No bookmarks found</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory
                ? 'Try adjusting your filters'
                : 'Check back soon for curated content'}
            </p>
          </div>
        )}

        {/* Bookmarks Grid */}
        {!isLoading && filteredBookmarks.length > 0 && (
          <div className="space-y-12">
            {selectedCategory ? (
              // Single category view
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBookmarks.map((bookmark, index) => (
                  <BookmarkCard key={bookmark.id} bookmark={bookmark} index={index} />
                ))}
              </div>
            ) : (
              // Grouped by category
              Object.entries(bookmarksByCategory).map(([category, items]) => (
                <div key={category}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    {categories.find(c => c.slug === category)?.name || category}
                    <Badge variant="outline" className={categoryColors[category] || 'bg-gray-500/10'}>
                      {items.length}
                    </Badge>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((bookmark, index) => (
                      <BookmarkCard key={bookmark.id} bookmark={bookmark} index={index} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

// Bookmark Card Component
interface BookmarkCardProps {
  bookmark: BookmarkType;
  index: number;
}

const BookmarkCard = ({ bookmark, index }: BookmarkCardProps) => (
  <motion.a
    href={bookmark.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="group block bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
  >
    <div className="p-4">
      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
          {bookmark.title || 'Untitled'}
        </h3>
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>

      {/* Summary */}
      {bookmark.ai_summary && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {bookmark.ai_summary}
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {bookmark.author_handle && (
          <span className="flex items-center gap-1">
            <Twitter className="w-3 h-3" />
            @{bookmark.author_handle}
          </span>
        )}
        {bookmark.is_favorite && (
          <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
        )}
        {bookmark.ai_processed_at && (
          <Sparkles className="w-3 h-3 text-purple-500" title="AI enhanced" />
        )}
      </div>

      {/* Tags */}
      {((bookmark.ai_tags && bookmark.ai_tags.length > 0) || (bookmark.tags && bookmark.tags.length > 0)) && (
        <div className="flex flex-wrap gap-1 mt-3">
          {(bookmark.ai_tags || bookmark.tags || []).slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 text-xs bg-muted rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  </motion.a>
);

export default PublicBookmarks;
