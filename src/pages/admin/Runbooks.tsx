import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  Edit3,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getRunbooks,
  createRunbook,
  updateRunbook,
  deleteRunbook,
  generateSlug,
} from '@/lib/runbooks-queries';
import type { Runbook, RunbookCreate, RunbookQueryOptions } from '@/lib/runbooks-schemas';
import { RUNBOOK_CATEGORIES, RUNBOOK_TYPES, RUNBOOK_STATUSES, RUNBOOK_PRIORITIES } from '@/lib/runbooks-schemas';
import { getSkills } from '@/lib/skills-queries';
import type { Skill } from '@/lib/skills-schemas';
import { getInfraNodes } from '@/lib/infrastructure-queries';
import type { InfraNode } from '@/lib/infrastructure-schemas';

// ============================================
// STATUS/PRIORITY HELPERS
// ============================================

const statusColors: Record<string, string> = {
  current: 'bg-green-500/10 text-green-400 border-green-500/20',
  outdated: 'bg-red-500/10 text-red-400 border-red-500/20',
  draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  normal: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

// ============================================
// MODAL COMPONENT
// ============================================

interface RunbookModalProps {
  runbook: Runbook | null;
  skills: Skill[];
  infraNodes: InfraNode[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RunbookCreate | { id: string } & Partial<Runbook>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function RunbookModal({ runbook, skills, infraNodes, isOpen, onClose, onSave, onDelete }: RunbookModalProps) {
  const isEdit = !!runbook;
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [type, setType] = useState<string>('runbook');
  const [status, setStatus] = useState<string>('draft');
  const [priority, setPriority] = useState<string>('normal');
  const [relatedSkills, setRelatedSkills] = useState<string[]>([]);
  const [relatedInfra, setRelatedInfra] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (runbook) {
      setTitle(runbook.title);
      setSlug(runbook.slug);
      setContent(runbook.content ?? '');
      setCategory(runbook.category);
      setType(runbook.type);
      setStatus(runbook.status);
      setPriority(runbook.priority);
      setRelatedSkills(runbook.related_skills ?? []);
      setRelatedInfra(runbook.related_infra ?? []);
      setTagsInput((runbook.tags ?? []).join(', '));
    } else {
      setTitle('');
      setSlug('');
      setContent('');
      setCategory('other');
      setType('runbook');
      setStatus('draft');
      setPriority('normal');
      setRelatedSkills([]);
      setRelatedInfra([]);
      setTagsInput('');
    }
    setConfirmDelete(false);
    setActiveTab('edit');
  }, [runbook, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEdit) {
      setSlug(generateSlug(val));
    }
  };

  const toggleSkill = (id: string) => {
    setRelatedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleInfra = (id: string) => {
    setRelatedInfra(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const data = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        content: content || null,
        category,
        type,
        status,
        priority,
        related_skills: relatedSkills,
        related_infra: relatedInfra,
        tags,
        last_reviewed_at: runbook?.last_reviewed_at ?? null,
      };
      if (isEdit && runbook) {
        await onSave({ id: runbook.id, ...data });
      } else {
        await onSave(data as RunbookCreate);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!runbook || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(runbook.id);
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
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-card border border-border rounded-xl w-full max-w-4xl shadow-lg mb-8"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? 'Edit Runbook' : 'New Runbook'}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Title</label>
              <Input value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Deployment Runbook" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="deployment-runbook" className="font-mono text-sm" />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {RUNBOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {RUNBOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {RUNBOOK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {RUNBOOK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Tabbed content editor */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-foreground">Content (markdown)</label>
                <div className="flex gap-1 ml-auto">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      activeTab === 'edit' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />Edit
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      activeTab === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />Preview
                  </button>
                </div>
              </div>
              {activeTab === 'edit' ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="# Runbook Title&#10;&#10;## Prerequisites&#10;&#10;## Steps&#10;&#10;1. ..."
                  rows={14}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                />
              ) : (
                <div className="min-h-[280px] max-h-[400px] overflow-y-auto rounded-md border border-input p-4 prose prose-sm prose-invert max-w-none">
                  {content ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic">Nothing to preview</p>
                  )}
                </div>
              )}
            </div>

            {/* Related Skills */}
            {skills.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Related Skills</label>
                <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg max-h-28 overflow-y-auto">
                  {skills.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSkill(s.id)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        relatedSkills.includes(s.id)
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/30'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Related Infrastructure */}
            {infraNodes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Related Infrastructure</label>
                <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg max-h-28 overflow-y-auto">
                  {infraNodes.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => toggleInfra(n.id)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        relatedInfra.includes(n.id)
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/30'
                      }`}
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tags (comma-separated)</label>
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="deployment, production, critical" />
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
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                {isEdit ? 'Save Changes' : 'Create Runbook'}
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

function RunbooksPage() {
  useSEO({ title: 'Runbooks', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allInfra, setAllInfra] = useState<InfraNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRunbook, setEditingRunbook] = useState<Runbook | null>(null);

  const fetchRunbooks = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const options: RunbookQueryOptions = {};
      if (search) options.search = search;
      if (categoryFilter) options.category = categoryFilter;
      if (typeFilter) options.type = typeFilter;
      if (statusFilter) options.status = statusFilter;
      if (priorityFilter) options.priority = priorityFilter;
      const data = await getRunbooks(options, supabase);
      setRunbooks(data);
    } finally {
      setLoading(false);
    }
  }, [supabase, search, categoryFilter, typeFilter, statusFilter, priorityFilter]);

  const fetchRelated = useCallback(async () => {
    if (!supabase) return;
    const [skills, infra] = await Promise.all([
      getSkills({}, supabase),
      getInfraNodes({}, supabase),
    ]);
    setAllSkills(skills);
    setAllInfra(infra);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && supabase) {
      fetchRunbooks();
      fetchRelated();
    }
  }, [authLoading, supabase, fetchRunbooks, fetchRelated]);

  const handleSave = async (data: RunbookCreate | ({ id: string } & Partial<Runbook>)) => {
    if (!supabase) return;
    if ('id' in data) {
      const { id, ...updates } = data;
      await updateRunbook(id, updates, supabase);
    } else {
      await createRunbook(data, supabase);
    }
    await fetchRunbooks();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await deleteRunbook(id, supabase);
    await fetchRunbooks();
  };

  const openNew = () => { setEditingRunbook(null); setModalOpen(true); };
  const openEdit = (runbook: Runbook) => { setEditingRunbook(runbook); setModalOpen(true); };

  const stats = useMemo(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const needsReview = runbooks.filter(r => {
      if (r.status !== 'current') return false;
      if (!r.last_reviewed_at) return true;
      return new Date(r.last_reviewed_at) < ninetyDaysAgo;
    }).length;

    return {
      total: runbooks.length,
      current: runbooks.filter(r => r.status === 'current').length,
      critical: runbooks.filter(r => r.priority === 'critical').length,
      needsReview,
    };
  }, [runbooks]);

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
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Runbooks</h1>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Runbook
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: BookOpen },
            { label: 'Current', value: stats.current, icon: CheckCircle2 },
            { label: 'Critical', value: stats.critical, icon: AlertTriangle },
            { label: 'Needs Review', value: stats.needsReview, icon: Clock },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search runbooks..." className="pl-9" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Categories</option>
            {RUNBOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Types</option>
            {RUNBOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Statuses</option>
            {RUNBOOK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Priorities</option>
            {RUNBOOK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : runbooks.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No runbooks yet</h3>
            <p className="text-muted-foreground mb-4">Create your first runbook to get started.</p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Create Runbook
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {runbooks.map((runbook, index) => (
              <motion.div
                key={runbook.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => openEdit(runbook)} className="text-foreground font-semibold hover:text-primary transition-colors text-left truncate">
                        {runbook.title}
                      </button>
                      <Badge variant="outline" className="text-[10px]">{runbook.type}</Badge>
                      <Badge className={`text-[10px] ${statusColors[runbook.status] ?? ''}`}>{runbook.status}</Badge>
                      <Badge className={`text-[10px] ${priorityColors[runbook.priority] ?? ''}`}>{runbook.priority}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{runbook.category}</Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {runbook.last_reviewed_at && (
                        <span className="text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          Reviewed {formatDate(runbook.last_reviewed_at)}
                        </span>
                      )}
                      {(runbook.related_skills ?? []).length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {(runbook.related_skills ?? []).length} skill{(runbook.related_skills ?? []).length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {(runbook.related_infra ?? []).length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {(runbook.related_infra ?? []).length} infra node{(runbook.related_infra ?? []).length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {(runbook.tags ?? []).slice(0, 5).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground">{formatDate(runbook.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(runbook)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <RunbookModal
        runbook={editingRunbook}
        skills={allSkills}
        infraNodes={allInfra}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}

export default RunbooksPage;
