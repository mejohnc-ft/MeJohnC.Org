/**
 * SourceManager Component
 *
 * Manages news sources (RSS feeds, APIs).
 */

'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Rss, Globe, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type NewsSource, type NewsCategory } from '../schemas';

export interface SourceManagerProps {
  sources: NewsSource[];
  categories: NewsCategory[];
  onSourceCreate?: (data: Partial<NewsSource>) => void;
  onSourceUpdate?: (id: string, data: Partial<NewsSource>) => void;
  onSourceDelete?: (id: string) => void;
}

export function SourceManager({
  sources,
  categories,
  onSourceCreate,
  onSourceUpdate,
  onSourceDelete,
}: SourceManagerProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    source_type: 'rss' as 'rss' | 'api',
    url: '',
    api_key: '',
    category_slug: '',
    refresh_interval_minutes: 60,
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSource && onSourceUpdate) {
      onSourceUpdate(editingSource.id, formData);
    } else if (onSourceCreate) {
      onSourceCreate(formData);
    }
    resetForm();
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
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Configure RSS feeds and API endpoints</p>
        <Button onClick={() => setShowEditor(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Source
        </Button>
      </div>

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Rss className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No sources configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
            >
              <div
                className={`p-2 rounded-lg ${
                  source.source_type === 'rss' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                }`}
              >
                {source.source_type === 'rss' ? (
                  <Rss className="w-5 h-5 text-orange-500" />
                ) : (
                  <Globe className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{source.name}</h3>
                  {source.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{source.url}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Last: {formatTimeAgo(source.last_fetched_at)}</span>
                  {source.fetch_error && (
                    <span className="text-destructive">Error: {source.fetch_error}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(source)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                {onSourceDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSourceDelete(source.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingSource ? 'Edit Source' : 'Add Source'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  placeholder="e.g., Anthropic Blog"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.source_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      source_type: e.target.value as 'rss' | 'api',
                    }))
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                >
                  <option value="rss">RSS Feed</option>
                  <option value="api">News API</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                  placeholder="https://example.com/feed.xml"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category_slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category_slug: e.target.value }))
                  }
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_active" className="text-sm">
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">{editingSource ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
