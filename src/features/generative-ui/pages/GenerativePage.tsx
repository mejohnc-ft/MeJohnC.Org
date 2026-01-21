/**
 * GenerativePage
 *
 * Main admin page for the Generative UI feature.
 * Provides AI-powered panel generation with data sources and style configuration.
 *
 * Pattern: Matches News admin with tabs for Generate/Library/Sources/Settings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  BookOpen,
  Bookmark,
  Settings,
  Database,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Globe,
  Palette,
  LayoutGrid,
  Columns2,
  Columns3,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GenerativePanel } from '../components/GenerativePanel';
import { genuiQueries, type PanelTemplate } from '../services/genui-queries';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  CENTREX_BRAND_COLORS,
  CENTREX_COMPONENT_CATALOG,
} from '@/lib/centrexstyle';
import type { GeneratedUI, GenerativePanel as GenerativePanelType } from '../schemas';

type MainTab = 'generate' | 'library' | 'saved' | 'sources' | 'settings';
type ColumnView = 1 | 2 | 3;

// Data source types for generative UI
interface DataSource {
  id: string;
  name: string;
  source_type: 'metrics' | 'supabase' | 'api' | 'static';
  endpoint?: string;
  table_name?: string;
  api_key?: string;
  refresh_interval_minutes: number;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

interface GenerativeStats {
  total_panels: number;
  published_panels: number;
  draft_panels: number;
  total_templates: number;
  total_generations: number;
  total_tokens_used: number;
}

export default function GenerativePage() {
  useSEO({ title: 'Generative UI', noIndex: true });

  // Navigation
  const [mainTab, setMainTab] = useState<MainTab>('generate');

  // Data
  const [stats, setStats] = useState<GenerativeStats | null>(null);
  const [panels, setPanels] = useState<GenerativePanelType[]>([]);
  const [templates, setTemplates] = useState<PanelTemplate[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [columnView, setColumnView] = useState<ColumnView>(2);

  // Source editor
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [sourceFormData, setSourceFormData] = useState({
    name: '',
    source_type: 'metrics' as DataSource['source_type'],
    endpoint: '',
    table_name: '',
    api_key: '',
    refresh_interval_minutes: 60,
    is_active: true,
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [statsData, panelsData, templatesData] = await Promise.all([
        genuiQueries.getStats(),
        genuiQueries.getPanels(),
        genuiQueries.getTemplates(),
      ]);

      setStats(statsData);
      setPanels(panelsData);
      setTemplates(templatesData);

      // Mock data sources for now (will be replaced with real DB queries)
      setDataSources([
        {
          id: '1',
          name: 'GitHub Stats',
          source_type: 'api',
          endpoint: '/api/github/stats',
          refresh_interval_minutes: 60,
          is_active: true,
          last_fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Supabase Metrics',
          source_type: 'supabase',
          table_name: 'metrics_data',
          refresh_interval_minutes: 30,
          is_active: true,
          last_fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'GenerativePage.fetchData',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (ui: GeneratedUI) => {
    const title = ui.title || 'Untitled Panel';
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    await genuiQueries.createPanel({
      name: title,
      slug,
      description: ui.description,
      prompt: ui.description || title,
      generated_ui: ui,
    });

    // Refresh panels
    const panelsData = await genuiQueries.getPanels();
    setPanels(panelsData);
    const statsData = await genuiQueries.getStats();
    setStats(statsData);
  };

  const handleDeletePanel = async (id: string) => {
    if (!confirm('Delete this panel?')) return;
    try {
      await genuiQueries.deletePanel(id);
      setPanels((prev) => prev.filter((p) => p.id !== id));
      const statsData = await genuiQueries.getStats();
      setStats(statsData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'GenerativePage.handleDeletePanel',
      });
    }
  };

  const handlePublishPanel = async (id: string, isPublished: boolean) => {
    try {
      if (isPublished) {
        await genuiQueries.unpublishPanel(id);
      } else {
        await genuiQueries.publishPanel(id);
      }
      setPanels((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_published: !isPublished } : p))
      );
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'GenerativePage.handlePublishPanel',
      });
    }
  };

  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceError(null);
    setIsSavingSource(true);

    try {
      // TODO: Implement actual data source CRUD when DB tables exist
      const newSource: DataSource = {
        id: editingSource?.id || Date.now().toString(),
        name: sourceFormData.name,
        source_type: sourceFormData.source_type,
        endpoint: sourceFormData.endpoint || undefined,
        table_name: sourceFormData.table_name || undefined,
        api_key: sourceFormData.api_key || undefined,
        refresh_interval_minutes: sourceFormData.refresh_interval_minutes,
        is_active: sourceFormData.is_active,
        last_fetched_at: null,
        created_at: new Date().toISOString(),
      };

      if (editingSource) {
        setDataSources((prev) =>
          prev.map((s) => (s.id === editingSource.id ? newSource : s))
        );
      } else {
        setDataSources((prev) => [...prev, newSource]);
      }

      resetSourceForm();
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleSourceDelete = (id: string) => {
    if (!confirm('Delete this data source?')) return;
    setDataSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSourceEdit = (source: DataSource) => {
    setEditingSource(source);
    setSourceFormData({
      name: source.name,
      source_type: source.source_type,
      endpoint: source.endpoint || '',
      table_name: source.table_name || '',
      api_key: source.api_key || '',
      refresh_interval_minutes: source.refresh_interval_minutes,
      is_active: source.is_active,
    });
    setShowSourceEditor(true);
  };

  const resetSourceForm = () => {
    setShowSourceEditor(false);
    setEditingSource(null);
    setSourceError(null);
    setSourceFormData({
      name: '',
      source_type: 'metrics',
      endpoint: '',
      table_name: '',
      api_key: '',
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

  const getGridClass = () => {
    switch (columnView) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  const sourceTypeLabels: Record<DataSource['source_type'], string> = {
    metrics: 'Metrics API',
    supabase: 'Supabase Table',
    api: 'External API',
    static: 'Static Data',
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              Generative UI
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered CentrexStyle component generation
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {[
            { id: 'generate', label: 'Generate', icon: Sparkles },
            { id: 'library', label: 'Library', icon: BookOpen },
            { id: 'saved', label: 'Saved', icon: Bookmark, count: panels.length },
            { id: 'sources', label: 'Sources', icon: Database },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as MainTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mainTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                  mainTab === tab.id ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Generate Tab */}
        {mainTab === 'generate' && (
          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Total Panels</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total_panels}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold text-green-500">{stats.published_panels}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Generations</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.total_generations}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Templates</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.total_templates}</p>
                </Card>
              </div>
            )}

            {/* Generative Panel */}
            <GenerativePanel
              onSave={handleSave}
              availableDataSources={dataSources.filter((s) => s.is_active).map((s) => s.name)}
              className="min-h-[500px]"
            />
          </div>
        )}

        {/* Library Tab */}
        {mainTab === 'library' && (
          <div className="space-y-6">
            {/* Component Catalog */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Component Catalog</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(CENTREX_COMPONENT_CATALOG).map(([key, component]) => (
                  <Card key={key} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Layers className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{component.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{component.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            {component.category}
                          </span>
                          {'variants' in component && (
                            <span className="text-xs text-muted-foreground">
                              {(component.variants as string[]).length} variants
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="p-4 hover:border-primary/50 transition-colors cursor-pointer">
                      <h3 className="font-medium text-foreground">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{template.category}</span>
                        <span className="text-xs text-muted-foreground">Used {template.use_count} times</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Tab */}
        {mainTab === 'saved' && (
          <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">{panels.length} saved panels</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">View:</span>
                <div className="flex items-center bg-muted/50 border border-border rounded-lg p-1">
                  <button
                    onClick={() => setColumnView(1)}
                    className={`p-1.5 rounded ${columnView === 1 ? 'bg-background shadow' : ''}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setColumnView(2)}
                    className={`p-1.5 rounded ${columnView === 2 ? 'bg-background shadow' : ''}`}
                  >
                    <Columns2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setColumnView(3)}
                    className={`p-1.5 rounded ${columnView === 3 ? 'bg-background shadow' : ''}`}
                  >
                    <Columns3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Panels Grid */}
            {panels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved panels yet</p>
                <p className="text-sm mt-1">Generate and save a panel to see it here</p>
              </div>
            ) : (
              <div className={`grid ${getGridClass()} gap-4`}>
                {panels.map((panel) => (
                  <Card key={panel.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">{panel.name}</h3>
                          {panel.is_published ? (
                            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Published
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                              Draft
                            </span>
                          )}
                        </div>
                        {panel.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{panel.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {formatTimeAgo(panel.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {panel.is_published && (
                          <a
                            href={`/panel/${panel.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-muted"
                            title="View panel"
                          >
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePublishPanel(panel.id, panel.is_published)}
                          title={panel.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {panel.is_published ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePanel(panel.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sources Tab */}
        {mainTab === 'sources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Configure data sources for generated panels</p>
              <Button onClick={() => setShowSourceEditor(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Source
              </Button>
            </div>

            {dataSources.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No data sources configured</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dataSources.map((source) => (
                  <Card key={source.id} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        source.source_type === 'api' ? 'bg-blue-500/10' :
                        source.source_type === 'supabase' ? 'bg-green-500/10' :
                        source.source_type === 'metrics' ? 'bg-orange-500/10' :
                        'bg-muted'
                      }`}>
                        {source.source_type === 'api' ? <Globe className="w-5 h-5 text-blue-500" /> :
                         source.source_type === 'supabase' ? <Database className="w-5 h-5 text-green-500" /> :
                         <Layers className="w-5 h-5 text-orange-500" />}
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
                        <p className="text-sm text-muted-foreground">
                          {sourceTypeLabels[source.source_type]}
                          {source.endpoint && ` • ${source.endpoint}`}
                          {source.table_name && ` • ${source.table_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last fetched: {formatTimeAgo(source.last_fetched_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSourceEdit(source)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSourceDelete(source.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {mainTab === 'settings' && (
          <div className="space-y-6">
            {/* CentrexStyle Colors */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">CentrexStyle Brand Colors</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(CENTREX_BRAND_COLORS).map(([key, color]) => (
                  <div key={key} className="space-y-2">
                    <div
                      className="aspect-square rounded-lg shadow-sm cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: color.hex }}
                      title={`Click to copy ${color.hex}`}
                      onClick={() => navigator.clipboard.writeText(color.hex)}
                    />
                    <div>
                      <p className="text-sm font-medium">{color.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                      <p className="text-xs text-muted-foreground">{color.pms}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                These colors are used by all generated components. View full style guide at{' '}
                <a href="/admin/style-guide" className="text-primary hover:underline">
                  /admin/style-guide
                </a>
              </p>
            </Card>

            {/* Component Variants */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Available Components</h2>
              <div className="space-y-3">
                {Object.entries(CENTREX_COMPONENT_CATALOG).map(([key, component]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <span className="font-medium">{component.name}</span>
                      <span className="text-muted-foreground ml-2">({key})</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-background rounded">{component.category}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Source Editor Modal */}
        <AnimatePresence>
          {showSourceEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetSourceForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold mb-4">
                  {editingSource ? 'Edit Data Source' : 'Add Data Source'}
                </h2>
                <form onSubmit={handleSourceSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={sourceFormData.name}
                      onChange={(e) => setSourceFormData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="e.g., GitHub Stats"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={sourceFormData.source_type}
                      onChange={(e) => setSourceFormData((prev) => ({
                        ...prev,
                        source_type: e.target.value as DataSource['source_type'],
                      }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    >
                      <option value="metrics">Metrics API</option>
                      <option value="supabase">Supabase Table</option>
                      <option value="api">External API</option>
                      <option value="static">Static Data</option>
                    </select>
                  </div>
                  {(sourceFormData.source_type === 'api' || sourceFormData.source_type === 'metrics') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Endpoint</label>
                      <input
                        type="text"
                        value={sourceFormData.endpoint}
                        onChange={(e) => setSourceFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        placeholder="/api/metrics"
                      />
                    </div>
                  )}
                  {sourceFormData.source_type === 'supabase' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Table Name</label>
                      <input
                        type="text"
                        value={sourceFormData.table_name}
                        onChange={(e) => setSourceFormData((prev) => ({ ...prev, table_name: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        placeholder="metrics_data"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Refresh Interval (minutes)</label>
                    <input
                      type="number"
                      value={sourceFormData.refresh_interval_minutes}
                      onChange={(e) => setSourceFormData((prev) => ({
                        ...prev,
                        refresh_interval_minutes: parseInt(e.target.value) || 60,
                      }))}
                      min={1}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="source_is_active"
                      checked={sourceFormData.is_active}
                      onChange={(e) => setSourceFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="source_is_active" className="text-sm">Active</label>
                  </div>
                  {sourceError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {sourceError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetSourceForm} disabled={isSavingSource}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSavingSource}>
                      {isSavingSource ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : editingSource ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
