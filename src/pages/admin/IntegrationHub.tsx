import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plug,
  Plus,
  Github,
  MessageSquare,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Loader2,
  ChevronDown,
  ChevronRight,
  X,
  Trash2,
  RefreshCw,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import {
  getIntegrations,
  createIntegration,
  deleteIntegration,
  testConnection,
  getIntegrationAgents,
  grantAgentAccess,
  revokeAgentAccess,
  getAgentsList,
} from "@/lib/integrations-queries";
import type {
  Integration,
  AgentAccessDetail,
} from "@/lib/integrations-schemas";
import type { AgentPlatform } from "@/lib/schemas";

// Integration templates
interface IntegrationTemplate {
  service_name: string;
  service_type: "oauth2" | "api_key" | "webhook" | "custom";
  display_name: string;
  description: string;
  icon: typeof Github;
  config: Record<string, unknown>;
}

const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    service_name: "github",
    service_type: "oauth2",
    display_name: "GitHub",
    description: "Connect to GitHub for repository management and API access",
    icon: Github,
    config: {
      client_id: "",
      scopes: ["repo", "user", "workflow"],
      redirect_uri: "",
    },
  },
  {
    service_name: "google_workspace",
    service_type: "oauth2",
    display_name: "Google Workspace",
    description: "Access Gmail, Calendar, Drive, and other Google services",
    icon: Globe,
    config: {
      client_id: "",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      redirect_uri: "",
    },
  },
  {
    service_name: "slack",
    service_type: "oauth2",
    display_name: "Slack",
    description: "Send messages and interact with Slack workspaces",
    icon: MessageSquare,
    config: {
      client_id: "",
      scopes: ["chat:write", "channels:read"],
      redirect_uri: "",
    },
  },
  {
    service_name: "openai",
    service_type: "api_key",
    display_name: "OpenAI",
    description: "Access GPT models and OpenAI API services",
    icon: Key,
    config: {
      base_url: "https://api.openai.com/v1",
    },
  },
  {
    service_name: "anthropic",
    service_type: "api_key",
    display_name: "Anthropic",
    description: "Access Claude models and Anthropic API services",
    icon: Key,
    config: {
      base_url: "https://api.anthropic.com/v1",
    },
  },
  {
    service_name: "custom_webhook",
    service_type: "webhook",
    display_name: "Custom Webhook",
    description: "Configure a custom webhook endpoint",
    icon: Plug,
    config: {
      webhook_url: "",
      secret: "",
    },
  },
];

interface IntegrationWithAgents extends Integration {
  agentCount: number;
  agents?: AgentAccessDetail[];
}

// Get icon for service
function getServiceIcon(serviceName: string) {
  const lowerName = serviceName.toLowerCase();
  if (lowerName.includes("github")) return Github;
  if (lowerName.includes("slack")) return MessageSquare;
  if (
    lowerName.includes("key") ||
    lowerName.includes("openai") ||
    lowerName.includes("anthropic")
  )
    return Key;
  return Globe;
}

