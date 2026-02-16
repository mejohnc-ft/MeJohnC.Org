import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode2,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Loader2,
  FileText,
  Code2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  generateSlug,
} from '@/lib/configs-queries';
import type { Config, ConfigCreate, ConfigQueryOptions } from '@/lib/configs-schemas';
import { CONFIG_TYPES, CONFIG_FORMATS, CONFIG_CATEGORIES } from '@/lib/configs-schemas';

// ============================================
// MODAL COMPONENT
// ============================================

interface ConfigModalProps {
  config: Config | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ConfigCreate | { id: string } & Partial<Config>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function ConfigModal({ config, isOpen, onClose, onSave, onDelete }: ConfigModalProps) {
  const isEdit = !!config;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('file');
  const [sourcePath, setSourcePath] = useState('');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<string>('text');
  const [category, setCategory] = useState<string>('other');
  const [version, setVersion] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (config) {
      setName(config.name);
      setSlug(config.slug);
      setDescription(config.description ?? '');
      setType(config.type);
      setSourcePath(config.source_path ?? '');
      setContent(config.content ?? '');
      setFormat(config.format);
      setCategory(config.category);
      setVersion(config.version ?? '');
      setIsActive(config.is_active);
      setTagsInput((config.tags ?? []).join(', '));
      setNotes(config.notes ?? '');
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setType('file');
      setSourcePath('');
      setContent('');
      setFormat('text');
      setCategory('other');
      setVersion('');
      setIsActive(true);
      setTagsInput('');
      setNotes('');
    }
    setConfirmDelete(false);
  }, [config, isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      setSlug(generateSlug(val));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const data = {
        name: name.trim(),
        slug: slug.trim() || generateSlug(name),
        description: description.trim() || null,
        type,
        source_path: sourcePath.trim() || null,
        content: content || null,
        format,
        category,
        version: version.trim() || null,
        is_active: isActive,
        tags,
        notes: notes.trim() || null,
      };
      if (isEdit && config) {
        await onSave({ id: config.id, ...data });
      } else {
        await onSave(data as ConfigCreate);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!config || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(config.id);
      onClose();
    } finally {
      setDeleting(false);
    }
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
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? 'Edit Config' : 'New Config'}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Name</label>
              <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="ESLint Config" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="eslint-config" className="font-mono text-sm" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this config is for" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {CONFIG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Format</label>
                <select value={format} onChange={e => setFormat(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {CONFIG_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {CONFIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Source Path</label>
                <Input value={sourcePath} onChange={e => setSourcePath(e.target.value)} placeholder="e.g., eslint.config.js" className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Version</label>
                <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g., 1.0.0" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Content</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste config content here..."
                rows={8}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tags (comma-separated)</label>
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="eslint, linting, code-quality" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-input" />
              <span className="text-sm text-foreground">Active</span>
            </label>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Notes (markdown)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
            </div>
          </div>

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
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                {isEdit ? 'Save Changes' : 'Create Config'}
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

function ConfigVault() {
  useSEO({ title: 'Config Vault', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);

  const fetchConfigs = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const options: ConfigQueryOptions = {};
      if (search) options.search = search;
      if (typeFilter) options.type = typeFilter;
      if (formatFilter) options.format = formatFilter;
      if (categoryFilter) options.category = categoryFilter;
      if (activeFilter) options.isActive = true;
      const data = await getConfigs(options, supabase);
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  }, [supabase, search, typeFilter, formatFilter, categoryFilter, activeFilter]);

  useEffect(() => {
    if (!authLoading && supabase) {
      fetchConfigs();
    }
  }, [authLoading, supabase, fetchConfigs]);

  const handleSave = async (data: ConfigCreate | ({ id: string } & Partial<Config>)) => {
    if (!supabase) return;
    if ('id' in data) {
      const { id, ...updates } = data;
      await updateConfig(id, updates, supabase);
    } else {
      await createConfig(data, supabase);
    }
    await fetchConfigs();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await deleteConfig(id, supabase);
    await fetchConfigs();
  };

  const openNew = () => { setEditingConfig(null); setModalOpen(true); };
  const openEdit = (config: Config) => { setEditingConfig(config); setModalOpen(true); };

  const stats = useMemo(() => ({
    total: configs.length,
    active: configs.filter(c => c.is_active).length,
    files: configs.filter(c => c.type === 'file').length,
    snippets: configs.filter(c => c.type === 'snippet').length,
  }), [configs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCode2 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Config Vault</h1>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Config
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: FileCode2 },
            { label: 'Active', value: stats.active, icon: CheckCircle2 },
            { label: 'Files', value: stats.files, icon: FileText },
            { label: 'Snippets', value: stats.snippets, icon: Code2 },
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

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search configs..." className="pl-9" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Types</option>
            {CONFIG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Formats</option>
            {CONFIG_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Categories</option>
            {CONFIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button
            variant={activeFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter(prev => !prev)}
            className="h-9"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Active Only
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20">
            <FileCode2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No configs yet</h3>
            <p className="text-muted-foreground mb-4">Store your first configuration to get started.</p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Create Config
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {configs.map((config, index) => (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {config.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <button onClick={() => openEdit(config)} className="text-foreground font-semibold hover:text-primary transition-colors text-left truncate">
                        {config.name}
                      </button>
                      <Badge variant="secondary" className="text-[10px]">{config.format}</Badge>
                      <Badge variant="outline" className="text-[10px]">{config.category}</Badge>
                      <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">{config.type}</Badge>
                    </div>

                    {config.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{config.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {config.source_path && (
                        <span className="text-[10px] font-mono text-primary/70">{config.source_path}</span>
                      )}
                      {config.version && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">v{config.version}</span>
                      )}
                      {(config.tags ?? []).slice(0, 5).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground">{formatDate(config.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(config)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfigModal
        config={editingConfig}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}

export default ConfigVault;
