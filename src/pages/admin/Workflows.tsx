import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Plus,
  Search,
  Play,
  Pause,
  Loader2,
  Zap,
  Copy,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import WorkflowCreatePanel from "@/components/admin/WorkflowCreatePanel";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
} from "@/lib/agent-platform-queries";
import type { Workflow } from "@/lib/schemas";

const getTriggerBadgeStyles = (triggerType: string) => {
  switch (triggerType) {
    case "manual":
      return "bg-gray-500/10 text-gray-500";
    case "scheduled":
      return "bg-blue-500/10 text-blue-500";
    case "webhook":
      return "bg-green-500/10 text-green-500";
    case "event":
      return "bg-purple-500/10 text-purple-500";
    default:
      return "bg-gray-500/10 text-gray-500";
  }
};

const Workflows = () => {
  useSEO({ title: "Workflows", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    async function fetchWorkflows() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getWorkflows(supabase);
        setWorkflows(data);
      } catch (error) {
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          { context: "Workflows.fetchWorkflows" },
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkflows();
  }, [supabase]);

  const handleToggleActive = async (workflow: Workflow) => {
    if (!supabase) return;

    try {
      await updateWorkflow(
        workflow.id,
        { is_active: !workflow.is_active },
        supabase,
      );
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, is_active: !w.is_active } : w,
        ),
      );
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "Workflows.toggleActive", workflowId: workflow.id },
      );
    }
  };

  const handleCreateWorkflow = async (data: {
    name: string;
    description: string;
    trigger_type: "manual" | "scheduled" | "webhook" | "event";
    trigger_config: Record<string, unknown>;
    steps: {
      id: string;
      type: string;
      config: Record<string, unknown>;
      timeout_ms: number;
      retries: number;
      on_failure: string;
    }[];
  }) => {
    if (!supabase) return;

    setIsCreating(true);
    try {
      const created = await createWorkflow(
        {
          name: data.name,
          description: data.description || null,
          trigger_type: data.trigger_type,
          trigger_config:
            Object.keys(data.trigger_config).length > 0
              ? data.trigger_config
              : null,
          steps: data.steps,
          is_active: false,
          created_by: null,
        },
        supabase,
      );

      setWorkflows((prev) => [created, ...prev]);
      setShowCreatePanel(false);
      navigate(`/admin/workflows/${created.id}`);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "Workflows.createWorkflow" },
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunNow = async (e: React.MouseEvent, workflow: Workflow) => {
    e.preventDefault();
    e.stopPropagation();
    if (!supabase) return;

    try {
      const { error } = await supabase.functions.invoke("workflow-executor", {
        body: {
          workflow_id: workflow.id,
          trigger_type: "manual",
          trigger_data: {
            triggered_by: "ui",
            triggered_at: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      toast.success(`Workflow "${workflow.name}" started`);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: "Workflows.runNow", workflowId: workflow.id },
      );
      toast.error("Failed to run workflow");
    }
  };

  const getWebhookUrl = (workflow: Workflow) => {
    const webhookId = (
      workflow.trigger_config as Record<string, unknown> | null
    )?.webhook_id;
    if (!webhookId) return null;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    return `${supabaseUrl}/functions/v1/webhook-receiver?webhook_id=${webhookId}`;
  };

  const copyWebhookUrl = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  };

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description &&
        workflow.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workflows</h1>
            <p className="text-muted-foreground mt-1">
              Automate tasks with multi-step workflows
            </p>
          </div>
          <Button onClick={() => setShowCreatePanel(!showCreatePanel)}>
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Main Content: List + Panel */}
        <div className="flex gap-0">
          <motion.div
            animate={{ flex: showCreatePanel ? "0 0 55%" : "1 1 100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="min-w-0"
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredWorkflows.length === 0 && !searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No workflows yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create your first workflow to automate tasks
                </p>
                <Button onClick={() => setShowCreatePanel(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              </motion.div>
            )}

            {/* No Search Results */}
            {!isLoading && filteredWorkflows.length === 0 && searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No workflows found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query
                </p>
              </motion.div>
            )}

            {/* Workflows Grid */}
            {!isLoading && filteredWorkflows.length > 0 && (
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                }}
              >
                {filteredWorkflows.map((workflow, index) => (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer group relative">
                      <Link
                        to={`/admin/workflows/${workflow.id}`}
                        className="absolute inset-0"
                      />

                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {workflow.name}
                            </h3>
                            {workflow.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {workflow.description}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleActive(workflow);
                            }}
                            className="relative z-10 p-1.5 rounded hover:bg-muted transition-colors"
                            aria-label={
                              workflow.is_active
                                ? "Pause workflow"
                                : "Activate workflow"
                            }
                          >
                            {workflow.is_active ? (
                              <Pause className="w-4 h-4 text-green-500" />
                            ) : (
                              <Play className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={getTriggerBadgeStyles(
                              workflow.trigger_type,
                            )}
                          >
                            {workflow.trigger_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {workflow.steps?.length || 0} steps
                          </span>

                          {workflow.trigger_type === "manual" && (
                            <button
                              onClick={(e) => handleRunNow(e, workflow)}
                              className="relative z-10 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Zap className="w-3 h-3" />
                              Run Now
                            </button>
                          )}
                        </div>

                        {workflow.trigger_type === "webhook" &&
                          (() => {
                            const url = getWebhookUrl(workflow);
                            return url ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                                <code className="text-xs text-muted-foreground truncate flex-1">
                                  {url}
                                </code>
                                <button
                                  onClick={(e) => copyWebhookUrl(e, url)}
                                  className="relative z-10 p-1 text-muted-foreground hover:text-foreground rounded"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ) : null;
                          })()}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Create Panel */}
          <AnimatePresence>
            {showCreatePanel && (
              <WorkflowCreatePanel
                onClose={() => setShowCreatePanel(false)}
                onCreate={handleCreateWorkflow}
                isCreating={isCreating}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Workflows;
