import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  FileText,
  FolderOpen,
  FolderKanban,
  Package,
} from "lucide-react";
import {
  LayoutDashboard,
  Newspaper,
  Bookmark,
  Bot,
  BookText,
  Wrench,
  BookOpen,
  CheckSquare,
  Users,
  AppWindow,
  BarChart3,
  Server,
  Cable,
  FileCode2,
  GitBranch,
  Clock,
  Plug,
  FileSearch,
  Settings,
  User,
  Sparkles,
  Palette,
} from "lucide-react";
import { useReducedMotion } from "@/lib/reduced-motion";
import { useWindowManagerContext } from "./WindowManager";
import { getAppsForTenant } from "./apps/AppRegistry";
import { useBilling } from "@/hooks/useBilling";
import { useTenant } from "@/lib/tenant";
import { searchFileSystem } from "@/lib/desktop-queries";
import { getBlogPosts, getProjects } from "@/lib/supabase-queries";
import { captureException } from "@/lib/sentry";
import type { FileSystemNode } from "@/lib/desktop-schemas";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FileText,
  Newspaper,
  Bookmark,
  Bot,
  BookText,
  Wrench,
  BookOpen,
  CheckSquare,
  Users,
  FolderKanban,
  AppWindow,
  BarChart3,
  Server,
  Cable,
  FileCode2,
  GitBranch,
  Clock,
  Plug,
  FileSearch,
  Settings,
  User,
  Sparkles,
  Palette,
  FolderOpen,
  Package,
};

interface SpotlightProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpotlightResult {
  id: string;
  title: string;
  subtitle?: string;
  category: "Apps" | "Files" | "Blog" | "Projects";
  icon: string;
  iconColor?: string;
  action: () => void;
}

const RECENT_SEARCHES_KEY = "spotlight-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)),
  );
}

