import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Upload,
  Loader2,
  ExternalLink,
  Search,
  Star,
  Archive,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  FileText,
  LayoutGrid,
  Columns2,
  Columns3,
  ChevronDown,
  ChevronUp,
  Twitter,
  Globe,
  Tag,
  Clock,
  AlertCircle,
  Settings,
  FolderOpen,
  Zap,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import {
  getBookmarks,
  getBookmarkStats,
  getBookmarkCategories,
  getUnprocessedBookmarks,
  markBookmarkRead,
  markBookmarksRead,
  toggleBookmarkFavorite,
  toggleBookmarkPublic,
  archiveBookmarks,
  bulkDeleteBookmarks,
  updateBookmarkWithAI,
  createImportJob,
  updateImportJobProgress,
  upsertBookmark,
  type Bookmark as BookmarkType,
  type BookmarkStats,
  type BookmarkCategory,
  type BookmarkQueryOptions,
} from "@/lib/bookmark-queries";
import {
  parseSmaugExport,
  convertToBookmarkCreate,
  deduplicateBookmarks,
  type ParsedSmaugBookmark,
} from "@/lib/bookmark-parser";
import { AIEnrichmentResponseSchema } from "@/lib/bookmark-schemas";

type MainTab = "browse" | "import" | "settings";
type ColumnView = 1 | 2 | 3;

interface ImportState {
  isUploading: boolean;
  isParsing: boolean;
  isImporting: boolean;
  parsedBookmarks: ParsedSmaugBookmark[];
  importProgress: {
    processed: number;
    total: number;
    imported: number;
    skipped: number;
  };
  error: string | null;
}

interface AIEnrichmentState {
  isProcessing: boolean;
  progress: { processed: number; total: number };
  error: string | null;
}

const sourceColors: Record<string, string> = {
  twitter: "bg-sky-500/10 text-sky-500",
  pocket: "bg-red-500/10 text-red-500",
  raindrop: "bg-blue-500/10 text-blue-500",
  manual: "bg-gray-500/10 text-gray-500",
  other: "bg-purple-500/10 text-purple-500",
};

const categoryColors: Record<string, string> = {
  articles: "bg-blue-500/10 text-blue-500",
  tools: "bg-purple-500/10 text-purple-500",
  repos: "bg-gray-500/10 text-gray-400",
  videos: "bg-red-500/10 text-red-500",
  threads: "bg-sky-500/10 text-sky-500",
  papers: "bg-green-500/10 text-green-500",
  news: "bg-orange-500/10 text-orange-500",
  reference: "bg-yellow-500/10 text-yellow-500",
  inspiration: "bg-pink-500/10 text-pink-500",
  other: "bg-slate-500/10 text-slate-500",
};

