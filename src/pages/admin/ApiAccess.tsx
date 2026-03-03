import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Copy,
  Check,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  Globe,
  Webhook,
  PlayCircle,
  X,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/lib/seo";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used_at: string | null;
  status: "active" | "revoked";
}

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  status: "active" | "inactive";
  last_triggered_at: string | null;
}

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

const MOCK_API_KEYS: ApiKey[] = [
  {
    id: "key_1",
    name: "Production API",
    key: "bos_live_1234567890abcdefghijklmnop",
    created_at: "2026-02-15T10:00:00Z",
    last_used_at: "2026-03-02T14:30:00Z",
    status: "active",
  },
  {
    id: "key_2",
    name: "Development API",
    key: "bos_test_abcdefghijklmnopqrstuvwxyz",
    created_at: "2026-02-20T09:00:00Z",
    last_used_at: "2026-03-03T08:15:00Z",
    status: "active",
  },
  {
    id: "key_3",
    name: "Legacy Integration",
    key: "bos_live_zyxwvutsrqponmlkjihgfedcba",
    created_at: "2026-01-10T12:00:00Z",
    last_used_at: "2026-02-28T16:45:00Z",
    status: "revoked",
  },
];

const MOCK_WEBHOOKS: WebhookSubscription[] = [
  {
    id: "wh_1",
    url: "https://example.com/webhooks/tasks",
    events: ["task.created", "task.updated", "task.completed"],
    status: "active",
    last_triggered_at: "2026-03-03T10:00:00Z",
  },
  {
    id: "wh_2",
    url: "https://api.example.com/contact-sync",
    events: ["contact.created", "contact.updated"],
    status: "active",
    last_triggered_at: "2026-03-02T15:30:00Z",
  },
];

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: "GET", path: "/api/v1/contacts", description: "List all contacts" },
  {
    method: "POST",
    path: "/api/v1/contacts",
    description: "Create a new contact",
  },
  {
    method: "GET",
    path: "/api/v1/contacts/:id",
    description: "Get contact by ID",
  },
  {
    method: "PUT",
    path: "/api/v1/contacts/:id",
    description: "Update contact",
  },
  {
    method: "DELETE",
    path: "/api/v1/contacts/:id",
    description: "Delete contact",
  },
  { method: "GET", path: "/api/v1/tasks", description: "List all tasks" },
  { method: "POST", path: "/api/v1/tasks", description: "Create a new task" },
  { method: "GET", path: "/api/v1/tasks/:id", description: "Get task by ID" },
  { method: "PUT", path: "/api/v1/tasks/:id", description: "Update task" },
  { method: "DELETE", path: "/api/v1/tasks/:id", description: "Delete task" },
  { method: "GET", path: "/api/v1/blog-posts", description: "List blog posts" },
  {
    method: "GET",
    path: "/api/v1/blog-posts/:slug",
    description: "Get post by slug",
  },
  {
    method: "GET",
    path: "/api/v1/workflows",
    description: "List all workflows",
  },
  { method: "POST", path: "/api/v1/workflows", description: "Create workflow" },
  {
    method: "POST",
    path: "/api/v1/workflows/:id/execute",
    description: "Execute workflow",
  },
];

const RATE_LIMITS = {
  free: { requests: 100, window: "per hour" },
  starter: { requests: 1000, window: "per hour" },
  professional: { requests: 5000, window: "per hour" },
  business: { requests: 25000, window: "per hour" },
  enterprise: { requests: "Unlimited", window: "" },
};

const WEBHOOK_EVENTS = [
  "task.created",
  "task.updated",
  "task.completed",
  "task.deleted",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "workflow.started",
  "workflow.completed",
  "workflow.failed",
];