export default function Spotlight({ isOpen, onClose }: SpotlightProps) {
  const { launchApp } = useWindowManagerContext();
  const prefersReducedMotion = useReducedMotion();
  const { plan } = useBilling();
  const { tenant } = useTenant();
  const enabledAppIds = (tenant?.settings as Record<string, unknown>)
    ?.enabled_apps as string[] | undefined;
  const planApps = useMemo(
    () => getAppsForTenant(plan, enabledAppIds),
    [plan, enabledAppIds],
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotlightResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setRecentSearches(getRecentSearches());
      // Delay focus to allow animation
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Search apps (instant, local) — filtered by plan
  const searchApps = useCallback(
    (q: string): SpotlightResult[] => {
      const lower = q.toLowerCase();
      return planApps
        .filter((app) => app.name.toLowerCase().includes(lower))
        .slice(0, 5)
        .map((app) => ({
          id: `app-${app.id}`,
          title: app.name,
          subtitle: app.category,
          category: "Apps" as const,
          icon: app.icon,
          iconColor: app.color,
          action: () => {
            launchApp(app.id);
            onClose();
          },
        }));
    },
    [planApps, launchApp, onClose],
  );

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Immediate app results
    const appResults = searchApps(query);
    setResults(appResults);
    setSelectedIndex(0);

    // Async searches
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const [files, posts, projects] = await Promise.all([
          searchFileSystem(query).catch(() => [] as FileSystemNode[]),
          getBlogPosts(true).catch(() => []),
          getProjects(true).catch(() => []),
        ]);

        const lower = query.toLowerCase();

        const fileResults: SpotlightResult[] = files.slice(0, 5).map((f) => ({
          id: `file-${f.id}`,
          title: f.name,
          subtitle: f.type === "folder" ? "Folder" : "File",
          category: "Files" as const,
          icon: f.type === "folder" ? "FolderOpen" : "FileText",
          action: () => {
            launchApp("file-explorer");
            onClose();
          },
        }));

        const blogResults: SpotlightResult[] = posts
          .filter((p) => p.title.toLowerCase().includes(lower))
          .slice(0, 5)
          .map((p) => ({
            id: `blog-${p.id}`,
            title: p.title,
            subtitle: p.status === "draft" ? "Draft" : "Published",
            category: "Blog" as const,
            icon: "FileText",
            iconColor: "text-emerald-500",
            action: () => {
              launchApp("blog");
              onClose();
            },
          }));

        const projectResults: SpotlightResult[] = projects
          .filter((p) => p.name.toLowerCase().includes(lower))
          .slice(0, 5)
          .map((p) => ({
            id: `project-${p.id}`,
            title: p.name,
            subtitle: p.status === "draft" ? "Draft" : "Published",
            category: "Projects" as const,
            icon: "FolderKanban",
            iconColor: "text-indigo-500",
            action: () => {
              launchApp("projects");
              onClose();
            },
          }));

        const newAppResults = searchApps(query);
        setResults([
          ...newAppResults,
          ...fileResults,
          ...blogResults,
          ...projectResults,
        ]);
        setSelectedIndex(0);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: "Spotlight.search",
        });
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, isOpen, searchApps, launchApp, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          if (query.trim()) addRecentSearch(query.trim());
          results[selectedIndex].action();
        }
      }
    },
    [results, selectedIndex],
  );

  // Scroll selected result into view
  useEffect(() => {
    if (results.length > 0) {
      const el = document.querySelector('[data-spotlight-selected="true"]');
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results.length]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SpotlightResult[]>();
    for (const result of results) {
      const existing = groups.get(result.category) ?? [];
      existing.push(result);
      groups.set(result.category, existing);
    }
    return groups;
  }, [results]);

  // Quick-launch grid when no query — filtered by plan
  const quickLaunchApps = useMemo(
    () => planApps.filter((a) => a.defaultDockPinned),
    [planApps],
  );

  // Compute flat index map for results across groups (avoids mutable counter in JSX)
  const flatIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const [, items] of groupedResults.entries()) {
      for (const result of items) {
        map.set(result.id, idx++);
      }
    }
    return map;
  }, [groupedResults]);

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: 0.15, ease: "easeOut" },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/50 backdrop-blur-md"
            style={{ zIndex: 60 }}
          />

          {/* Modal */}
          <motion.div
            {...motionProps}
            className="fixed top-[max(80px,20%)] left-1/2 -translate-x-1/2 w-full max-w-lg"
            style={{ zIndex: 60 }}
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
                  placeholder="Search apps, files, content..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-[min(320px,calc(80vh-160px))] overflow-y-auto">
                {isLoading && results.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-1">
                    {Array.from(groupedResults.entries()).map(
                      ([category, items]) => (
                        <div key={category}>
                          <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {category}
                          </div>
                          {items.map((result) => {
                            const currentIndex =
                              flatIndexMap.get(result.id) ?? 0;
                            const isSelected = currentIndex === selectedIndex;
                            const Icon = ICON_MAP[result.icon];
                            return (
                              <button
                                key={result.id}
                                onClick={result.action}
                                data-spotlight-selected={
                                  isSelected || undefined
                                }
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <span
                                  className={
                                    result.iconColor ?? "text-muted-foreground"
                                  }
                                >
                                  {Icon ? <Icon className="w-4 h-4" /> : null}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {result.title}
                                  </div>
                                  {result.subtitle && (
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {result.subtitle}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ),
                    )}
                  </div>
                ) : query ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  /* Empty state: recent searches + quick-launch grid */
                  <div className="p-4">
                    {recentSearches.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Recent Searches
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((s) => (
                            <button
                              key={s}
                              onClick={() => setQuery(s)}
                              className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Quick Launch
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {quickLaunchApps.map((app) => {
                        const Icon = ICON_MAP[app.icon];
                        return (
                          <button
                            key={app.id}
                            onClick={() => {
                              launchApp(app.id);
                              onClose();
                            }}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center bg-card border border-border/50 ${app.color}`}
                            >
                              {Icon ? <Icon className="w-4 h-4" /> : null}
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                              {app.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                      ↓
                    </kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                      ↵
                    </kbd>
                    Open
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px]">
                    esc
                  </kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
