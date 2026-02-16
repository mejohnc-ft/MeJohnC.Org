import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Loader2,
  Activity,
  DollarSign,
  Link2,
  ExternalLink,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getInfraNodes,
  createInfraNode,
  updateInfraNode,
  deleteInfraNode,
  generateSlug,
} from '@/lib/infrastructure-queries';
import type { InfraNode, InfraNodeCreate, InfraQueryOptions } from '@/lib/infrastructure-schemas';
import { INFRA_TYPES, INFRA_PROVIDERS, INFRA_STATUSES, INFRA_ENVIRONMENTS } from '@/lib/infrastructure-schemas';

// ============================================
// STATUS HELPERS
// ============================================

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  degraded: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  inactive: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// ============================================
// MODAL COMPONENT
// ============================================

interface InfraModalProps {
  node: InfraNode | null;
  allNodes: InfraNode[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InfraNodeCreate | { id: string } & Partial<InfraNode>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function InfraModal({ node, allNodes, isOpen, onClose, onSave, onDelete }: InfraModalProps) {
  const isEdit = !!node;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('service');
  const [provider, setProvider] = useState<string>('other');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [tier, setTier] = useState('');
  const [region, setRegion] = useState('');
  const [configNotes, setConfigNotes] = useState('');
  const [environment, setEnvironment] = useState<string>('production');
  const [connectedTo, setConnectedTo] = useState<string[]>([]);
  const [monthlyCost, setMonthlyCost] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setSlug(node.slug);
      setDescription(node.description ?? '');
      setType(node.type);
      setProvider(node.provider);
      setUrl(node.url ?? '');
      setStatus(node.status);
      setTier(node.tier ?? '');
      setRegion(node.region ?? '');
      setConfigNotes(node.config_notes ?? '');
      setEnvironment(node.environment);
      setConnectedTo(node.connected_to ?? []);
      setMonthlyCost(node.monthly_cost !== null ? String(node.monthly_cost) : '');
      setTagsInput((node.tags ?? []).join(', '));
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setType('service');
      setProvider('other');
      setUrl('');
      setStatus('active');
      setTier('');
      setRegion('');
      setConfigNotes('');
      setEnvironment('production');
      setConnectedTo([]);
      setMonthlyCost('');
      setTagsInput('');
    }
    setConfirmDelete(false);
  }, [node, isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      setSlug(generateSlug(val));
    }
  };

  const toggleConnection = (id: string) => {
    setConnectedTo(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
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
        provider,
        url: url.trim() || null,
        status,
        tier: tier.trim() || null,
        region: region.trim() || null,
        config_notes: configNotes.trim() || null,
        environment,
        connected_to: connectedTo,
        monthly_cost: monthlyCost ? parseFloat(monthlyCost) : null,
        tags,
      };
      if (isEdit && node) {
        await onSave({ id: node.id, ...data });
      } else {
        await onSave(data as InfraNodeCreate);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!node || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(node.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  // Available nodes for connections (exclude self)
  const availableNodes = allNodes.filter(n => n.id !== node?.id);

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
              {isEdit ? 'Edit Infrastructure Node' : 'New Infrastructure Node'}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Name</label>
              <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Netlify Production" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Slug</label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="netlify-production" className="font-mono text-sm" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Production hosting for mejohnc.org" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {INFRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Provider</label>
                <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {INFRA_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {INFRA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Environment</label>
                <select value={environment} onChange={e => setEnvironment(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {INFRA_ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Monthly Cost ($)</label>
                <Input value={monthlyCost} onChange={e => setMonthlyCost(e.target.value)} placeholder="0.00" type="number" step="0.01" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Tier</label>
                <Input value={tier} onChange={e => setTier(e.target.value)} placeholder="e.g., Free, Pro, Enterprise" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Region</label>
                <Input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g., us-east-1" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">URL</label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="font-mono text-sm" />
            </div>

            {availableNodes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Connected To</label>
                <div className="flex flex-wrap gap-2 p-3 border border-border rounded-lg max-h-32 overflow-y-auto">
                  {availableNodes.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => toggleConnection(n.id)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        connectedTo.includes(n.id)
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
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="hosting, production, cdn" />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Config Notes (markdown)</label>
              <textarea
                value={configNotes}
                onChange={e => setConfigNotes(e.target.value)}
                placeholder="Configuration notes..."
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
                {isEdit ? 'Save Changes' : 'Create Node'}
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

function InfrastructureMap() {
  useSEO({ title: 'Infrastructure Map', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [nodes, setNodes] = useState<InfraNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [envFilter, setEnvFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<InfraNode | null>(null);

  const fetchNodes = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const options: InfraQueryOptions = {};
      if (search) options.search = search;
      if (typeFilter) options.type = typeFilter;
      if (providerFilter) options.provider = providerFilter;
      if (envFilter) options.environment = envFilter;
      if (statusFilter) options.status = statusFilter;
      const data = await getInfraNodes(options, supabase);
      setNodes(data);
    } finally {
      setLoading(false);
    }
  }, [supabase, search, typeFilter, providerFilter, envFilter, statusFilter]);

  useEffect(() => {
    if (!authLoading && supabase) {
      fetchNodes();
    }
  }, [authLoading, supabase, fetchNodes]);

  const handleSave = async (data: InfraNodeCreate | ({ id: string } & Partial<InfraNode>)) => {
    if (!supabase) return;
    if ('id' in data) {
      const { id, ...updates } = data;
      await updateInfraNode(id, updates, supabase);
    } else {
      await createInfraNode(data, supabase);
    }
    await fetchNodes();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await deleteInfraNode(id, supabase);
    await fetchNodes();
  };

  const openNew = () => { setEditingNode(null); setModalOpen(true); };
  const openEdit = (node: InfraNode) => { setEditingNode(node); setModalOpen(true); };

  const stats = useMemo(() => {
    const totalCost = nodes.reduce((sum, n) => sum + (n.monthly_cost ?? 0), 0);
    const uniqueProviders = new Set(nodes.map(n => n.provider));
    return {
      total: nodes.length,
      active: nodes.filter(n => n.status === 'active').length,
      monthlyCost: totalCost,
      providers: uniqueProviders.size,
    };
  }, [nodes]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getNodeName = (id: string) => {
    return nodes.find(n => n.id === id)?.name ?? 'Unknown';
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
            <Server className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Infrastructure Map</h1>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Node
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Nodes', value: stats.total, icon: Server },
            { label: 'Active', value: stats.active, icon: Activity },
            { label: 'Monthly Cost', value: `$${stats.monthlyCost.toFixed(2)}`, icon: DollarSign },
            { label: 'Providers', value: stats.providers, icon: Link2 },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search infrastructure..." className="pl-9" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Types</option>
            {INFRA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Providers</option>
            {INFRA_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Environments</option>
            {INFRA_ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All Statuses</option>
            {INFRA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-center py-20">
            <Server className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No infrastructure nodes yet</h3>
            <p className="text-muted-foreground mb-4">Map your first infrastructure node to get started.</p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Create Node
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {nodes.map((node, index) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => openEdit(node)} className="text-foreground font-semibold hover:text-primary transition-colors text-left truncate">
                        {node.name}
                      </button>
                      <Badge variant="secondary" className="text-[10px]">{node.provider}</Badge>
                      <Badge variant="outline" className="text-[10px]">{node.type}</Badge>
                      <Badge className={`text-[10px] ${statusColors[node.status] ?? ''}`}>{node.status}</Badge>
                      <Badge className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">{node.environment}</Badge>
                    </div>

                    {node.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{node.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {node.tier && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{node.tier}</span>
                      )}
                      {node.monthly_cost !== null && node.monthly_cost > 0 && (
                        <span className="text-[10px] text-muted-foreground">${node.monthly_cost}/mo</span>
                      )}
                      {(node.connected_to ?? []).length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          <Link2 className="w-3 h-3 inline mr-0.5" />
                          {(node.connected_to ?? []).map(id => getNodeName(id)).join(', ')}
                        </span>
                      )}
                      {node.url && (
                        <a href={node.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                          <ExternalLink className="w-3 h-3" /> Link
                        </a>
                      )}
                      {(node.tags ?? []).slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                      ))}
                      <span className="text-[10px] text-muted-foreground">{formatDate(node.updated_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(node)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Edit">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <InfraModal
        node={editingNode}
        allNodes={nodes}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}

export default InfrastructureMap;
