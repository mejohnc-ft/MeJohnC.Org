import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Settings,
  Loader2,
  GripVertical,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getNewsDashboardTabs,
  getNewsCategories,
  getNewsSources,
  createNewsDashboardTab,
  updateNewsDashboardTab,
  deleteNewsDashboardTab,
  reorderNewsDashboardTabs,
  type NewsDashboardTab,
  type NewsCategory,
  type NewsSource,
} from '@/lib/supabase-queries';
import { generateSlug } from '@/lib/supabase-queries';

type TabType = 'filter' | 'category' | 'source' | 'saved_search' | 'custom';

const tabTypeLabels: Record<TabType, string> = {
  filter: 'Predefined Filter',
  category: 'Category',
  source: 'Source',
  saved_search: 'Saved Search',
  custom: 'Custom',
};

const AdminNewsSettings = () => {
  useSEO({ title: 'News Settings', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [tabs, setTabs] = useState<NewsDashboardTab[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTab, setEditingTab] = useState<NewsDashboardTab | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    label: '',
    tab_type: 'filter' as TabType,
    config: {} as Record<string, unknown>,
    icon: '',
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    if (!supabase) return;

    try {
      const [tabsData, categoriesData, sourcesData] = await Promise.all([
        getNewsDashboardTabs(false, supabase),
        getNewsCategories(supabase),
        getNewsSources(true, supabase),
      ]);
      setTabs(tabsData);
      setCategories(categoriesData);
      setSources(sourcesData);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSettings.fetchData',
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
    if (!supabase) return;

    try {
      const slug = editingTab?.slug || generateSlug(formData.label);
      const tabData = {
        slug,
        label: formData.label,
        tab_type: formData.tab_type,
        config: formData.config,
        icon: formData.icon || null,
        is_active: formData.is_active,
        is_pinned: false,
        order_index: tabs.length,
      };

      if (editingTab) {
        const updated = await updateNewsDashboardTab(editingTab.id, tabData, supabase);
        setTabs(prev => prev.map(t => t.id === editingTab.id ? updated : t));
      } else {
        const created = await createNewsDashboardTab(tabData, supabase);
        setTabs(prev => [...prev, created]);
      }

      resetForm();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSettings.handleSubmit',
      });
    }
  };

  const handleDelete = async (tab: NewsDashboardTab) => {
    if (!supabase || tab.is_pinned) return;
    if (!confirm('Delete this tab?')) return;

    try {
      await deleteNewsDashboardTab(tab.id, supabase);
      setTabs(prev => prev.filter(t => t.id !== tab.id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSettings.handleDelete',
      });
    }
  };

  const handleToggleActive = async (tab: NewsDashboardTab) => {
    if (!supabase) return;

    try {
      const updated = await updateNewsDashboardTab(tab.id, { is_active: !tab.is_active }, supabase);
      setTabs(prev => prev.map(t => t.id === tab.id ? updated : t));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSettings.handleToggleActive',
      });
    }
  };

  const handleEdit = (tab: NewsDashboardTab) => {
    setEditingTab(tab);
    setFormData({
      label: tab.label,
      tab_type: tab.tab_type as TabType,
      config: tab.config as Record<string, unknown>,
      icon: tab.icon || '',
      is_active: tab.is_active,
    });
    setShowEditor(true);
  };

  const resetForm = () => {
    setShowEditor(false);
    setEditingTab(null);
    setFormData({
      label: '',
      tab_type: 'filter',
      config: {},
      icon: '',
      is_active: true,
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTabs = [...tabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(index, 0, draggedTab);
    setTabs(newTabs);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (!supabase || draggedIndex === null) return;
    setDraggedIndex(null);

    try {
      await reorderNewsDashboardTabs(tabs.map(t => t.id), supabase);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsSettings.handleDragEnd',
      });
    }
  };

  // Config form based on tab type
  const renderConfigForm = () => {
    switch (formData.tab_type) {
      case 'filter':
        return (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Filter Type
            </label>
            <select
              value={(formData.config.filter as string) || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { filter: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
            >
              <option value="">Select filter...</option>
              <option value="all">All Articles</option>
              <option value="unread">Unread</option>
              <option value="bookmarked">Bookmarked</option>
              <option value="curated">Curated</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        );

      case 'category':
        return (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Category
            </label>
            <select
              value={(formData.config.category_slug as string) || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { category_slug: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
            >
              <option value="">Select category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'source':
        return (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Source
            </label>
            <select
              value={(formData.config.source_id as string) || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                config: { source_id: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg"
            >
              <option value="">Select source...</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>
        );

      case 'saved_search':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Include Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={((formData.config.keywords as string[]) || []).join(', ')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="Claude, Anthropic, AI Safety"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Exclude Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={((formData.config.exclude as string[]) || []).join(', ')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    exclude: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }
                }))}
                placeholder="hiring, jobs"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
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
              <h1 className="text-3xl font-bold text-foreground">News Settings</h1>
              <p className="text-muted-foreground">
                Manage dashboard tabs and configuration
              </p>
            </div>
          </div>
          <Button onClick={() => setShowEditor(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tab
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
                  {editingTab ? 'Edit Tab' : 'Add Tab'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="e.g., Claude News"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Type
                    </label>
                    <select
                      value={formData.tab_type}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tab_type: e.target.value as TabType,
                        config: {}
                      }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    >
                      {Object.entries(tabTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {renderConfigForm()}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tab_is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded border-border"
                    />
                    <label htmlFor="tab_is_active" className="text-sm text-foreground">
                      Active
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTab ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs List */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Dashboard Tabs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Drag to reorder. Pinned tabs cannot be deleted.
          </p>

          {tabs.map((tab, index) => (
            <motion.div
              key={tab.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 bg-card border border-border rounded-lg cursor-move ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${!tab.is_active ? 'opacity-60' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{tab.label}</span>
                  {tab.is_pinned && <Lock className="w-3 h-3 text-muted-foreground" />}
                  <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                    {tabTypeLabels[tab.tab_type as TabType]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {JSON.stringify(tab.config)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(tab)}
                >
                  {tab.is_active ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                {!tab.is_pinned && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tab)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tab)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNewsSettings;