const AdminBookmarks = () => {
  useSEO({ title: "Bookmarks", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  // Main navigation
  const [mainTab, setMainTab] = useState<MainTab>("browse");

  // Browse state
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [categories, setCategories] = useState<BookmarkCategory[]>([]);
  const [stats, setStats] = useState<BookmarkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [columnView, setColumnView] = useState<ColumnView>(2);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState<string | null>(
    null,
  );

  // Import state
  const [importState, setImportState] = useState<ImportState>({
    isUploading: false,
    isParsing: false,
    isImporting: false,
    parsedBookmarks: [],
    importProgress: { processed: 0, total: 0, imported: 0, skipped: 0 },
    error: null,
  });

  // AI Enrichment state
  const [aiState, setAIState] = useState<AIEnrichmentState>({
    isProcessing: false,
    progress: { processed: 0, total: 0 },
    error: null,
  });
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem("claude_api_key") || "",
  );
  const [unprocessedCount, setUnprocessedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);

    try {
      const queryOptions: BookmarkQueryOptions = {
        limit: 100,
        search: searchQuery || undefined,
        source: (selectedSource as BookmarkType["source"]) || undefined,
        category: selectedCategory || undefined,
        isRead: showUnreadOnly ? false : undefined,
        isFavorite: showFavoritesOnly ? true : undefined,
      };

      const [bookmarksData, statsData, categoriesData] = await Promise.all([
        getBookmarks(queryOptions, supabase),
        getBookmarkStats(supabase),
        getBookmarkCategories(supabase),
      ]);

      setBookmarks(bookmarksData);
      setStats(statsData);
      setCategories(categoriesData);
      setUnprocessedCount(
        statsData.total_bookmarks - statsData.ai_processed_count,
      );
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "AdminBookmarks.loadData",
        },
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    supabase,
    searchQuery,
    selectedSource,
    selectedCategory,
    showUnreadOnly,
    showFavoritesOnly,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // File upload handler
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImportState((prev) => ({
      ...prev,
      isUploading: true,
      isParsing: true,
      error: null,
    }));

    try {
      const allParsed: ParsedSmaugBookmark[] = [];

      for (const file of Array.from(files)) {
        const content = await file.text();
        const parsed = parseSmaugExport(content, file.name);
        allParsed.push(...parsed);
      }

      const deduplicated = deduplicateBookmarks(allParsed);

      setImportState((prev) => ({
        ...prev,
        isUploading: false,
        isParsing: false,
        parsedBookmarks: deduplicated,
      }));
    } catch (error) {
      setImportState((prev) => ({
        ...prev,
        isUploading: false,
        isParsing: false,
        error: error instanceof Error ? error.message : "Failed to parse file",
      }));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Import bookmarks to database
  const handleImport = async () => {
    if (!supabase || importState.parsedBookmarks.length === 0) return;

    setImportState((prev) => ({
      ...prev,
      isImporting: true,
      importProgress: {
        processed: 0,
        total: prev.parsedBookmarks.length,
        imported: 0,
        skipped: 0,
      },
    }));

    try {
      // Create import job
      const job = await createImportJob(
        "smaug",
        importState.parsedBookmarks.length,
        supabase,
      );
      await updateImportJobProgress(
        job.id,
        { status: "processing", started_at: new Date().toISOString() },
        supabase,
      );

      let imported = 0;
      let skipped = 0;

      for (let i = 0; i < importState.parsedBookmarks.length; i++) {
        const parsed = importState.parsedBookmarks[i];
        const bookmarkData = convertToBookmarkCreate(parsed, "twitter");

        try {
          const result = await upsertBookmark(bookmarkData, supabase);
          if (result) {
            imported++;
          } else {
            skipped++; // Duplicate
          }
        } catch {
          skipped++;
        }

        setImportState((prev) => ({
          ...prev,
          importProgress: {
            ...prev.importProgress,
            processed: i + 1,
            imported,
            skipped,
          },
        }));
      }

      // Complete import job
      await updateImportJobProgress(
        job.id,
        {
          status: "completed",
          processed_items: importState.parsedBookmarks.length,
          imported_items: imported,
          skipped_items: skipped,
          completed_at: new Date().toISOString(),
        },
        supabase,
      );

      // Clear parsed bookmarks and reload
      setImportState((prev) => ({
        ...prev,
        isImporting: false,
        parsedBookmarks: [],
      }));

      loadData();
    } catch (error) {
      setImportState((prev) => ({
        ...prev,
        isImporting: false,
        error: error instanceof Error ? error.message : "Import failed",
      }));
    }
  };

  // AI Enrichment
  const runAIEnrichment = async () => {
    if (!supabase || !apiKey) return;

    setAIState({
      isProcessing: true,
      progress: { processed: 0, total: 0 },
      error: null,
    });

    try {
      const unprocessed = await getUnprocessedBookmarks(20, supabase);
      setAIState((prev) => ({
        ...prev,
        progress: { processed: 0, total: unprocessed.length },
      }));

      for (let i = 0; i < unprocessed.length; i++) {
        const bookmark = unprocessed[i];

        try {
          const response = await fetch(
            "https://api.anthropic.com/v1/messages",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 512,
                messages: [
                  {
                    role: "user",
                    content: `Analyze this bookmark and provide a JSON response with summary, tags, and category.

Title: ${bookmark.title || "No title"}
URL: ${bookmark.url}
Content: ${bookmark.content?.slice(0, 1000) || "No content"}
Author: ${bookmark.author_handle ? "@" + bookmark.author_handle : "Unknown"}

Respond ONLY with valid JSON in this exact format:
{"summary": "1-2 sentence summary", "tags": ["tag1", "tag2", "tag3"], "category": "articles|tools|repos|videos|threads|papers|news|reference|inspiration|other"}`,
                  },
                ],
              }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            const text = data.content[0]?.text || "";

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = AIEnrichmentResponseSchema.safeParse(
                JSON.parse(jsonMatch[0]),
              );
              if (parsed.success) {
                await updateBookmarkWithAI(
                  bookmark.id,
                  {
                    ai_summary: parsed.data.summary,
                    ai_tags: parsed.data.tags,
                    ai_category: parsed.data.category,
                  },
                  supabase,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "AI enrichment error for bookmark:",
            bookmark.id,
            error,
          );
        }

        setAIState((prev) => ({
          ...prev,
          progress: { ...prev.progress, processed: i + 1 },
        }));

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setAIState((prev) => ({ ...prev, isProcessing: false }));
      loadData();
    } catch (error) {
      setAIState({
        isProcessing: false,
        progress: { processed: 0, total: 0 },
        error: error instanceof Error ? error.message : "AI enrichment failed",
      });
    }
  };

  // Bulk actions
  const handleMarkRead = async () => {
    if (!supabase || selectedIds.size === 0) return;
    await markBookmarksRead(Array.from(selectedIds), supabase);
    setSelectedIds(new Set());
    loadData();
  };

  const handleArchive = async () => {
    if (!supabase || selectedIds.size === 0) return;
    await archiveBookmarks(Array.from(selectedIds), supabase);
    setSelectedIds(new Set());
    loadData();
  };

  const handleDelete = async () => {
    if (!supabase || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} bookmarks?`)) return;
    await bulkDeleteBookmarks(Array.from(selectedIds), supabase);
    setSelectedIds(new Set());
    loadData();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === bookmarks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookmarks.map((b) => b.id)));
    }
  };

  // Save API key to sessionStorage (cleared when tab closes)
  const saveApiKey = (key: string) => {
    setApiKey(key);
    sessionStorage.setItem("claude_api_key", key);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bookmarks</h1>
            <p className="text-sm text-muted-foreground">
              Import and manage your Twitter/X bookmarks from Smaug exports
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Total", value: stats.total_bookmarks, color: "blue" },
              { label: "Unread", value: stats.unread_count, color: "yellow" },
              { label: "Favorites", value: stats.favorite_count, color: "red" },
              { label: "Public", value: stats.public_count, color: "green" },
              {
                label: "AI Processed",
                value: stats.ai_processed_count,
                color: "purple",
              },
              {
                label: "Collections",
                value: stats.collections_count,
                color: "sky",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card border border-border rounded-lg p-4"
              >
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            {[
              { id: "browse", label: "Browse", icon: LayoutGrid },
              { id: "import", label: "Import", icon: Upload },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as MainTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  mainTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Browse Tab */}
        {mainTab === "browse" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>

              {/* Source Filter */}
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="">All Sources</option>
                <option value="twitter">Twitter</option>
                <option value="pocket">Pocket</option>
                <option value="raindrop">Raindrop</option>
                <option value="manual">Manual</option>
              </select>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Quick Filters */}
              <Button
                variant={showUnreadOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                Unread
              </Button>
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Star className="w-4 h-4 mr-1" />
                Favorites
              </Button>

              {/* Column View Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1 ml-auto">
                {[
                  { view: 1, icon: LayoutGrid },
                  { view: 2, icon: Columns2 },
                  { view: 3, icon: Columns3 },
                ].map(({ view, icon: Icon }) => (
                  <button
                    key={view}
                    onClick={() => setColumnView(view as ColumnView)}
                    className={`p-2 rounded-md transition-colors ${
                      columnView === view
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Actions */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm font-medium">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkRead}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Mark Read
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleArchive}>
                      <Archive className="w-4 h-4 mr-1" />
                      Archive
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bookmarks List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Import your Twitter bookmarks to get started
                </p>
                <Button onClick={() => setMainTab("import")}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Bookmarks
                </Button>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  columnView === 1
                    ? "grid-cols-1"
                    : columnView === 2
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {/* Select All Header */}
                <div
                  className={`flex items-center gap-2 p-2 ${columnView > 1 ? "col-span-full" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === bookmarks.length &&
                      bookmarks.length > 0
                    }
                    onChange={selectAll}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size === bookmarks.length
                      ? "Deselect all"
                      : "Select all"}
                  </span>
                </div>

                {bookmarks.map((bookmark) => (
                  <motion.div
                    key={bookmark.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(bookmark.id)}
                          onChange={() => toggleSelection(bookmark.id)}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-primary line-clamp-2"
                            onClick={() =>
                              !bookmark.is_read &&
                              supabase &&
                              markBookmarkRead(bookmark.id, supabase)
                            }
                          >
                            {bookmark.title || bookmark.url}
                          </a>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {bookmark.author_handle && (
                              <span className="flex items-center gap-1">
                                <Twitter className="w-3 h-3" />@
                                {bookmark.author_handle}
                              </span>
                            )}
                            {bookmark.source && (
                              <Badge
                                variant="outline"
                                className={sourceColors[bookmark.source]}
                              >
                                {bookmark.source}
                              </Badge>
                            )}
                            {(bookmark.ai_category || bookmark.category) && (
                              <Badge
                                variant="outline"
                                className={
                                  categoryColors[
                                    bookmark.ai_category ||
                                      bookmark.category ||
                                      "other"
                                  ]
                                }
                              >
                                {bookmark.ai_category || bookmark.category}
                              </Badge>
                            )}
                            {bookmark.ai_processed_at && (
                              <Sparkles
                                className="w-3 h-3 text-purple-500"
                                title="AI processed"
                              />
                            )}
                          </div>

                          {/* AI Summary or Description */}
                          {(bookmark.ai_summary || bookmark.content) && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                              {bookmark.ai_summary ||
                                bookmark.content?.slice(0, 200)}
                            </p>
                          )}

                          {/* Tags */}
                          {((bookmark.ai_tags && bookmark.ai_tags.length > 0) ||
                            (bookmark.tags && bookmark.tags.length > 0)) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(bookmark.ai_tags || bookmark.tags || [])
                                .slice(0, 5)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 text-xs bg-muted rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                            </div>
                          )}

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {expandedBookmarkId === bookmark.id &&
                              bookmark.content && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 pt-3 border-t border-border"
                                >
                                  <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {bookmark.content}
                                  </p>
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={async () => {
                              if (supabase) {
                                await toggleBookmarkFavorite(
                                  bookmark.id,
                                  !bookmark.is_favorite,
                                  supabase,
                                );
                                loadData();
                              }
                            }}
                            className={`p-1.5 rounded-md hover:bg-muted ${bookmark.is_favorite ? "text-yellow-500" : "text-muted-foreground"}`}
                          >
                            <Star
                              className="w-4 h-4"
                              fill={
                                bookmark.is_favorite ? "currentColor" : "none"
                              }
                            />
                          </button>
                          <button
                            onClick={async () => {
                              if (supabase) {
                                await toggleBookmarkPublic(
                                  bookmark.id,
                                  !bookmark.is_public,
                                  supabase,
                                );
                                loadData();
                              }
                            }}
                            className={`p-1.5 rounded-md hover:bg-muted ${bookmark.is_public ? "text-green-500" : "text-muted-foreground"}`}
                            title={bookmark.is_public ? "Public" : "Private"}
                          >
                            {bookmark.is_public ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          {bookmark.content && (
                            <button
                              onClick={() =>
                                setExpandedBookmarkId(
                                  expandedBookmarkId === bookmark.id
                                    ? null
                                    : bookmark.id,
                                )
                              }
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                            >
                              {expandedBookmarkId === bookmark.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(bookmark.imported_at).toLocaleDateString()}
                      {!bookmark.is_read && (
                        <Badge
                          variant="outline"
                          className="ml-auto bg-blue-500/10 text-blue-500"
                        >
                          Unread
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Import Tab */}
        {mainTab === "import" && (
          <div className="space-y-6">
            {/* Upload Zone */}
            <div className="bg-card border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Smaug Export</h3>
              <p className="text-muted-foreground mb-4">
                Drop your bookmarks.md or knowledge files here, or click to
                browse
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importState.isUploading}
              >
                {importState.isUploading || importState.isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Select Files
                  </>
                )}
              </Button>
            </div>

            {/* Parse Results */}
            {importState.parsedBookmarks.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Ready to Import</h3>
                    <p className="text-sm text-muted-foreground">
                      {importState.parsedBookmarks.length} bookmarks parsed
                      (duplicates removed)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setImportState((prev) => ({
                          ...prev,
                          parsedBookmarks: [],
                        }))
                      }
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={importState.isImporting}
                    >
                      {importState.isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing... {importState.importProgress.processed}/
                          {importState.importProgress.total}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Import All
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Import Progress */}
                {importState.isImporting && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>
                        {importState.importProgress.imported} imported,{" "}
                        {importState.importProgress.skipped} skipped
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(importState.importProgress.processed / importState.importProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {importState.parsedBookmarks
                    .slice(0, 10)
                    .map((bookmark, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg text-sm"
                      >
                        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">
                          {bookmark.title || bookmark.url}
                        </span>
                        {bookmark.author_handle && (
                          <span className="text-muted-foreground">
                            @{bookmark.author_handle}
                          </span>
                        )}
                      </div>
                    ))}
                  {importState.parsedBookmarks.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      ...and {importState.parsedBookmarks.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {importState.error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-lg">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{importState.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {mainTab === "settings" && (
          <div className="space-y-6">
            {/* AI Enrichment */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-medium">AI Enrichment</h3>
                  <p className="text-sm text-muted-foreground">
                    Use Claude to automatically summarize, tag, and categorize
                    bookmarks
                  </p>
                </div>
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Claude API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your key is stored locally in your browser
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
                <span className="text-sm">
                  <strong>{unprocessedCount}</strong> bookmarks need AI
                  processing
                </span>
                <Button
                  onClick={runAIEnrichment}
                  disabled={
                    !apiKey || aiState.isProcessing || unprocessedCount === 0
                  }
                  size="sm"
                >
                  {aiState.isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing {aiState.progress.processed}/
                      {aiState.progress.total}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Run Enrichment
                    </>
                  )}
                </Button>
              </div>

              {/* Progress */}
              {aiState.isProcessing && (
                <div className="mb-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{
                        width: `${aiState.progress.total > 0 ? (aiState.progress.processed / aiState.progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {aiState.error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {aiState.error}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Tag className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-medium">Categories</h3>
                  <p className="text-sm text-muted-foreground">
                    Predefined categories for organizing bookmarks
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat.slug}
                    variant="outline"
                    className={categoryColors[cat.slug] || "bg-gray-500/10"}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Collections (future) */}
            <div className="bg-card border border-border rounded-lg p-6 opacity-60">
              <div className="flex items-center gap-3 mb-4">
                <FolderOpen className="w-5 h-5 text-green-500" />
                <div>
                  <h3 className="font-medium">Collections</h3>
                  <p className="text-sm text-muted-foreground">
                    Organize bookmarks into custom collections (coming soon)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBookmarks;
