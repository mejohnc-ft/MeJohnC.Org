import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Play, Pause, History, Loader2, AlertCircle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getWorkflows, updateWorkflow, getScheduledWorkflowRuns } from '@/lib/agent-platform-queries';
import type { Workflow, ScheduledWorkflowRun } from '@/lib/schemas';

function getNextCronRun(cronExpr: string): string {
  try {
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) return 'Invalid cron';
    const now = new Date();
    // Simple approximation for display only
    const [min, hour] = parts;
    const next = new Date(now);

    if (min !== '*' && hour !== '*') {
      next.setHours(parseInt(hour), parseInt(min), 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (hour !== '*') {
      next.setHours(parseInt(hour), min === '*' ? 0 : parseInt(min), 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
    } else if (min !== '*') {
      next.setMinutes(parseInt(min), 0, 0);
      if (next <= now) next.setHours(next.getHours() + 1);
    } else {
      next.setMinutes(next.getMinutes() + 1, 0, 0);
    }

    return next.toLocaleString();
  } catch {
    return 'Unknown';
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString();
}

export default function Scheduler() {
  useSEO({ title: 'Scheduler', noIndex: true });

  const supabase = useAuthenticatedSupabase();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<ScheduledWorkflowRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [togglingWorkflow, setTogglingWorkflow] = useState<string | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledWorkflows();
  }, [supabase]);

  useEffect(() => {
    if (selectedWorkflowId) {
      loadRunHistory(selectedWorkflowId);
    }
  }, [selectedWorkflowId, supabase]);

  async function loadScheduledWorkflows() {
    if (!supabase) return;

    try {
      setLoading(true);
      setError(null);
      const allWorkflows = await getWorkflows(supabase);
      const scheduled = allWorkflows.filter(w => w.trigger_type === 'scheduled');
      setWorkflows(scheduled);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load scheduled workflows';
      setError(message);
      captureException(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRunHistory(workflowId: string) {
    if (!supabase) return;

    try {
      setLoadingHistory(true);
      const runs = await getScheduledWorkflowRuns(supabase, workflowId);
      setRunHistory(runs);
    } catch (err) {
      captureException(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function toggleWorkflowStatus(workflow: Workflow) {
    if (!supabase) return;

    try {
      setTogglingWorkflow(workflow.id);
      await updateWorkflow(supabase, workflow.id, { is_active: !workflow.is_active });
      setWorkflows(prev => prev.map(w =>
        w.id === workflow.id ? { ...w, is_active: !w.is_active } : w
      ));
    } catch (err) {
      captureException(err);
      setError(err instanceof Error ? err.message : 'Failed to update workflow status');
    } finally {
      setTogglingWorkflow(null);
    }
  }

  async function runWorkflowNow(workflow: Workflow) {
    if (!supabase) return;

    try {
      setRunningWorkflow(workflow.id);
      await supabase.functions.invoke('workflow-executor', {
        body: {
          workflow_id: workflow.id,
          trigger_type: 'manual',
          trigger_data: {}
        }
      });

      // Refresh run history if this workflow is selected
      if (selectedWorkflowId === workflow.id) {
        await loadRunHistory(workflow.id);
      }
    } catch (err) {
      captureException(err);
      setError(err instanceof Error ? err.message : 'Failed to run workflow');
    } finally {
      setRunningWorkflow(null);
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      success: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };

    return (
      <Badge variant="outline" className={variants[status] || variants.pending}>
        {status}
      </Badge>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduler Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage scheduled workflows and view execution history
            </p>
          </div>
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>

        <Separator />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
          >
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : workflows.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No scheduled workflows</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a workflow with a scheduled trigger to see it here.
                </p>
              </div>
              <Button asChild>
                <Link to="/admin/workflows">Go to Workflows</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Workflow Name</th>
                      <th className="text-left p-4 font-semibold">Cron Expression</th>
                      <th className="text-left p-4 font-semibold">Next Run</th>
                      <th className="text-left p-4 font-semibold">Last Run</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-left p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => {
                      const cronExpr = workflow.trigger_config?.cron || '* * * * *';
                      const nextRun = workflow.is_active ? getNextCronRun(cronExpr) : 'Paused';

                      return (
                        <tr key={workflow.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4">
                            <Link
                              to={`/admin/workflows/${workflow.id}`}
                              className="font-medium hover:underline"
                            >
                              {workflow.name}
                            </Link>
                          </td>
                          <td className="p-4">
                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                              {cronExpr}
                            </code>
                          </td>
                          <td className="p-4 text-sm">
                            {nextRun}
                          </td>
                          <td className="p-4 text-sm">
                            {workflow.last_run_at ? formatDate(workflow.last_run_at) : 'Never'}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleWorkflowStatus(workflow)}
                              disabled={togglingWorkflow === workflow.id}
                              className="gap-2"
                            >
                              {togglingWorkflow === workflow.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : workflow.is_active ? (
                                <>
                                  <Play className="h-4 w-4 text-green-500" />
                                  <span className="text-green-500">Active</span>
                                </>
                              ) : (
                                <>
                                  <Pause className="h-4 w-4 text-gray-500" />
                                  <span className="text-gray-500">Paused</span>
                                </>
                              )}
                            </Button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => runWorkflowNow(workflow)}
                                disabled={runningWorkflow === workflow.id}
                              >
                                {runningWorkflow === workflow.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Run Now'
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedWorkflowId(
                                  selectedWorkflowId === workflow.id ? null : workflow.id
                                )}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {selectedWorkflowId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Run History</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedWorkflowId(null)}
                    >
                      Close
                    </Button>
                  </div>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : runHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No run history available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {runHistory.map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {getStatusBadge(run.status)}
                              <span className="text-sm text-muted-foreground">
                                {formatDate(run.dispatched_at)}
                              </span>
                            </div>
                            {run.error && (
                              <p className="text-sm text-red-500 mt-2">
                                {run.error}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
