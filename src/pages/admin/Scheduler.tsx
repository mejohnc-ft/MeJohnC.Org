import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Activity,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Info,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getScheduledWorkflows,
  getSchedulerHealth,
  getScheduledRunHistory,
  pauseWorkflow,
  resumeWorkflow,
  triggerWorkflowNow,
  type ScheduledWorkflowWithLastRun,
  type SchedulerHealthStats,
} from '@/lib/scheduler-queries';
import type { ScheduledWorkflowRun } from '@/lib/schemas';

// ============================================
// CRON UTILITIES
// ============================================

const CRON_PRESETS = [
  { label: 'Every minute', cron: '* * * * *' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *' },
  { label: 'Every 30 minutes', cron: '*/30 * * * *' },
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Every day at midnight', cron: '0 0 * * *' },
  { label: 'Every day at noon', cron: '0 12 * * *' },
  { label: 'Every Monday at 9am', cron: '0 9 * * 1' },
  { label: 'First day of month', cron: '0 0 1 * *' },
];

function parseCronToHuman(cronExpr: string): string {
  try {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return cronExpr;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Check for common patterns
    if (cronExpr === '* * * * *') return 'Every minute';
    if (cronExpr === '*/5 * * * *') return 'Every 5 minutes';
    if (cronExpr === '*/15 * * * *') return 'Every 15 minutes';
    if (cronExpr === '*/30 * * * *') return 'Every 30 minutes';
    if (cronExpr === '0 * * * *') return 'Every hour';
    if (cronExpr === '0 0 * * *') return 'Daily at midnight';
    if (cronExpr === '0 12 * * *') return 'Daily at noon';
    if (cronExpr === '0 9 * * 1') return 'Every Monday at 9:00 AM';
    if (cronExpr === '0 0 1 * *') return 'First day of each month';

    // Build a description
    let description = 'At ';

    if (minute === '*') {
      description += 'every minute';
    } else if (minute.startsWith('*/')) {
      description += `every ${minute.slice(2)} minutes`;
    } else {
      description += `minute ${minute}`;
    }

    if (hour !== '*') {
      if (hour.startsWith('*/')) {
        description += `, every ${hour.slice(2)} hours`;
      } else {
        description += `, hour ${hour}`;
      }
    }

    if (dayOfMonth !== '*') {
      description += `, day ${dayOfMonth} of month`;
    }

    if (dayOfWeek !== '*') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayNum = parseInt(dayOfWeek);
      if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
        description += `, on ${days[dayNum]}`;
      }
    }

    return description;
  } catch {
    return cronExpr;
  }
}

