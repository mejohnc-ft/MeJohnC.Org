import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Package, FolderOpen, X, Command } from 'lucide-react';
import { getBlogPosts, getApps, getProjects, type BlogPost, type App, type Project } from '@/lib/supabase-queries';
import { captureException } from '@/lib/sentry';

interface SearchResult {
  id: string;
  title: string;
  type: 'blog' | 'app' | 'project';
  subtitle?: string;
  url: string;
}

export default function AdminSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const [posts, apps, projects] = await Promise.all([
        getBlogPosts(true),
        getApps(true),
        getProjects(true),
      ]);

      const lowerQuery = searchQuery.toLowerCase();

      const blogResults: SearchResult[] = posts
        .filter((post: BlogPost) =>
          post.title.toLowerCase().includes(lowerQuery) ||
          post.content?.toLowerCase().includes(lowerQuery) ||
          post.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
        )
        .map((post: BlogPost) => ({
          id: post.id,
          title: post.title,
          type: 'blog' as const,
          subtitle: post.status === 'draft' ? 'Draft' : post.status === 'scheduled' ? 'Scheduled' : 'Published',
          url: `/admin/blog/${post.id}/edit`,
        }));

      const appResults: SearchResult[] = apps
        .filter((app: App) =>
          app.name.toLowerCase().includes(lowerQuery) ||
          app.description?.toLowerCase().includes(lowerQuery) ||
          app.tagline?.toLowerCase().includes(lowerQuery)
        )
        .map((app: App) => ({
          id: app.id,
          title: app.name,
          type: 'app' as const,
          subtitle: app.status,
          url: `/admin/apps/${app.id}/edit`,
        }));

      const projectResults: SearchResult[] = projects
        .filter((project: Project) =>
          project.name.toLowerCase().includes(lowerQuery) ||
          project.description?.toLowerCase().includes(lowerQuery) ||
          project.tagline?.toLowerCase().includes(lowerQuery)
        )
        .map((project: Project) => ({
          id: project.id,
          title: project.name,
          type: 'project' as const,
          subtitle: project.status === 'draft' ? 'Draft' : 'Published',
          url: `/admin/projects/${project.id}/edit`,
        }));

      setResults([...blogResults, ...appResults, ...projectResults].slice(0, 10));
      setSelectedIndex(0);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminSearch.performSearch' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, performSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].url);
      setIsOpen(false);
      setQuery('');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blog':
        return <FileText className="w-4 h-4" />;
      case 'app':
        return <Package className="w-4 h-4" />;
      case 'project':
        return <FolderOpen className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
            >
              <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search posts, apps, projects..."
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : results.length > 0 ? (
                    <div className="py-2">
                      {results.map((result, index) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            navigate(result.url);
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            index === selectedIndex
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="text-muted-foreground">
                            {getTypeIcon(result.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-xs text-muted-foreground capitalize">
                                {result.type} • {result.subtitle}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : query ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No results found for "{query}"
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      Start typing to search...
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↑</kbd>
                      <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↓</kbd>
                      <span>Navigate</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↵</kbd>
                      <span>Open</span>
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded">esc</kbd>
                    <span>Close</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
