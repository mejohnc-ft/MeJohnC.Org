import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, Search, Pencil, Trash2, Key, RotateCcw, ShieldOff, Loader2, Copy, Check, MoreVertical } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  generateAgentApiKey,
  rotateAgentApiKey,
  revokeAgentApiKey,
} from '@/lib/agent-platform-queries';
import type { AgentPlatform, PlatformAgentType, PlatformAgentStatus } from '@/lib/schemas';

type ModalType = 'create' | 'edit' | 'delete' | 'apiKey' | null;

interface ApiKeyData {
  apiKey?: string;
  copied: boolean;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function TypeBadge({ type }: { type: PlatformAgentType }) {
  const variants: Record<PlatformAgentType, string> = {
    autonomous: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    supervised: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    tool: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  };

  return (
    <Badge className={`${variants[type]} text-[10px] font-medium`}>
      {type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: PlatformAgentStatus }) {
  const variants: Record<PlatformAgentStatus, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/30',
    inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
    suspended: 'bg-red-500/10 text-red-500 border-red-500/30',
  };

  return (
    <Badge className={`${variants[status]} text-[10px] font-medium`}>
      {status}
    </Badge>
  );
}

export default function AgentRegistry() {
  useSEO({ title: 'Agent Registry', noIndex: true });

  const supabase = useAuthenticatedSupabase();
  const [agents, setAgents] = useState<AgentPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlatformAgentStatus | 'all'>('all');

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentPlatform | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'autonomous' as PlatformAgentType,
    status: 'active' as PlatformAgentStatus,
    capabilities: '',
    rate_limit_rpm: '',
  });

  // API key modal state
  const [apiKeyData, setApiKeyData] = useState<ApiKeyData>({ copied: false });

  // Load agents
  const loadAgents = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const data = await getAgents(supabase);
      setAgents(data);
    } catch (error) {
      captureException(error);
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        loadAgents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadAgents]);

  // Filtered agents
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Modal handlers
  const openCreateModal = () => {
    setFormData({
      name: '',
      type: 'autonomous',
      status: 'active',
      capabilities: '',
      rate_limit_rpm: '',
    });
    setModalType('create');
  };

  const openEditModal = (agent: AgentPlatform) => {
    setSelectedAgent(agent);
    setFormData({
      name: agent.name,
      type: agent.type,
      status: agent.status,
      capabilities: agent.capabilities?.join(', ') || '',
      rate_limit_rpm: agent.rate_limit_rpm?.toString() || '',
    });
    setModalType('edit');
  };

  const openDeleteModal = (agent: AgentPlatform) => {
    setSelectedAgent(agent);
    setModalType('delete');
  };

  const openApiKeyModal = (agent: AgentPlatform) => {
    setSelectedAgent(agent);
    setApiKeyData({ copied: false });
    setModalType('apiKey');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedAgent(null);
    setApiKeyData({ copied: false });
  };

  // CRUD operations
  const handleCreate = async () => {
    if (!supabase || !formData.name) return;

    try {
      setSubmitting(true);
      const capabilities = formData.capabilities
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      await createAgent({
        name: formData.name,
        type: formData.type,
        status: formData.status,
        capabilities: capabilities.length > 0 ? capabilities : null,
        rate_limit_rpm: formData.rate_limit_rpm ? parseInt(formData.rate_limit_rpm) : null,
        metadata: null,
      }, supabase);

      await loadAgents();
      closeModal();
    } catch (error) {
      captureException(error);
      console.error('Failed to create agent:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!supabase || !selectedAgent || !formData.name) return;

    try {
      setSubmitting(true);
      const capabilities = formData.capabilities
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      await updateAgent(selectedAgent.id, {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        capabilities: capabilities.length > 0 ? capabilities : null,
        rate_limit_rpm: formData.rate_limit_rpm ? parseInt(formData.rate_limit_rpm) : null,
      }, supabase);

      await loadAgents();
      closeModal();
    } catch (error) {
      captureException(error);
      console.error('Failed to update agent:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !selectedAgent) return;

    try {
      setSubmitting(true);
      await deleteAgent(selectedAgent.id, supabase);
      await loadAgents();
      closeModal();
    } catch (error) {
      captureException(error);
      console.error('Failed to delete agent:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // API Key operations
  const handleGenerateApiKey = async () => {
    if (!supabase || !selectedAgent) return;

    try {
      setSubmitting(true);
      const newKey = await generateAgentApiKey(selectedAgent.id, supabase);
      setApiKeyData({ apiKey: newKey, copied: false });
      await loadAgents();
    } catch (error) {
      captureException(error);
      console.error('Failed to generate API key:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotateApiKey = async () => {
    if (!supabase || !selectedAgent) return;
    if (!confirm('Are you sure you want to rotate this API key? The old key will be invalidated immediately.')) return;

    try {
      setSubmitting(true);
      const newKey = await rotateAgentApiKey(selectedAgent.id, supabase);
      setApiKeyData({ apiKey: newKey, copied: false });
      await loadAgents();
    } catch (error) {
      captureException(error);
      console.error('Failed to rotate API key:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!supabase || !selectedAgent) return;
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

    try {
      setSubmitting(true);
      await revokeAgentApiKey(selectedAgent.id, supabase);
      setApiKeyData({ copied: false });
      await loadAgents();
    } catch (error) {
      captureException(error);
      console.error('Failed to revoke API key:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setApiKeyData(prev => ({ ...prev, copied: true }));
    setTimeout(() => setApiKeyData(prev => ({ ...prev, copied: false })), 2000);
  };

  if (!supabase) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Registry</h1>
            <p className="text-muted-foreground mt-1">
              Manage autonomous agents, supervised agents, and tools
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status tabs */}
            <div className="flex gap-2">
              {(['all', 'active', 'inactive', 'suspended'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Agents table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card className="p-12 text-center">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first agent'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Bot className="w-5 h-5 text-primary flex-shrink-0" />
                        <h3 className="text-lg font-semibold truncate">{agent.name}</h3>
                        <TypeBadge type={agent.type} />
                        <StatusBadge status={agent.status} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        {/* Capabilities */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Capabilities</p>
                          {agent.capabilities && agent.capabilities.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {agent.capabilities.map((cap) => (
                                <Badge key={cap} variant="outline" className="text-[10px]">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">None</p>
                          )}
                        </div>

                        {/* API Key */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">API Key</p>
                          <p className="text-sm font-mono">
                            {agent.api_key_prefix ? `${agent.api_key_prefix}...` : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </p>
                        </div>

                        {/* Last Seen */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Last Seen</p>
                          <p className="text-sm">{formatRelativeTime(agent.last_seen_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openApiKeyModal(agent)}
                        title="Manage API Key"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(agent)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteModal(agent)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalType && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Create/Edit Modal */}
            {(modalType === 'create' || modalType === 'edit') && (
              <>
                <h2 className="text-xl font-bold mb-4">
                  {modalType === 'create' ? 'Create Agent' : 'Edit Agent'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Agent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as PlatformAgentType })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md"
                    >
                      <option value="autonomous">Autonomous</option>
                      <option value="supervised">Supervised</option>
                      <option value="tool">Tool</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as PlatformAgentStatus })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Capabilities</label>
                    <Input
                      value={formData.capabilities}
                      onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                      placeholder="read, write, execute (comma-separated)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Rate Limit (RPM)</label>
                    <Input
                      type="number"
                      value={formData.rate_limit_rpm}
                      onChange={(e) => setFormData({ ...formData, rate_limit_rpm: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={modalType === 'create' ? handleCreate : handleUpdate}
                    disabled={submitting || !formData.name}
                    className="flex-1"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      modalType === 'create' ? 'Create' : 'Update'
                    )}
                  </Button>
                  <Button variant="outline" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {/* Delete Modal */}
            {modalType === 'delete' && selectedAgent && (
              <>
                <h2 className="text-xl font-bold mb-4">Delete Agent</h2>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete <strong>{selectedAgent.name}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                  </Button>
                  <Button variant="outline" onClick={closeModal} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {/* API Key Modal */}
            {modalType === 'apiKey' && selectedAgent && (
              <>
                <h2 className="text-xl font-bold mb-4">Manage API Key</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Agent: <strong>{selectedAgent.name}</strong>
                </p>

                {apiKeyData.apiKey && (
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">API Key (save this now!)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono break-all">{apiKeyData.apiKey}</code>
                      <button
                        onClick={() => copyToClipboard(apiKeyData.apiKey!)}
                        className="p-2 hover:bg-background rounded transition-colors"
                      >
                        {apiKeyData.copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="space-y-2">
                  {!selectedAgent.api_key_prefix ? (
                    <Button
                      onClick={handleGenerateApiKey}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                      Generate API Key
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleRotateApiKey}
                        disabled={submitting}
                        variant="outline"
                        className="w-full"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        Rotate API Key
                      </Button>
                      <Button
                        onClick={handleRevokeApiKey}
                        disabled={submitting}
                        variant="destructive"
                        className="w-full"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldOff className="w-4 h-4 mr-2" />}
                        Revoke API Key
                      </Button>
                    </>
                  )}
                </div>

                <Button variant="outline" onClick={closeModal} className="w-full mt-4">
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