export default function IntegrationHub() {
  useSEO({ title: "Integration Hub", noIndex: true });
  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();

  const [integrations, setIntegrations] = useState<IntegrationWithAgents[]>([]);
  const [agents, setAgents] = useState<AgentPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IntegrationWithAgents | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    service_name: "",
    display_name: "",
    service_type: "api_key" as "oauth2" | "api_key" | "webhook" | "custom",
    description: "",
    config: "{}",
    health_check_url: "",
  });

  // Grant access form
  const [grantForm, setGrantForm] = useState({
    agent_id: "",
    scopes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(
    null,
  );

  // Status counts
  const statusCounts = {
    active: integrations.filter((i) => i.status === "active").length,
    inactive: integrations.filter((i) => i.status === "inactive").length,
    error: integrations.filter((i) => i.status === "error").length,
  };

  useEffect(() => {
    if (supabase && !authLoading) {
      loadData();
    }
  }, [supabase, authLoading]);

  const loadData = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      const [integrationsData, agentsData] = await Promise.all([
        getIntegrations(supabase),
        getAgentsList(supabase),
      ]);

      // Load agent counts for each integration
      const integrationsWithCounts = await Promise.all(
        integrationsData.map(async (integration) => {
          const agents = await getIntegrationAgents(integration.id, supabase);
          return {
            ...integration,
            agentCount: agents.length,
          };
        }),
      );

      setIntegrations(integrationsWithCounts);
      setAgents(agentsData);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.loadData",
        },
      );
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationAgents = async (integrationId: string) => {
    if (!supabase) return;

    try {
      const agentAccess = await getIntegrationAgents(integrationId, supabase);
      setIntegrations((prev) =>
        prev.map((int) =>
          int.id === integrationId
            ? { ...int, agents: agentAccess, agentCount: agentAccess.length }
            : int,
        ),
      );
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.loadIntegrationAgents",
        },
      );
      console.error("Failed to load integration agents:", error);
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
    setShowTemplates(true);
  };

  const handleSelectTemplate = (template: IntegrationTemplate) => {
    setFormData({
      service_name: template.service_name,
      display_name: template.display_name,
      service_type: template.service_type,
      description: template.description,
      config: JSON.stringify(template.config, null, 2),
      health_check_url: "",
    });
    setShowTemplates(false);
    setShowAddModal(true);
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
      } catch {
        toast.error("Invalid JSON in config field");
        setSubmitting(false);
        return;
      }

      await createIntegration(
        {
          service_name: formData.service_name,
          display_name: formData.display_name,
          service_type: formData.service_type,
          description: formData.description || null,
          config,
          status: "inactive",
          icon_url: null,
          health_check_url: formData.health_check_url || null,
        },
        supabase,
      );

      await loadData();
      setShowAddModal(false);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.createIntegration",
        },
      );
      console.error("Failed to create integration:", error);
      toast.error("Failed to create integration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDelete = async () => {
    if (!supabase || !selectedIntegration) return;

    setSubmitting(true);
    try {
      await deleteIntegration(selectedIntegration.id, supabase);
      await loadData();
      setShowDeleteModal(false);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.deleteIntegration",
        },
      );
      console.error("Failed to delete integration:", error);
      toast.error("Failed to delete integration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrantAccess = (integration: IntegrationWithAgents) => {
    setSelectedIntegration(integration);
    setGrantForm({ agent_id: "", scopes: "" });
    setShowGrantModal(true);
  };

  const handleSubmitGrant = async () => {
    if (!supabase || !selectedIntegration) return;

    setSubmitting(true);
    try {
      const scopes = grantForm.scopes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await grantAgentAccess(
        selectedIntegration.id,
        grantForm.agent_id,
        scopes,
        supabase,
      );

      await loadIntegrationAgents(selectedIntegration.id);
      await loadData();
      setShowGrantModal(false);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.grantAccess",
        },
      );
      console.error("Failed to grant access:", error);
      toast.error("Failed to grant access");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeAccess = async (integrationId: string, agentId: string) => {
    if (!supabase) return;

    try {
      await revokeAgentAccess(integrationId, agentId, supabase);
      await loadIntegrationAgents(integrationId);
      await loadData();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.revokeAccess",
        },
      );
      console.error("Failed to revoke access:", error);
      toast.error("Failed to revoke access");
    }
  };

  // OAuth Connect flow (#271)
  const [connectingOAuth, setConnectingOAuth] = useState<string | null>(null);

  const handleOAuthConnect = async (integration: IntegrationWithAgents) => {
    if (!supabase) return;

    setConnectingOAuth(integration.id);
    try {
      const callbackUri = `${window.location.origin}/admin/integrations/callback`;

      const { data, error } = await supabase.functions.invoke(
        "integration-auth",
        {
          body: {
            action: "initiate",
            integration_id: integration.id,
            redirect_uri: callbackUri,
          },
        },
      );

      if (error || !data?.auth_url || !data?.state) {
        throw new Error(error?.message || "Failed to initiate OAuth flow");
      }

      // Store state in sessionStorage for the callback page
      sessionStorage.setItem(`oauth_integration_${data.state}`, integration.id);

      // Redirect to provider's authorization page
      window.location.href = data.auth_url;
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "IntegrationHub.oauthConnect" },
      );
      console.error("Failed to initiate OAuth:", error);
      toast.error("Failed to start OAuth flow");
      setConnectingOAuth(null);
    }
  };

  const handleTestConnection = async (integration: IntegrationWithAgents) => {
    if (!supabase) return;

    setTestingConnection(integration.id);
    try {
      const result = await testConnection(integration.id, supabase);
      if (result) {
        toast.success("Connection successful!");
      } else {
        toast.error("Connection failed.");
      }
      await loadData();
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: "IntegrationHub.testConnection",
        },
      );
      console.error("Failed to test connection:", error);
      toast.error("Failed to test connection");
    } finally {
      setTestingConnection(null);
    }
  };

  if (!supabase || authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
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
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Plug className="w-8 h-8" />
              Integrations
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage third-party integrations and agent access control
            </p>
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Integration
          </Button>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold">{statusCounts.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disconnected</p>
                <p className="text-2xl font-bold">{statusCounts.inactive}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Error</p>
                <p className="text-2xl font-bold">{statusCounts.error}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && integrations.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Plug className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No integrations yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first integration
            </p>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Integration
            </Button>
          </div>
        )}

        {/* Integration Cards Grid */}
        {!loading && integrations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              const isExpanded = expandedId === integration.id;
              const ServiceIcon = getServiceIcon(integration.service_name);

              return (
                <motion.div
                  key={integration.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}
                >
                  <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-muted">
                          <ServiceIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {integration.display_name}
                            </h3>
                            <Badge
                              className={
                                integration.status === "active"
                                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                                  : integration.status === "error"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                              }
                            >
                              {integration.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {integration.service_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {integration.description || "No description"}
                          </p>
                          {integration.health_checked_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Last checked:{" "}
                              {new Date(
                                integration.health_checked_at,
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(integration)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Agent Count & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        {integration.agentCount} agent
                        {integration.agentCount !== 1 ? "s" : ""} connected
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.service_type === "oauth2" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOAuthConnect(integration)}
                            disabled={connectingOAuth === integration.id}
                            className="gap-2"
                          >
                            {connectingOAuth === integration.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Key className="w-3 h-3" />
                            )}
                            Connect
                          </Button>
                        )}
                        {integration.health_check_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(integration)}
                            disabled={testingConnection === integration.id}
                            className="gap-2"
                          >
                            {testingConnection === integration.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Test
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
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 border-t border-border space-y-4"
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

                          {integration.agents &&
                          integration.agents.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="border-b border-border">
                                  <tr className="text-left">
                                    <th className="pb-2 font-semibold">
                                      Agent Name
                                    </th>
                                    <th className="pb-2 font-semibold">
                                      Scopes
                                    </th>
                                    <th className="pb-2 font-semibold">
                                      Granted At
                                    </th>
                                    <th className="pb-2 font-semibold">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {integration.agents.map((agent) => (
                                    <tr
                                      key={agent.agent_id}
                                      className="border-b border-border"
                                    >
                                      <td className="py-3">
                                        {agent.agent_name}
                                      </td>
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
                                      <td className="py-3 text-muted-foreground">
                                        {new Date(
                                          agent.granted_at,
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="py-3">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleRevokeAccess(
                                              integration.id,
                                              agent.agent_id,
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
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No agents have access yet
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      <AnimatePresence>
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg w-full max-w-4xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Choose Integration Template
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {INTEGRATION_TEMPLATES.map((template) => {
                  const TemplateIcon = template.icon;
                  return (
                    <button
                      key={template.service_name}
                      onClick={() => handleSelectTemplate(template)}
                      className="bg-muted hover:bg-muted/80 border border-border rounded-lg p-4 text-left transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-card rounded-lg">
                          <TemplateIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">
                            {template.display_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                          <Badge variant="outline" className="text-xs mt-2">
                            {template.service_type}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
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
                  <input
                    type="text"
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    placeholder="e.g., github"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    placeholder="e.g., GitHub"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
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
                        service_type: e.target.value as
                          | "oauth2"
                          | "api_key"
                          | "webhook"
                          | "custom",
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
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
                    className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-[80px]"
                    placeholder="Brief description of this integration"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Health Check URL (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.health_check_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        health_check_url: e.target.value,
                      })
                    }
                    placeholder="https://api.example.com/health"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
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
                    className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm min-h-[120px]"
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
                    "Create"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4"
            >
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

              <p className="text-muted-foreground">
                Are you sure you want to delete{" "}
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
                    "Delete"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grant Access Modal */}
      <AnimatePresence>
        {showGrantModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4"
            >
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

              <p className="text-sm text-muted-foreground">
                Grant agent access to {selectedIntegration.display_name}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Agent
                  </label>
                  <select
                    value={grantForm.agent_id}
                    onChange={(e) =>
                      setGrantForm({ ...grantForm, agent_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
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
                  <input
                    type="text"
                    value={grantForm.scopes}
                    onChange={(e) =>
                      setGrantForm({ ...grantForm, scopes: e.target.value })
                    }
                    placeholder="read, write, admin"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
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
                    "Grant Access"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
