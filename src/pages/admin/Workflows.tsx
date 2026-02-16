import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Search, Play, Pause, Loader2, X } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getWorkflows, createWorkflow, updateWorkflow } from '@/lib/agent-platform-queries';
import type { Workflow } from '@/lib/schemas';

const getTriggerBadgeStyles = (triggerType: string) => {
  switch (triggerType) {
    case 'manual':
      return 'bg-gray-500/10 text-gray-500';
    case 'scheduled':
      return 'bg-blue-500/10 text-blue-500';
    case 'webhook':
      return 'bg-green-500/10 text-green-500';
    case 'event':
      return 'bg-purple-500/10 text-purple-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
};

const Workflows = () => {
  useSEO({ title: 'Workflows', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create modal form state
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger_type: 'manual' as const,
  });

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
          { context: 'Workflows.fetchWorkflows' }
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
      await updateWorkflow(workflow.id, { is_active: !workflow.is_active }, supabase);
      setWorkflows(prev =>
        prev.map(w => w.id === workflow.id ? { ...w, is_active: !w.is_active } : w)
      );
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: 'Workflows.toggleActive', workflowId: workflow.id }
      );
    }
  };

  const handleCreateWorkflow = async () => {
    if (!supabase) return;
    if (!newWorkflow.name.trim()) return;

    setIsCreating(true);
    try {
      const created = await createWorkflow(
        {
          name: newWorkflow.name,
          description: newWorkflow.description || null,
          trigger_type: newWorkflow.trigger_type,
          trigger_config: null,
          steps: [],
          is_active: false,
          created_by: null,
        },
        supabase
      );

      setWorkflows(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewWorkflow({ name: '', description: '', trigger_type: 'manual' });

      // Navigate to the new workflow's editor
      navigate(`/admin/workflows/${created.id}`);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        { context: 'Workflows.createWorkflow' }
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Filter workflows by search query
  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <Button onClick={() => setShowCreateModal(true)}>
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No workflows yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workflow to automate tasks
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No workflows found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search query
            </p>
          </motion.div>
        )}

        {/* Workflows Grid */}
        {!isLoading && filteredWorkflows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer group relative">
                  <Link to={`/admin/workflows/${workflow.id}`} className="absolute inset-0" />

                  <div className="space-y-4">
                    {/* Header */}
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

                      {/* Active Toggle */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleActive(workflow);
                        }}
                        className="relative z-10 p-1.5 rounded hover:bg-muted transition-colors"
                        aria-label={workflow.is_active ? 'Pause workflow' : 'Activate workflow'}
                      >
                        {workflow.is_active ? (
                          <Pause className="w-4 h-4 text-green-500" />
                        ) : (
                          <Play className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getTriggerBadgeStyles(workflow.trigger_type)}>
                        {workflow.trigger_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {workflow.steps?.length || 0} steps
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isCreating && setShowCreateModal(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-lg shadow-lg z-50 p-6"
              >
                <div className="space-y-4">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Create Workflow</h2>
                    <button
                      onClick={() => !isCreating && setShowCreateModal(false)}
                      disabled={isCreating}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="workflow-name" className="block text-sm font-medium text-foreground mb-1">
                        Name
                      </label>
                      <Input
                        id="workflow-name"
                        type="text"
                        placeholder="My Workflow"
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        disabled={isCreating}
                      />
                    </div>

                    <div>
                      <label htmlFor="workflow-description" className="block text-sm font-medium text-foreground mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        id="workflow-description"
                        placeholder="What does this workflow do?"
                        value={newWorkflow.description}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                        disabled={isCreating}
                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label htmlFor="workflow-trigger" className="block text-sm font-medium text-foreground mb-1">
                        Trigger Type
                      </label>
                      <select
                        id="workflow-trigger"
                        value={newWorkflow.trigger_type}
                        onChange={(e) => setNewWorkflow(prev => ({
                          ...prev,
                          trigger_type: e.target.value as 'manual' | 'scheduled' | 'webhook' | 'event'
                        }))}
                        disabled={isCreating}
                        className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                      >
                        <option value="manual">Manual</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="webhook">Webhook</option>
                        <option value="event">Event</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleCreateWorkflow}
                      disabled={isCreating || !newWorkflow.name.trim()}
                      className="flex-1"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Workflow'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Workflows;
