import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookText,
  Plus,
  Search,
  Star,
  Copy,
  Trash2,
  X,
  FileText,
  Globe,
  Heart,
  Pencil,
  Check,
  Variable,
  Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  togglePromptFavorite,
  generateSlug,
} from '@/lib/prompt-queries';
import type { Prompt, PromptCreate, PromptQueryOptions } from '@/lib/prompt-schemas';
import type { PromptVariable } from '@/lib/prompt-schemas';

// ============================================
// CONSTANTS
// ============================================

const CATEGORIES = [
  'coding', 'writing', 'analysis', 'creative', 'system',
  'data', 'education', 'business', 'other',
];

const MODELS = [
  'claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001',
  'gpt-4o', 'gpt-4o-mini', 'gemini-2.0-flash', 'other',
];

// ============================================
// MODAL COMPONENT
// ============================================

interface PromptModalProps {
  prompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PromptCreate | { id: string } & Partial<Prompt>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function PromptModal({ prompt, isOpen, onClose, onSave, onDelete }: PromptModalProps) {
  const isEdit = !!prompt;
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [model, setModel] = useState('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setSlug(prompt.slug);
      setContent(prompt.content);
      setDescription(prompt.description ?? '');
      setCategory(prompt.category ?? '');
      setTagsInput((prompt.tags ?? []).join(', '));
      setModel(prompt.model ?? '');
      setIsTemplate(prompt.is_template);
      setIsPublic(prompt.is_public);
      setVariables(prompt.variables ?? []);
    } else {
      setTitle('');
      setSlug('');
      setContent('');
      setDescription('');
      setCategory('');
      setTagsInput('');
      setModel('');
      setIsTemplate(false);
      setIsPublic(false);
      setVariables([]);
    }
    setConfirmDelete(false);
  }, [prompt, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit) {
      setSlug(generateSlug(val));
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const data = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        content,
        description: description.trim() || null,
        category: category || null,
        tags,
        model: model || null,
        is_template: isTemplate,
        is_favorite: prompt?.is_favorite ?? false,
        is_public: isPublic,
        variables: isTemplate ? variables : [],
      };
      if (isEdit && prompt) {
        await onSave({ id: prompt.id, ...data });
      } else {
        await onSave(data as PromptCreate);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!prompt || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(prompt.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const addVariable = () => {
    setVariables(prev => [...prev, { name: '', description: '', default_value: '' }]);
  };

  const updateVariable = (index: number, field: keyof PromptVariable, value: string) => {
    setVariables(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const removeVariable = (index: number) => {
    setVariables(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-lg mb-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? 'Edit Prompt' : 'New Prompt'}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Title</label>
              <Input
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="My Prompt"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Slug</label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="my-prompt"
                className="font-mono text-sm"
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Enter your prompt content..."
                rows={8}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Description</label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of what this prompt does"
              />
            </div>

            {/* Category + Model row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Any</option>
                  {MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tags (comma-separated)</label>
              <Input
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="agent, system-prompt, coding"
              />
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTemplate}
                  onChange={e => setIsTemplate(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Template (has variables)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">Public</span>
              </label>
            </div>

            {/* Variables editor (if template) */}
            {isTemplate && (
              <div className="space-y-3 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Variables (use {'{{name}}'} in content)
                  </label>
                  <Button variant="ghost" size="sm" onClick={addVariable}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                {variables.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
                    <Input
                      value={v.name}
                      onChange={e => updateVariable(i, 'name', e.target.value)}
                      placeholder="name"
                      className="font-mono text-xs"
                    />
                    <Input
                      value={v.description ?? ''}
                      onChange={e => updateVariable(i, 'description', e.target.value)}
                      placeholder="description"
                      className="text-xs"
                    />
                    <Input
                      value={v.default_value ?? ''}
                      onChange={e => updateVariable(i, 'default_value', e.target.value)}
                      placeholder="default"
                      className="text-xs"
                    />
                    <button
                      onClick={() => removeVariable(i)}
                      className="text-muted-foreground hover:text-destructive p-1 mt-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border">
            <div>
              {isEdit && onDelete && (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={confirmDelete ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete' : 'Delete'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !title.trim() || !content.trim()}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                {isEdit ? 'Save Changes' : 'Create Prompt'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// MAIN PAGE
// ============================================

function PromptLibrary() {
  useSEO({ title: 'Prompt Library', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const options: PromptQueryOptions = {};
      if (search) options.search = search;
      if (categoryFilter) options.category = categoryFilter;
      if (showFavorites) options.isFavorite = true;
      if (showTemplates) options.isTemplate = true;
      const data = await getPrompts(options, supabase);
      setPrompts(data);
    } finally {
      setLoading(false);
    }
  }, [supabase, search, categoryFilter, showFavorites, showTemplates]);

  useEffect(() => {
    if (!authLoading && supabase) {
      fetchPrompts();
    }
  }, [authLoading, supabase, fetchPrompts]);

  const handleSave = async (data: PromptCreate | ({ id: string } & Partial<Prompt>)) => {
    if (!supabase) return;
    if ('id' in data) {
      const { id, ...updates } = data;
      await updatePrompt(id, updates, supabase);
    } else {
      await createPrompt(data, supabase);
    }
    await fetchPrompts();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await deletePrompt(id, supabase);
    await fetchPrompts();
  };

  const handleToggleFavorite = async (prompt: Prompt) => {
    if (!supabase) return;
    await togglePromptFavorite(prompt.id, !prompt.is_favorite, supabase);
    await fetchPrompts();
  };

  const handleCopy = async (prompt: Prompt) => {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openNew = () => {
    setEditingPrompt(null);
    setModalOpen(true);
  };

  const openEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setModalOpen(true);
  };

  // Stats
  const stats = useMemo(() => ({
    total: prompts.length,
    templates: prompts.filter(p => p.is_template).length,
    favorites: prompts.filter(p => p.is_favorite).length,
    public: prompts.filter(p => p.is_public).length,
  }), [prompts]);

  // Unique categories from data
  const categories = useMemo(() => {
    const cats = new Set(prompts.map(p => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [prompts]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookText className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Prompt Library</h1>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Prompt
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: FileText },
            { label: 'Templates', value: stats.templates, icon: Variable },
            { label: 'Favorites', value: stats.favorites, icon: Heart },
            { label: 'Public', value: stats.public, icon: Globe },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
              <Icon className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <Button
            variant={showFavorites ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavorites(prev => !prev)}
            className="h-9"
          >
            <Star className={`w-4 h-4 mr-1 ${showFavorites ? 'fill-current' : ''}`} />
            Favorites
          </Button>
          <Button
            variant={showTemplates ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTemplates(prev => !prev)}
            className="h-9"
          >
            <Variable className="w-4 h-4 mr-1" />
            Templates
          </Button>
        </div>

        {/* Prompt Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-20">
            <BookText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No prompts yet</h3>
            <p className="text-muted-foreground mb-4">Create your first prompt to get started.</p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Create Prompt
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {prompts.map((prompt, index) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => openEdit(prompt)}
                        className="text-foreground font-semibold hover:text-primary transition-colors text-left truncate"
                      >
                        {prompt.title}
                      </button>
                      {prompt.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {prompt.category}
                        </Badge>
                      )}
                      {prompt.model && (
                        <Badge variant="outline" className="text-[10px]">
                          {prompt.model}
                        </Badge>
                      )}
                      {prompt.is_template && (
                        <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                          template
                        </Badge>
                      )}
                      {prompt.is_public && (
                        <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                          public
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {prompt.description}
                      </p>
                    )}

                    {/* Tags + meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(prompt.tags ?? []).slice(0, 5).map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                      {prompt.use_count > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          Used {prompt.use_count}x
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(prompt.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleFavorite(prompt)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title={prompt.is_favorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star className={`w-4 h-4 ${prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </button>
                    <button
                      onClick={() => handleCopy(prompt)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Copy content"
                    >
                      {copiedId === prompt.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(prompt)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <PromptModal
        prompt={editingPrompt}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}

export default PromptLibrary;