function getNextCronRun(cronExpr: string): Date | null {
  try {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) return null;

    const now = new Date();
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const next = new Date(now);

    // Simple next run calculation (approximation)
    if (minute !== '*' && hour !== '*') {
      const targetHour = parseInt(hour);
      const targetMin = parseInt(minute);
      if (!isNaN(targetHour) && !isNaN(targetMin)) {
        next.setHours(targetHour, targetMin, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }
    } else if (hour !== '*') {
      const targetHour = parseInt(hour);
      if (!isNaN(targetHour)) {
        next.setHours(targetHour, 0, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }
    } else if (minute !== '*') {
      const targetMin = parseInt(minute);
      if (!isNaN(targetMin)) {
        next.setMinutes(targetMin, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
        }
        return next;
      }
    } else if (minute.startsWith('*/')) {
      const interval = parseInt(minute.slice(2));
      if (!isNaN(interval)) {
        const currentMin = now.getMinutes();
        const nextMin = Math.ceil(currentMin / interval) * interval;
        next.setMinutes(nextMin, 0, 0);
        if (next <= now) {
          next.setMinutes(next.getMinutes() + interval);
        }
        return next;
      }
    } else {
      // Every minute
      next.setMinutes(next.getMinutes() + 1, 0, 0);
      return next;
    }

    return null;
  } catch {
    return null;
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return '—';
  }
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs > 0) {
      // Future
      if (diffMins < 1) return 'in < 1 min';
      if (diffMins < 60) return `in ${diffMins} min`;
      if (diffHours < 24) return `in ${diffHours} hr`;
      return `in ${diffDays} days`;
    } else {
      // Past
      if (diffMins < 1) return '< 1 min ago';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr ago`;
      return `${diffDays} days ago`;
    }
  } catch {
    return '—';
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function Scheduler() {
  useSEO({ title: 'Scheduler', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [workflows, setWorkflows] = useState<ScheduledWorkflowWithLastRun[]>([]);
  const [health, setHealth] = useState<SchedulerHealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<ScheduledWorkflowRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  useEffect(() => {
    if (!authLoading && supabase) {
      loadData();
    }
  }, [supabase, authLoading]);

  useEffect(() => {
    if (expandedWorkflowId && supabase) {
      loadRunHistory(expandedWorkflowId);
    }
  }, [expandedWorkflowId, supabase]);

  async function loadData() {
    if (!supabase) return;

    try {
      setLoading(true);
      setError(null);

      const [workflowsData, healthData] = await Promise.all([
        getScheduledWorkflows(supabase),
        getSchedulerHealth(supabase),
      ]);

      setWorkflows(workflowsData);
      setHealth(healthData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load scheduler data';
      setError(message);
      captureException(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'Scheduler.loadData' }
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRunHistory(workflowId: string) {
    if (!supabase) return;

    try {
      setLoadingHistory(true);
      const runs = await getScheduledRunHistory(workflowId, { limit: 20 }, supabase);
      setRunHistory(runs);
    } catch (err) {
      captureException(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'Scheduler.loadRunHistory', workflowId }
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleToggleActive(workflow: ScheduledWorkflowWithLastRun) {
    if (!supabase) return;

    try {
      setActionLoading({ id: workflow.id, action: 'toggle' });

      if (workflow.is_active) {
        await pauseWorkflow(workflow.id, supabase);
      } else {
        await resumeWorkflow(workflow.id, supabase);
      }

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, is_active: !w.is_active } : w
        )
      );

      // Reload health stats
      const healthData = await getSchedulerHealth(supabase);
      setHealth(healthData);
    } catch (err) {
      captureException(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'Scheduler.handleToggleActive', workflowId: workflow.id }
      );
      setError(err instanceof Error ? err.message : 'Failed to update workflow status');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRunNow(workflow: ScheduledWorkflowWithLastRun) {
    if (!supabase) return;

    try {
      setActionLoading({ id: workflow.id, action: 'run' });
      await triggerWorkflowNow(workflow.id, supabase);

      // Refresh run history if expanded
      if (expandedWorkflowId === workflow.id) {
        await loadRunHistory(workflow.id);
      }

      // Show success feedback
      setError(null);
    } catch (err) {
      captureException(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'Scheduler.handleRunNow', workflowId: workflow.id }
      );
      setError(err instanceof Error ? err.message : 'Failed to trigger workflow');
    } finally {
      setActionLoading(null);
    }
  }

  function toggleWorkflowExpansion(workflowId: string) {
    setExpandedWorkflowId((prev) => (prev === workflowId ? null : workflowId));
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { className: string; icon: any }> = {
      pending: { className: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
      running: { className: 'bg-blue-500/10 text-blue-500', icon: Activity },
      success: { className: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
      completed: { className: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
      failed: { className: 'bg-red-500/10 text-red-500', icon: XCircle },
      cancelled: { className: 'bg-gray-500/10 text-gray-500', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
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
            <h1 className="text-3xl font-bold text-foreground">Scheduler</h1>
            <p className="text-muted-foreground mt-1">
              Manage scheduled workflows and monitor execution health
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Health Stats */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Schedules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{health.activeSchedules}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflows.length} total scheduled workflows
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Next Run</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {health.nextRunTime ? formatRelativeTime(health.nextRunTime) : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {health.nextRunTime ? formatDate(health.nextRunTime) : 'No runs scheduled'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Failed (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${health.failedLast24h > 0 ? 'text-red-500' : 'text-foreground'}`}>
                    {health.failedLast24h}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {health.failedLast24h === 0 ? 'All healthy' : 'Check error logs'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Dispatches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${health.pendingDispatches > 5 ? 'text-yellow-500' : 'text-foreground'}`}>
                    {health.pendingDispatches}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {health.pgCronEnabled ? 'pg_cron enabled' : 'pg_cron disabled'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Scheduled Jobs Table */}
        {workflows.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">No scheduled workflows</h3>
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
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>
                Click a row to view run history and details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Workflow</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Schedule</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Next Run</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Last Run</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Status</th>
                      <th className="text-left p-4 font-semibold text-sm text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow, index) => {
                      const cronExpr = (workflow.trigger_config as any)?.cron || '* * * * *';
                      const humanCron = parseCronToHuman(cronExpr);
                      const nextRun = workflow.is_active ? getNextCronRun(cronExpr) : null;
                      const isExpanded = expandedWorkflowId === workflow.id;

                      return (
                        <motion.tr
                          key={workflow.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="space-y-1">
                              <Link
                                to={`/admin/workflows/${workflow.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {workflow.name}
                              </Link>
                              {workflow.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {workflow.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground">{humanCron}</div>
                              <code className="text-xs text-muted-foreground font-mono">
                                {cronExpr}
                              </code>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {nextRun ? (
                                <>
                                  <div className="text-sm font-medium text-foreground">
                                    {formatRelativeTime(nextRun.toISOString())}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {nextRun.toLocaleString()}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Paused</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {workflow.last_run ? (
                              <div className="space-y-1">
                                <div className="text-sm text-foreground">
                                  {formatRelativeTime(workflow.last_run.created_at)}
                                </div>
                                {getStatusBadge(workflow.last_run.status)}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(workflow)}
                              disabled={actionLoading?.id === workflow.id && actionLoading?.action === 'toggle'}
                              className="gap-2"
                            >
                              {actionLoading?.id === workflow.id && actionLoading?.action === 'toggle' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : workflow.is_active ? (
                                <>
                                  <Play className="w-4 h-4 text-green-500" />
                                  <span className="text-green-500">Active</span>
                                </>
                              ) : (
                                <>
                                  <Pause className="w-4 h-4 text-gray-500" />
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
                                onClick={() => handleRunNow(workflow)}
                                disabled={actionLoading?.id === workflow.id && actionLoading?.action === 'run'}
                              >
                                {actionLoading?.id === workflow.id && actionLoading?.action === 'run' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Run Now'
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleWorkflowExpansion(workflow.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Run History Panel */}
        <AnimatePresence>
          {expandedWorkflowId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Run History</CardTitle>
                      <CardDescription>
                        Recent executions for {workflows.find(w => w.id === expandedWorkflowId)?.name}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedWorkflowId(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : runHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No run history available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {runHistory.map((run, idx) => (
                        <motion.div
                          key={run.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border border-border"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              {getStatusBadge(run.status)}
                              <span className="text-sm text-muted-foreground">
                                Scheduled: {formatDate(run.scheduled_at)}
                              </span>
                            </div>
                            {run.dispatched_at && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Activity className="w-3 h-3" />
                                Dispatched: {formatDate(run.dispatched_at)}
                              </div>
                            )}
                            {run.response_status && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="w-3 h-3" />
                                HTTP {run.response_status}
                              </div>
                            )}
                            {run.error && (
                              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-500">
                                {run.error}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cron Expression Helper */}
        <Card>
          <CardHeader>
            <CardTitle>Cron Expression Quick Reference</CardTitle>
            <CardDescription>
              Common patterns for scheduling workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CRON_PRESETS.map((preset) => (
                <div
                  key={preset.cron}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">{preset.label}</div>
                    <code className="text-xs text-muted-foreground font-mono">{preset.cron}</code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
