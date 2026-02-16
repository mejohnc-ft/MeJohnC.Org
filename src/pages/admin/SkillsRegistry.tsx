import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Loader2,
  Zap,
  Bot,
  Terminal,
  FileCode,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  generateSlug,
} from '@/lib/skills-queries';
import type { Skill, SkillCreate, SkillQueryOptions } from '@/lib/skills-schemas';
import { SKILL_TYPES, SKILL_CATEGORIES, SKILL_STATUSES } from '@/lib/skills-schemas';

// ============================================
// MODAL COMPONENT
// ============================================

interface SkillModalProps {
  skill: Skill | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SkillCreate | { id: string } & Partial<Skill>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function SkillModal({ skill, isOpen, onClose, onSave, onDelete }: SkillModalProps) {
  const isEdit = !!skill;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('skill');
  const [source, setSource] = useState('');
  const [invocation, setInvocation] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [depsInput, setDepsInput] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setSlug(skill.slug);
      setDescription(skill.description ?? '');
      setType(skill.type);
      setSource(skill.source ?? '');
      setInvocation(skill.invocation ?? '');
      setCategory(skill.category);
      setDepsInput((skill.dependencies ?? []).join(', '));
      setStatus(skill.status);
      setTagsInput((skill.tags ?? []).join(', '));
      setNotes(skill.notes ?? '');
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setType('skill');
      setSource('');
      setInvocation('');
      setCategory('other');
      setDepsInput('');
      setStatus('active');
      setTagsInput('');
      setNotes('');
    }
    setConfirmDelete(false);
  }, [skill, isOpen]);

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
      const dependencies = depsInput.split(',').map(t => t.trim()).filter(Boolean);
      const data = {
        name: name.trim(),
        slug: slug.trim() || generateSlug(name),
        description: description.trim() || null,
        type,
        source: source.trim() || null,
        invocation: invocation.trim() || null,
        category,
        dependencies,
        status,
        tags,
        notes: notes.trim() || null,
      };
      if (isEdit && skill) {
        await onSave({ id: skill.id, ...data });
      } else {
        await onSave(data as SkillCreate);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!skill || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(skill.id);
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
              {isEdit ? 'Edit Skill' : 'New Skill'}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Name</label>
              <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="My Skill" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="my-skill" className="font-mono text-sm" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this skill does" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {SKILL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Source</label>
              <Input value={source} onChange={e => setSource(e.target.value)} placeholder="e.g., .claude/skills/commit.md" className="font-mono text-sm" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Invocation</label>
              <Input value={invocation} onChange={e => setInvocation(e.target.value)} placeholder="e.g., /commit or claude-code-guide" className="font-mono text-sm" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Dependencies (comma-separated)</label>
              <Input value={depsInput} onChange={e => setDepsInput(e.target.value)} placeholder="node, npm, git" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tags (comma-separated)</label>
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="cli, automation, ai" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Notes (markdown)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={4}
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
                {isEdit ? 'Save Changes' : 'Create Skill'}
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

function SkillsRegistry() {
  useSEO({ title: 'Skills Registry', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const fetchSkills = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const options: SkillQueryOptions = {};
      if (search) options.search = search;
      if (typeFilter) options.type = typeFilter;
      if (categoryFilter) options.category = categoryFilter;
      if (statusFilter) options.status = statusFilter;
      const data = await getSkills(options, supabase);
      setSkills(data);
    } finally {
      setLoading(false);
    }
  }, [supabase, search, typeFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    if (!authLoading && supabase) {
      fetchSkills();
    }
  }, [authLoading, supabase, fetchSkills]);

  const handleSave = async (data: SkillCreate | ({ id: string } & Partial<Skill>)) => {
    if (!supabase) return;
    if ('id' in data) {
      const { id, ...updates } = data;
      await updateSkill(id, updates, supabase);
    } else {
      await createSkill(data, supabase);
    }
    await fetchSkills();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await deleteSkill(id, supabase);
    await fetchSkills();
  };

  const openNew = () => { setEditingSkill(null); setModalOpen(true); };
  const openEdit = (skill: Skill) => { setEditingSkill(skill); setModalOpen(true); };

  const stats = useMemo(() => ({
    total: skills.length,
    active: skills.filter(s => s.status === 'active').length,
    agents: skills.filter(s => s.type === 'agent').length,
    scripts: skills.filter(s => s.type === 'script').length,
  }), [skills]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'agent': return Bot;
      case 'script': return Terminal;
      case 'mcp-server': return FileCode;
      case 'automation': return Zap;
      default: return Wrench;
    }
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
            <Wrench className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Skills Registry</h1>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Skill
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Wrench },
            { label: 'Active', value: stats.active, icon: Zap },
            { label: 'Agents', value: stats.agents, icon: Bot },
            { label: 'Scripts', value: stats.scripts, icon: Terminal },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..." className="pl-9" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Types</option>
            {SKILL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Categories</option>
            {SKILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Statuses</option>
            {SKILL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Skill Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-20">
            <Wrench className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No skills yet</h3>
            <p className="text-muted-foreground mb-4">Register your first skill to get started.</p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Create Skill
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {skills.map((skill, index) => {
              const TypeIcon = typeIcon(skill.type);
              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <button onClick={() => openEdit(skill)} className="text-foreground font-semibold hover:text-primary transition-colors text-left truncate">
                          {skill.name}
                        </button>
                        <Badge variant="secondary" className="text-[10px]">{skill.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{skill.category}</Badge>
                        {skill.status !== 'active' && (
                          <Badge className={`text-[10px] ${skill.status === 'inactive' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                            {skill.status}
                          </Badge>
                        )}
                      </div>

                      {skill.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{skill.description}</p>
                      )}

                      {skill.invocation && (
                        <p className="text-xs font-mono text-primary/70 mb-2">{skill.invocation}</p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {(skill.dependencies ?? []).slice(0, 5).map(dep => (
                          <span key={dep} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{dep}</span>
                        ))}
                        {(skill.tags ?? []).slice(0, 5).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                        ))}
                        <span className="text-[10px] text-muted-foreground">{formatDate(skill.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(skill)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <SkillModal
        skill={editingSkill}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}

export default SkillsRegistry;