export default function ApiAccess() {
  useSEO({ title: "API Access", noIndex: true });

  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [webhooks, setWebhooks] =
    useState<WebhookSubscription[]>(MOCK_WEBHOOKS);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);

  // New key form
  const [newKeyName, setNewKeyName] = useState("");

  // New webhook form
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  const baseUrl = `${window.location.origin}`;

  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const handleGenerateKey = () => {
    setShowNewKeyModal(true);
    setNewKeyName("");
  };

  const handleCreateKey = () => {
    // Placeholder - would call API to generate real key
    const newKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName || "Unnamed Key",
      key: `bos_live_${Math.random().toString(36).substring(2, 30)}`,
      created_at: new Date().toISOString(),
      last_used_at: null,
      status: "active",
    };
    setApiKeys([newKey, ...apiKeys]);
    setShowNewKeyModal(false);
  };

  const handleRevokeKey = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((key) =>
        key.id === keyId ? { ...key, status: "revoked" as const } : key,
      ),
    );
  };

  const handleAddWebhook = () => {
    setShowWebhookModal(true);
    setWebhookUrl("");
    setWebhookEvents([]);
  };

  const handleCreateWebhook = () => {
    const newWebhook: WebhookSubscription = {
      id: `wh_${Date.now()}`,
      url: webhookUrl,
      events: webhookEvents,
      status: "active",
      last_triggered_at: null,
    };
    setWebhooks([newWebhook, ...webhooks]);
    setShowWebhookModal(false);
  };

  const handleDeleteWebhook = (webhookId: string) => {
    setWebhooks((prev) => prev.filter((wh) => wh.id !== webhookId));
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const maskKey = (key: string) => {
    return `${"•".repeat(key.length - 4)}${key.slice(-4)}`;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "POST":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PUT":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "DELETE":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8" />
            API Access
          </h1>
          <p className="text-muted-foreground">
            Manage API keys and webhooks for external integrations
          </p>
        </div>

        {/* API Keys Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">API Keys</h2>
            <Button onClick={handleGenerateKey} className="gap-2">
              <Plus className="w-4 h-4" />
              Generate New Key
            </Button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                      API Key
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                      Created
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                      Last Used
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => {
                    const isVisible = visibleKeys.has(key.id);
                    const isCopied = copiedId === key.id;
                    return (
                      <tr
                        key={key.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3 text-sm text-foreground font-medium">
                          {key.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm text-muted-foreground">
                              {isVisible ? key.key : maskKey(key.key)}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(key.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title={isVisible ? "Hide key" : "Show key"}
                            >
                              {isVisible ? (
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(key.key, key.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Copy key"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {key.last_used_at
                            ? new Date(key.last_used_at).toLocaleString()
                            : "Never"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              key.status === "active"
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                            }
                          >
                            {key.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {key.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeKey(key.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* API Documentation Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            API Documentation
          </h2>

          {/* Base URL */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Base URL
                </h3>
                <p className="text-xs text-muted-foreground">
                  All API requests should be made to this base URL
                </p>
              </div>
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-md">
              <code className="font-mono text-sm text-foreground flex-1">
                {baseUrl}
              </code>
              <button
                onClick={() => copyToClipboard(baseUrl)}
                className="p-1.5 hover:bg-background rounded transition-colors"
                title="Copy base URL"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Available Endpoints */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Available Endpoints
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      Method
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      Endpoint
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {API_ENDPOINTS.map((endpoint, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <Badge
                          className={`${getMethodColor(endpoint.method)} font-mono text-xs`}
                        >
                          {endpoint.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <code className="font-mono text-sm text-foreground">
                          {endpoint.path}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {endpoint.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Example Request */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Example Request
            </h3>
            <div className="bg-[#1e1e1e] rounded-md p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 font-mono">
                <code>
                  {`curl -X GET "${baseUrl}/api/v1/contacts" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                </code>
              </pre>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Rate Limits
                </h3>
                <p className="text-xs text-muted-foreground">
                  API rate limits vary by subscription plan
                </p>
              </div>
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(RATE_LIMITS).map(([plan, limit]) => (
                <div
                  key={plan}
                  className="bg-muted/50 rounded-md px-3 py-2 border border-border"
                >
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    {plan}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {typeof limit.requests === "number"
                      ? limit.requests.toLocaleString()
                      : limit.requests}
                  </div>
                  {limit.window && (
                    <div className="text-xs text-muted-foreground">
                      {limit.window}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Webhook Subscriptions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Webhook Subscriptions
            </h2>
            <Button
              onClick={handleAddWebhook}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Webhook
            </Button>
          </div>

          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="bg-card border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Webhook className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <code className="font-mono text-sm text-foreground block mb-1">
                        {webhook.url}
                      </code>
                      <Badge
                        className={
                          webhook.status === "active"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        }
                      >
                        {webhook.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground hover:text-foreground"
                      title="Test webhook"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Subscribed Events
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>

                {webhook.last_triggered_at && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Last triggered:{" "}
                    {new Date(webhook.last_triggered_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {webhooks.length === 0 && (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">
                No webhooks configured
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Add a webhook to receive real-time event notifications
              </p>
              <Button
                onClick={handleAddWebhook}
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Webhook
              </Button>
            </div>
          )}
        </section>

        {/* Info callout */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Read-only preview</p>
            <p className="text-blue-300/80">
              This page displays placeholder data for demonstration. Full API
              key generation and webhook management will be available in the
              complete implementation.
            </p>
          </div>
        </div>
      </motion.div>

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Generate New API Key</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewKeyModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Give this key a descriptive name to help you identify it later
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowNewKeyModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                <Key className="w-4 h-4 mr-2" />
                Generate Key
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Webhook Subscription</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWebhookModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhooks/endpoint"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The endpoint that will receive webhook events
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Subscribe to Events
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-border rounded-md p-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={webhookEvents.includes(event)}
                      onChange={() => toggleWebhookEvent(event)}
                      className="w-4 h-4 rounded border-border"
                    />
                    <code className="text-sm font-mono">{event}</code>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Select which events should trigger this webhook
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowWebhookModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWebhook}
                disabled={!webhookUrl.trim() || webhookEvents.length === 0}
              >
                <Webhook className="w-4 h-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
