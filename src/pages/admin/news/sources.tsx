import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Rss,
  Globe,
  Loader2,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getNewsSources,
  getNewsCategories,
  createNewsSource,
  updateNewsSource,
  deleteNewsSource,
  type NewsSource,
  type NewsCategory,
} from '@/lib/supabase-queries';

const AdminNewsSources = () => {
  useSEO({ title: 'News Sources', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [sources, setSources] = useState<NewsSource[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    source_type: 'rss' as 'rss' | 'api',
    url: '',
    api_key: '',
    category_slug: '',
    refresh_interval_minutes: 60,
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    if (!supabase) return;

    try {
      const [sourcesData, categoriesData] = await Promise.all([
        getNewsSources(true, supabase),
        getNewsCategories(supabase),
      ]);
      setSources(sourcesData);
      setCategories(categoriesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSources.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const sourceData = {
        name: formData.name,
        source_type: formData.source_type,
        url: formData.url,
        api_key: formData.api_key || null,
        category_slug: formData.category_slug || null,
        refresh_interval_minutes: formData.refresh_interval_minutes,
        is_active: formData.is_active,
        icon_url: null,
        order_index: sources.length,
      };

      if (editingSource) {
        const updated = await updateNewsSource(editingSource.id, sourceData, supabase);
        setSources(prev => prev.map(s => s.id === editingSource.id ? updated : s));
      } else {
        const created = await createNewsSource(sourceData, supabase);
        setSources(prev => [...prev, created]);
      }

      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'AdminNewsSources.handleSubmit',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('Delete this source? All associated articles will also be deleted.')) return;

    try {
      await deleteNewsSource(id, supabase);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSources.handleDelete',
      });
    }
  };

  const handleEdit = (source: NewsSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      source_type: source.source_type as 'rss' | 'api',
      url: source.url,
      api_key: source.api_key || '',
      category_slug: source.category_slug || '',
      refresh_interval_minutes: source.refresh_interval_minutes,
      is_active: source.is_active,
    });
    setShowEditor(true);
  };

  const resetForm = () => {
    setShowEditor(false);
    setEditingSource(null);
    setError(null);
    setFormData({
      name: '',
      source_type: 'rss',
      url: '',
      api_key: '',
      category_slug: '',
      refresh_interval_minutes: 60,
      is_active: true,
    });
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return then.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/news" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">News Sources</h1>
              <p className="text-muted-foreground">
                Configure RSS feeds and API endpoints
              </p>
            </div>
          </div>
          <Button onClick={() => setShowEditor(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Source
          </Button>
        </div>

        {/* Editor Modal */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {editingSource ? 'Edit Source' : 'Add Source'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="e.g., Anthropic Blog"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Type
                    </label>
                    <select
                      value={formData.source_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, source_type: e.target.value as 'rss' | 'api' }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    >
                      <option value="rss">RSS Feed</option>
                      <option value="api">News API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="https://example.com/feed.xml"
                    />
                  </div>

                  {formData.source_type === 'api' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        placeholder="Your API key"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category_slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_slug: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Refresh Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.refresh_interval_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, refresh_interval_minutes: parseInt(e.target.value) }))}
                      min={15}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                    />
                    <label htmlFor="is_active" className="text-sm text-foreground">
                      Active
                    </label>
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingSource ? 'Update' : 'Create'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sources List */}
        <div className="space-y-4">
          {sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Rss className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No sources configured</p>
              <p className="text-sm mt-1">
                Add your first RSS feed or News API source
              </p>
            </div>
          ) : (
            sources.map((source) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
              >
                <div className={`p-2 rounded-lg ${source.source_type === 'rss' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                  {source.source_type === 'rss' ? (
                    <Rss className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Globe className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{source.name}</h3>
                    {source.is_active ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{source.url}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Last fetched: {formatTimeAgo(source.last_fetched_at)}</span>
                    <span>Every {source.refresh_interval_minutes}m</span>
                    {source.fetch_error && (
                      <span className="text-destructive">Error: {source.fetch_error}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(source)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(source.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNewsSources;
