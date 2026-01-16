import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Loader2,
  GripVertical,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  Palette,
  Tag,
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
  createNewsCategory,
  updateNewsCategory,
  deleteNewsCategory,
  type NewsDashboardTab,
  type NewsCategory,
  type NewsSource,
  generateSlug,
} from '@/lib/supabase-queries';

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

  // Category management state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: 'blue',
  });

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

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setCategoryError('Not authenticated. Please sign in again.');
      return;
    }

    setCategoryError(null);
    setIsSavingCategory(true);

    try {
      const slug = editingCategory?.slug || generateSlug(categoryFormData.name);
      const categoryData = {
        name: categoryFormData.name,
        slug,
        description: categoryFormData.description || null,
        color: categoryFormData.color,
        order_index: categories.length,
      };

      if (editingCategory) {
        const updated = await updateNewsCategory(editingCategory.id, categoryData, supabase);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? updated : c));
      } else {
        const created = await createNewsCategory(categoryData, supabase);
        setCategories(prev => [...prev, created]);
      }

      resetCategoryForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCategoryError(message);
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'AdminNewsSettings.handleCategorySubmit',
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleCategoryDelete = async (category: NewsCategory) => {
    if (!supabase) return;
    if (!confirm(`Delete category "${category.name}"? Sources using this category will have their category cleared.`)) return;

    try {
      await deleteNewsCategory(category.id, supabase);
      setCategories(prev => prev.filter(c => c.id !== category.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCategoryError(message);
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'AdminNewsSettings.handleCategoryDelete',
      });
    }
  };

  const handleCategoryEdit = (category: NewsCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      color: category.color || 'blue',
    });
    setShowCategoryEditor(true);
  };

  const resetCategoryForm = () => {
    setShowCategoryEditor(false);
    setEditingCategory(null);
    setCategoryError(null);
    setCategoryFormData({
      name: '',
      slug: '',
      description: '',
      color: 'blue',
    });
  };

  const categoryColors = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  ];

  const getCategoryColorClass = (color: string | null) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
    };
    return colorMap[color || 'blue'] || 'bg-blue-500';
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

        {/* Category Editor Modal */}
        <AnimatePresence>
          {showCategoryEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.target === e.currentTarget && resetCategoryForm()}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
              >
                <h2 className="text-xl font-bold text-foreground mb-4">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h2>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="e.g., AI Research"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      placeholder="Brief description of the category"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {categoryColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setCategoryFormData(prev => ({ ...prev, color: color.value }))}
                          className={`w-8 h-8 rounded-full ${color.class} ${
                            categoryFormData.color === color.value
                              ? 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                              : ''
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  {categoryError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {categoryError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={resetCategoryForm} disabled={isSavingCategory}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSavingCategory}>
                      {isSavingCategory ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingCategory ? 'Update' : 'Create'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories
              </h2>
              <p className="text-sm text-muted-foreground">
                Organize news sources into categories
              </p>
            </div>
            <Button onClick={() => setShowCategoryEditor(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
              <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No categories yet</p>
              <p className="text-sm">Categories help organize your news sources</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
                >
                  <div className={`w-3 h-3 rounded-full ${getCategoryColorClass(category.color)}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground">{category.name}</span>
                    {category.description && (
                      <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleCategoryEdit(category)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCategoryDelete(category)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
