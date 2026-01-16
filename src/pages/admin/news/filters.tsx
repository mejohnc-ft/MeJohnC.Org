import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Filter,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getNewsFilters,
  createNewsFilter,
  updateNewsFilter,
  deleteNewsFilter,
  type NewsFilter,
} from '@/lib/supabase-queries';

type FilterType = 'include_keyword' | 'exclude_keyword' | 'include_topic' | 'exclude_source';

const filterTypeLabels: Record<FilterType, string> = {
  include_keyword: 'Include Keywords',
  exclude_keyword: 'Exclude Keywords',
  include_topic: 'Topics',
  exclude_source: 'Excluded Sources',
};

const filterTypeColors: Record<FilterType, string> = {
  include_keyword: 'bg-green-500/10 text-green-500 border-green-500/20',
  exclude_keyword: 'bg-red-500/10 text-red-500 border-red-500/20',
  include_topic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  exclude_source: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

const AdminNewsFilters = () => {
  useSEO({ title: 'News Filters', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [filters, setFilters] = useState<NewsFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFilterType, setNewFilterType] = useState<FilterType>('include_keyword');
  const [newFilterValue, setNewFilterValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchFilters = useCallback(async () => {
    if (!supabase) return;

    try {
      const data = await getNewsFilters(false, supabase);
      setFilters(data);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsFilters.fetchFilters',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleAddFilter = async () => {
    if (!supabase || !newFilterValue.trim()) return;

    setIsAdding(true);
    try {
      const created = await createNewsFilter({
        filter_type: newFilterType,
        value: newFilterValue.trim(),
        is_active: true,
      }, supabase);
      setFilters(prev => [created, ...prev]);
      setNewFilterValue('');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsFilters.handleAddFilter',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (filter: NewsFilter) => {
    if (!supabase) return;

    try {
      const updated = await updateNewsFilter(filter.id, { is_active: !filter.is_active }, supabase);
      setFilters(prev => prev.map(f => f.id === filter.id ? updated : f));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsFilters.handleToggleActive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;

    try {
      await deleteNewsFilter(id, supabase);
      setFilters(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AdminNewsFilters.handleDelete',
      });
    }
  };

  const groupedFilters = filters.reduce((acc, filter) => {
    const type = filter.filter_type as FilterType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(filter);
    return acc;
  }, {} as Record<FilterType, NewsFilter[]>);

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/news" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Filters</h1>
            <p className="text-muted-foreground">
              Control what content appears in your feed
            </p>
          </div>
        </div>

        {/* Add Filter */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add Filter</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-foreground mb-1">
                Type
              </label>
              <select
                value={newFilterType}
                onChange={(e) => setNewFilterType(e.target.value as FilterType)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              >
                <option value="include_keyword">Include Keyword</option>
                <option value="exclude_keyword">Exclude Keyword</option>
                <option value="include_topic">Topic</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-foreground mb-1">
                Value
              </label>
              <input
                type="text"
                value={newFilterValue}
                onChange={(e) => setNewFilterValue(e.target.value)}
                placeholder="e.g., Claude, GPT, AI Safety"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
              />
            </div>
            <Button
              onClick={handleAddFilter}
              disabled={isAdding || !newFilterValue.trim()}
              className="gap-2"
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </Button>
          </div>
        </div>

        {/* Filter Groups */}
        {Object.entries(filterTypeLabels).map(([type, label]) => {
          const typeFilters = groupedFilters[type as FilterType] || [];
          if (typeFilters.length === 0 && type !== 'include_keyword') return null;

          return (
            <div key={type} className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{label}</h2>
              <div className="flex flex-wrap gap-2">
                {typeFilters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No filters added</p>
                ) : (
                  typeFilters.map((filter) => (
                    <motion.div
                      key={filter.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                        filterTypeColors[type as FilterType]
                      } ${!filter.is_active ? 'opacity-50' : ''}`}
                    >
                      <span className="text-sm font-medium">{filter.value}</span>
                      <button
                        onClick={() => handleToggleActive(filter)}
                        className="hover:opacity-70"
                        title={filter.is_active ? 'Disable' : 'Enable'}
                      >
                        <Check className={`w-3.5 h-3.5 ${filter.is_active ? '' : 'opacity-30'}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(filter.id)}
                        className="hover:opacity-70"
                        title="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* Info */}
        <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground mb-2">How filters work</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Include Keywords:</strong> Articles must contain at least one of these keywords</li>
            <li><strong>Exclude Keywords:</strong> Articles containing these keywords are hidden</li>
            <li><strong>Topics:</strong> Broader topic categories for organizing content</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNewsFilters;
