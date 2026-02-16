import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Save, Play, Plus, Trash2, ChevronDown, ChevronRight, GripVertical, ArrowLeft, Loader2, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getWorkflowById, updateWorkflow, deleteWorkflow, getWorkflowRuns } from '@/lib/agent-platform-queries';
import type { Workflow, WorkflowRun } from '@/lib/schemas';

interface WorkflowStep {
  id: string;
  type: 'agent_command' | 'wait' | 'condition';
  config: Record<string, unknown>;
  timeout_ms: number;
  retries: number;
  on_failure: 'continue' | 'stop' | 'skip';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString();
}

const WorkflowEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useSEO({ title: 'Workflow Editor', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'manual' as 'manual' | 'scheduled' | 'webhook' | 'event',
    trigger_config: {} as Record<string, unknown>,
    steps: [] as WorkflowStep[],
    is_active: true,
  });

  // Cron builder state
  const [cronExpression, setCronExpression] = useState({
    minute: '*',
    hour: '*',
    dom: '*',
    month: '*',
    dow: '*',
  });

  useEffect(() => {
    async function fetchWorkflow() {
      if (!supabase || !id) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getWorkflowById(id, supabase);
        setWorkflow(data);

        // Parse steps array
        const steps = Array.isArray(data.steps)
          ? data.steps.map((step: any) => ({
              id: step.id || crypto.randomUUID(),
              type: step.type || 'agent_command',
              config: step.config || {},
              timeout_ms: step.timeout_ms || 30000,
              retries: step.retries || 0,
              on_failure: step.on_failure || 'stop',
            }))
          : [];

        setFormData({
          name: data.name,
          description: data.description || '',
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config || {},
          steps,
          is_active: data.is_active,
        });

        // Parse cron expression if scheduled
        if (data.trigger_type === 'scheduled' && data.trigger_config?.cron) {
          const parts = String(data.trigger_config.cron).split(' ');
          if (parts.length === 5) {
            setCronExpression({
              minute: parts[0],
              hour: parts[1],
              dom: parts[2],
              month: parts[3],
              dow: parts[4],
            });
          }
        }

        // Fetch run history
        const runs = await getWorkflowRuns(id, 20, supabase);
        setWorkflowRuns(runs);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'WorkflowEditor.fetchWorkflow',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkflow();
  }, [supabase, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !id) return;

    setIsSaving(true);
    try {
      const workflowData: Partial<Workflow> = {
        name: formData.name,
        description: formData.description || null,
        trigger_type: formData.trigger_type,
        trigger_config: formData.trigger_type === 'scheduled'
          ? { cron: `${cronExpression.minute} ${cronExpression.hour} ${cronExpression.dom} ${cronExpression.month} ${cronExpression.dow}` }
          : formData.trigger_config,
        steps: formData.steps,
        is_active: formData.is_active,
      };

      await updateWorkflow(id, workflowData, supabase);

      // Refresh workflow
      const updated = await getWorkflowById(id, supabase);
      setWorkflow(updated);

      alert('Workflow saved successfully');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'WorkflowEditor.handleSubmit',
      });
      alert('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !id) return;
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await deleteWorkflow(id, supabase);
      navigate('/admin/workflows');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'WorkflowEditor.handleDelete',
      });
      alert('Failed to delete workflow.');
    }
  };

  const handleTestRun = async () => {
    if (!supabase || !id) return;

    setIsTestRunning(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: { workflow_id: id, trigger_type: 'manual', trigger_data: {} }
      });

      if (error) throw error;

      setTestResult({
        success: true,
        message: 'Test run started successfully',
      });

      // Refresh run history
      setTimeout(async () => {
        const runs = await getWorkflowRuns(id, 20, supabase);
        setWorkflowRuns(runs);
      }, 2000);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'WorkflowEditor.handleTestRun',
      });
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start test run',
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      type: 'agent_command',
      config: {},
      timeout_ms: 30000,
      retries: 0,
      on_failure: 'stop',
    };

    setFormData({
      ...formData,
      steps: [...formData.steps, newStep],
    });

    // Auto-expand the new step
    setExpandedSteps(new Set([...expandedSteps, newStep.id]));
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    });
  };

  const deleteStep = (stepId: string) => {
    if (!confirm('Delete this step?')) return;

    setFormData({
      ...formData,
      steps: formData.steps.filter(step => step.id !== stepId),
    });

    const newExpandedSteps = new Set(expandedSteps);
    newExpandedSteps.delete(stepId);
    setExpandedSteps(newExpandedSteps);
  };

  const toggleStepExpanded = (stepId: string) => {
    const newExpandedSteps = new Set(expandedSteps);
    if (newExpandedSteps.has(stepId)) {
      newExpandedSteps.delete(stepId);
    } else {
      newExpandedSteps.add(stepId);
    }
    setExpandedSteps(newExpandedSteps);
  };

  const toggleRunExpanded = (runId: string) => {
    const newExpandedRuns = new Set(expandedRuns);
    if (newExpandedRuns.has(runId)) {
      newExpandedRuns.delete(runId);
    } else {
      newExpandedRuns.add(runId);
    }
    setExpandedRuns(newExpandedRuns);
  };

  const setCronPreset = (preset: string) => {
    const presets: Record<string, typeof cronExpression> = {
      'every-minute': { minute: '*', hour: '*', dom: '*', month: '*', dow: '*' },
      'every-hour': { minute: '0', hour: '*', dom: '*', month: '*', dow: '*' },
      'daily-midnight': { minute: '0', hour: '0', dom: '*', month: '*', dow: '*' },
      'weekly-mon-9am': { minute: '0', hour: '9', dom: '*', month: '*', dow: '1' },
      'monthly-1st': { minute: '0', hour: '0', dom: '1', month: '*', dow: '*' },
    };

    if (presets[preset]) {
      setCronExpression(presets[preset]);
    }
  };

  const getStatusBadge = (status: WorkflowRun['status']) => {
    const styles: Record<WorkflowRun['status'], string> = {
      pending: 'bg-gray-500/10 text-gray-500',
      running: 'bg-blue-500/10 text-blue-500',
      completed: 'bg-green-500/10 text-green-500',
      failed: 'bg-red-500/10 text-red-500',
      cancelled: 'bg-yellow-500/10 text-yellow-500',
    };

    const icons: Record<WorkflowRun['status'], React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      running: <Loader2 className="w-3 h-3 animate-spin" />,
      completed: <CheckCircle2 className="w-3 h-3" />,
      failed: <AlertCircle className="w-3 h-3" />,
      cancelled: <AlertCircle className="w-3 h-3" />,
    };

    return (
      <Badge className={styles[status]}>
        <span className="flex items-center gap-1">
          {icons[status]}
          {status}
        </span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!workflow) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Workflow not found</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/admin/workflows">Back to Workflows</Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const cronString = `${cronExpression.minute} ${cronExpression.hour} ${cronExpression.dom} ${cronExpression.month} ${cronExpression.dow}`;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/workflows">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Workflow</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure workflow steps and execution settings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestRun}
              disabled={isTestRunning}
            >
              {isTestRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Test Run
                </>
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Test Result Alert */}
        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg border ${
                testResult.success
                  ? 'bg-green-500/10 border-green-500/20 text-green-600'
                  : 'bg-red-500/10 border-red-500/20 text-red-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata Section */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Workflow Metadata</h2>
            </div>
            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="My Workflow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Trigger Type</label>
                <select
                  value={formData.trigger_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger_type: e.target.value as 'manual' | 'scheduled' | 'webhook' | 'event',
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                >
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="webhook">Webhook</option>
                  <option value="event">Event</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                placeholder="A brief description of this workflow..."
              />
            </div>

            {/* Cron Builder for Scheduled Workflows */}
            {formData.trigger_type === 'scheduled' && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Cron Schedule</h3>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCronPreset('every-minute')}
                  >
                    Every minute
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCronPreset('every-hour')}
                  >
                    Every hour
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCronPreset('daily-midnight')}
                  >
                    Daily midnight
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCronPreset('weekly-mon-9am')}
                  >
                    Weekly Mon 9am
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCronPreset('monthly-1st')}
                  >
                    Monthly 1st
                  </Button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Minute</label>
                    <Input
                      value={cronExpression.minute}
                      onChange={(e) => setCronExpression({ ...cronExpression, minute: e.target.value })}
                      placeholder="*"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Hour</label>
                    <Input
                      value={cronExpression.hour}
                      onChange={(e) => setCronExpression({ ...cronExpression, hour: e.target.value })}
                      placeholder="*"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Day</label>
                    <Input
                      value={cronExpression.dom}
                      onChange={(e) => setCronExpression({ ...cronExpression, dom: e.target.value })}
                      placeholder="*"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Month</label>
                    <Input
                      value={cronExpression.month}
                      onChange={(e) => setCronExpression({ ...cronExpression, month: e.target.value })}
                      placeholder="*"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Day of Week</label>
                    <Input
                      value={cronExpression.dow}
                      onChange={(e) => setCronExpression({ ...cronExpression, dow: e.target.value })}
                      placeholder="*"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="text-xs font-mono bg-background px-3 py-2 rounded border border-border">
                  Cron: <span className="text-primary">{cronString}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="is_active" className="text-sm">
                Active (workflow can be triggered)
              </label>
            </div>
          </Card>

          {/* Steps Section */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Steps</h2>
                <Badge variant="outline">{formData.steps.length}</Badge>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>
            <Separator />

            <div className="space-y-3">
              {formData.steps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No steps yet. Click "Add Step" to get started.
                </div>
              ) : (
                <AnimatePresence>
                  {formData.steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <span className="font-semibold text-sm">Step {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              {step.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleStepExpanded(step.id)}
                            >
                              {expandedSteps.has(step.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteStep(step.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedSteps.has(step.id) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 pt-3 border-t border-border"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1">Type</label>
                                  <select
                                    value={step.type}
                                    onChange={(e) =>
                                      updateStep(step.id, {
                                        type: e.target.value as WorkflowStep['type'],
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                                  >
                                    <option value="agent_command">Agent Command</option>
                                    <option value="wait">Wait</option>
                                    <option value="condition">Condition</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium mb-1">On Failure</label>
                                  <select
                                    value={step.on_failure}
                                    onChange={(e) =>
                                      updateStep(step.id, {
                                        on_failure: e.target.value as WorkflowStep['on_failure'],
                                      })
                                    }
                                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                                  >
                                    <option value="continue">Continue</option>
                                    <option value="stop">Stop</option>
                                    <option value="skip">Skip</option>
                                  </select>
                                </div>
                              </div>

                              {/* Type-specific fields */}
                              {step.type === 'agent_command' && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Command</label>
                                    <Input
                                      value={String(step.config.command || '')}
                                      onChange={(e) =>
                                        updateStep(step.id, {
                                          config: { ...step.config, command: e.target.value },
                                        })
                                      }
                                      placeholder="agent.run"
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium mb-1">Agent ID</label>
                                    <Input
                                      value={String(step.config.agent_id || '')}
                                      onChange={(e) =>
                                        updateStep(step.id, {
                                          config: { ...step.config, agent_id: e.target.value },
                                        })
                                      }
                                      placeholder="agent-uuid"
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              )}

                              {step.type === 'wait' && (
                                <div>
                                  <label className="block text-xs font-medium mb-1">Duration (ms)</label>
                                  <Input
                                    type="number"
                                    value={String(step.config.duration_ms || 0)}
                                    onChange={(e) =>
                                      updateStep(step.id, {
                                        config: { ...step.config, duration_ms: parseInt(e.target.value) },
                                      })
                                    }
                                    placeholder="5000"
                                    className="text-sm"
                                  />
                                </div>
                              )}

                              {step.type === 'condition' && (
                                <div>
                                  <label className="block text-xs font-medium mb-1">Expression</label>
                                  <Input
                                    value={String(step.config.expression || '')}
                                    onChange={(e) =>
                                      updateStep(step.id, {
                                        config: { ...step.config, expression: e.target.value },
                                      })
                                    }
                                    placeholder="result.success === true"
                                    className="text-sm"
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1">Timeout (ms)</label>
                                  <Input
                                    type="number"
                                    value={step.timeout_ms}
                                    onChange={(e) =>
                                      updateStep(step.id, { timeout_ms: parseInt(e.target.value) })
                                    }
                                    placeholder="30000"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">Retries</label>
                                  <Input
                                    type="number"
                                    value={step.retries}
                                    onChange={(e) =>
                                      updateStep(step.id, { retries: parseInt(e.target.value) })
                                    }
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </Card>

          {/* Run History Section */}
          <Card className="p-6 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowRunHistory(!showRunHistory)}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Run History</h2>
                <Badge variant="outline">{workflowRuns.length}</Badge>
              </div>
              <Button type="button" variant="ghost" size="sm">
                {showRunHistory ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {showRunHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Separator className="mb-4" />

                  {workflowRuns.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No runs yet. Try a test run to see results here.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workflowRuns.map((run) => (
                        <Card key={run.id} className="p-3 bg-muted/20">
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleRunExpanded(run.id)}
                          >
                            <div className="flex items-center gap-3">
                              {getStatusBadge(run.status)}
                              <span className="text-sm text-muted-foreground">
                                Trigger: {run.trigger_type || 'unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-xs text-muted-foreground text-right">
                                <div>Started: {formatDate(run.started_at)}</div>
                                {run.completed_at && (
                                  <div>Completed: {formatDate(run.completed_at)}</div>
                                )}
                              </div>
                              {expandedRuns.has(run.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedRuns.has(run.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-border"
                              >
                                {run.error && (
                                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-600">
                                    <strong>Error:</strong> {run.error}
                                  </div>
                                )}

                                <div className="text-xs">
                                  <div className="font-medium mb-2">Step Results:</div>
                                  <pre className="bg-background p-3 rounded border border-border overflow-x-auto">
                                    {JSON.stringify(run.step_results || [], null, 2)}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <Button type="button" variant="outline" asChild>
              <Link to="/admin/workflows">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Workflow
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default WorkflowEditor;
