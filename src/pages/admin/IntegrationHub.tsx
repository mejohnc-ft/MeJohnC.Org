import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plug, Plus, Pencil, Trash2, Shield, Loader2, ExternalLink, ChevronDown, ChevronRight, X } from 'lucide-react';
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
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrationAgents,
  getAgents,
  grantIntegrationAccess,
  revokeIntegrationAccess,
} from '@/lib/agent-platform-queries';
import type { Integration, AgentPlatform } from '@/lib/schemas';

type ServiceType = 'oauth2' | 'api_key' | 'webhook' | 'custom';
type IntegrationStatus = 'active' | 'inactive' | 'error';

interface IntegrationWithAgents extends Integration {
  agentCount: number;
  agents?: Array<{
    agent_id: string;
    agent_name: string;
    scopes: string[];
    granted_at: string;
  }>;
}

export default function IntegrationHub() {
  useSEO({ title: 'Integration Hub', noIndex: true });
  const supabase = useAuthenticatedSupabase();

  const [integrations, setIntegrations] = useState<IntegrationWithAgents[]>([]);
  const [agents, setAgents] = useState<AgentPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationWithAgents | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    service_name: '',
    display_name: '',
    service_type: 'api_key' as ServiceType,
    description: '',
    config: '{}',
  });

  // Grant access form
  const [grantForm, setGrantForm] = useState({
    agent_id: '',
    scopes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supabase) {
      loadData();
    }
  }, [supabase]);

  const loadData = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const [integrationsData, agentsData] = await Promise.all([
        getIntegrations(supabase),
        getAgents(supabase),
      ]);

      // Load agent counts for each integration
      const integrationsWithCounts = await Promise.all(
        integrationsData.map(async (integration) => {
          const agents = await getIntegrationAgents(supabase, integration.id);
          return {
            ...integration,
            agentCount: agents.length,
          };
        })
      );

      setIntegrations(integrationsWithCounts);
      setAgents(agentsData);
    } catch (error) {
      captureException(error);
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationAgents = async (integrationId: string) => {
    if (!supabase) return;

    try {
      const agentAccess = await getIntegrationAgents(supabase, integrationId);
      setIntegrations(prev =>
        prev.map(int =>
          int.id === integrationId
            ? { ...int, agents: agentAccess }
            : int
        )
      );
    } catch (error) {
      captureException(error);
      console.error('Failed to load integration agents:', error);
    }
  };

  const handleExpand = async (integrationId: string) => {
    if (expandedId === integrationId) {
      setExpandedId(null);
    } else {
      setExpandedId(integrationId);
      await loadIntegrationAgents(integrationId);
    }
  };

  const handleAdd = () => {
    setFormData({
      service_name: '',
      display_name: '',
      service_type: 'api_key',
      description: '',
      config: '{}',
    });
    setShowAddModal(true);
  };

  const handleEdit = (integration: IntegrationWithAgents) => {
    setSelectedIntegration(integration);
    setFormData({
      service_name: integration.service_name,
      display_name: integration.display_name,
      service_type: integration.service_type as ServiceType,
      description: integration.description || '',
      config: JSON.stringify(integration.config || {}, null, 2),
    });
    setShowEditModal(true);
  };

  const handleDelete = (integration: IntegrationWithAgents) => {
    setSelectedIntegration(integration);
    setShowDeleteModal(true);
  };

  const handleSubmitAdd = async () => {
    if (!supabase) return;

    setSubmitting(true);
    try {
      let config = {};
      try {
        config = JSON.parse(formData.config);
      } catch (e) {
        alert('Invalid JSON in config field');
        setSubmitting(false);
        return;
      }

      await createIntegration(supabase, {
        service_name: formData.service_name,
        display_name: formData.display_name,
        service_type: formData.service_type,
        description: formData.description || null,
        config,
        status: 'inactive',
      });

      await loadData();
      setShowAddModal(false);
    } catch (error) {
      captureException(error);
      console.error('Failed to create integration:', error);
      alert('Failed to create integration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!supabase || !selectedIntegration) return;

    setSubmitting(true);
    try {
      let config = {};
      try {
        config = JSON.parse(formData.config);
      } catch (e) {
        alert('Invalid JSON in config field');
        setSubmitting(false);
        return;
      }

      await updateIntegration(supabase, selectedIntegration.id, {
        service_name: formData.service_name,
        display_name: formData.display_name,
        service_type: formData.service_type,
        description: formData.description || null,
        config,
      });

      await loadData();
      setShowEditModal(false);
    } catch (error) {
      captureException(error);
      console.error('Failed to update integration:', error);
      alert('Failed to update integration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!supabase || !selectedIntegration) return;

    setSubmitting(true);
    try {
      await deleteIntegration(supabase, selectedIntegration.id);
      await loadData();
      setShowDeleteModal(false);
    } catch (error) {
      captureException(error);
      console.error('Failed to delete integration:', error);
      alert('Failed to delete integration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrantAccess = (integration: IntegrationWithAgents) => {
    setSelectedIntegration(integration);
    setGrantForm({ agent_id: '', scopes: '' });
    setShowGrantModal(true);
  };

  const handleSubmitGrant = async () => {
    if (!supabase || !selectedIntegration) return;

    setSubmitting(true);
    try {
      const scopes = grantForm.scopes
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await grantIntegrationAccess(supabase, {
        integration_id: selectedIntegration.id,
        agent_id: grantForm.agent_id,
        scopes,
      });

      await loadIntegrationAgents(selectedIntegration.id);
      await loadData();
      setShowGrantModal(false);
    } catch (error) {
      captureException(error);
      console.error('Failed to grant access:', error);
      alert('Failed to grant access');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async (integrationId: string, agentId: string) => {
    if (!supabase) return;

    try {
      await revokeIntegrationAccess(supabase, integrationId, agentId);
      await loadIntegrationAgents(integrationId);
      await loadData();
    } catch (error) {
      captureException(error);
      console.error('Failed to revoke access:', error);
      alert('Failed to revoke access');
    }
  };

  const handleOAuthConnect = async (integration: IntegrationWithAgents) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.functions.invoke('integration-auth', {
        body: { action: 'initiate', integration_id: integration.id },
      });

      if (error) throw error;
      if (data?.auth_url) {
        window.open(data.auth_url, '_blank');
      }
    } catch (error) {
      captureException(error);
      console.error('Failed to initiate OAuth:', error);
      alert('Failed to initiate OAuth connection');
    }
  };

  const getServiceTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'oauth2':
        return 'bg-blue-500/10 text-blue-500';
      case 'api_key':
        return 'bg-orange-500/10 text-orange-500';
      case 'webhook':
        return 'bg-green-500/10 text-green-500';
      case 'custom':
        return 'bg-purple-500/10 text-purple-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!supabase) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500">Please sign in to access the Integration Hub.</p>
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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Plug className="w-8 h-8" />
              Integration Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage third-party integrations and agent access control
            </p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Integration
          </Button>
        </div>

        <Separator />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && integrations.length === 0 && (
          <Card className="p-12 text-center">
            <Plug className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No integrations yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by adding your first integration
            </p>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Integration
            </Button>
          </Card>
        )}

        {/* Integration Cards Grid */}
        {!loading && integrations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              const isExpanded = expandedId === integration.id;

              return (
                <motion.div
                  key={integration.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}
                >
                  <Card className="p-6 space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                          <Plug className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {integration.display_name}
                            </h3>
                            <div
                              className={`w-2 h-2 rounded-full ${getStatusDotClass(
                                integration.status
                              )}`}
                              title={integration.status}
                            />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className={getServiceTypeBadgeClass(
                                integration.service_type
                              )}
                            >
                              {integration.service_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {integration.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(integration)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(integration)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Agent Count & OAuth Connect */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Shield className="w-4 h-4" />
                        {integration.agentCount} agents connected
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.service_type === 'oauth2' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOAuthConnect(integration)}
                            className="gap-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Connect
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExpand(integration.id)}
                          className="gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4" />
                              Expand
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Agent Access Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Agent Access
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrantAccess(integration)}
                              className="gap-2"
                            >
                              <Plus className="w-3 h-3" />
                              Grant Access
                            </Button>
                          </div>

                          {integration.agents && integration.agents.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="border-b border-gray-200 dark:border-gray-700">
                                  <tr className="text-left">
                                    <th className="pb-2 font-semibold">Agent Name</th>
                                    <th className="pb-2 font-semibold">Scopes</th>
                                    <th className="pb-2 font-semibold">Granted At</th>
                                    <th className="pb-2 font-semibold">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {integration.agents.map((agent) => (
                                    <tr
                                      key={agent.agent_id}
                                      className="border-b border-gray-100 dark:border-gray-800"
                                    >
                                      <td className="py-3">{agent.agent_name}</td>
                                      <td className="py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {agent.scopes.map((scope, idx) => (
                                            <Badge
                                              key={idx}
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {scope}
                                            </Badge>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-3 text-gray-600 dark:text-gray-400">
                                        {new Date(agent.granted_at).toLocaleDateString()}
                                      </td>
                                      <td className="py-3">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleRevokeAccess(
                                              integration.id,
                                              agent.agent_id
                                            )
                                          }
                                          className="text-red-500 hover:text-red-600"
                                        >
                                          Revoke
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No agents have access yet
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Add Integration</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Name
                  </label>
                  <Input
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    placeholder="e.g., github"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Display Name
                  </label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    placeholder="e.g., GitHub"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Type
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        service_type: e.target.value as ServiceType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                  >
                    <option value="api_key">API Key</option>
                    <option value="oauth2">OAuth2</option>
                    <option value="webhook">Webhook</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 min-h-[80px]"
                    placeholder="Brief description of this integration"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Config (JSON)
                  </label>
                  <textarea
                    value={formData.config}
                    onChange={(e) =>
                      setFormData({ ...formData, config: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 font-mono text-sm min-h-[120px]"
                    placeholder="{}"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitAdd} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit Integration</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Name
                  </label>
                  <Input
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    placeholder="e.g., github"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Display Name
                  </label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    placeholder="e.g., GitHub"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Service Type
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        service_type: e.target.value as ServiceType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                  >
                    <option value="api_key">API Key</option>
                    <option value="oauth2">OAuth2</option>
                    <option value="webhook">Webhook</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 min-h-[80px]"
                    placeholder="Brief description of this integration"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Config (JSON)
                  </label>
                  <textarea
                    value={formData.config}
                    onChange={(e) =>
                      setFormData({ ...formData, config: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 font-mono text-sm min-h-[120px]"
                    placeholder="{}"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitEdit} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Delete Integration</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {selectedIntegration.display_name}
                </span>
                ? This will revoke access for all connected agents.
              </p>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitDelete}
                  disabled={submitting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Grant Access Modal */}
      {showGrantModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Grant Access</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGrantModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Grant agent access to {selectedIntegration.display_name}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Agent</label>
                  <select
                    value={grantForm.agent_id}
                    onChange={(e) =>
                      setGrantForm({ ...grantForm, agent_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                  >
                    <option value="">Select an agent</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Scopes (comma-separated)
                  </label>
                  <Input
                    value={grantForm.scopes}
                    onChange={(e) =>
                      setGrantForm({ ...grantForm, scopes: e.target.value })
                    }
                    placeholder="read, write, admin"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter scopes separated by commas
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowGrantModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitGrant}
                  disabled={submitting || !grantForm.agent_id}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Grant Access'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
