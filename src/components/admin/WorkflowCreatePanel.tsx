import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import WorkflowStepBuilder, { type WorkflowStep } from './WorkflowStepBuilder';
import { WORKFLOW_TEMPLATES, TEMPLATE_CATEGORIES, type WorkflowTemplate } from '@/lib/workflow-templates';

interface WorkflowCreatePanelProps {
  onClose: () => void;
  onCreate: (workflow: {
    name: string;
    description: string;
    trigger_type: 'manual' | 'scheduled' | 'webhook' | 'event';
    trigger_config: Record<string, unknown>;
    steps: WorkflowStep[];
  }) => Promise<void>;
  isCreating: boolean;
}

export default function WorkflowCreatePanel({
  onClose,
  onCreate,
  isCreating,
}: WorkflowCreatePanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<'manual' | 'scheduled' | 'webhook' | 'event'>('manual');
  const [previewExpandedSteps, setPreviewExpandedSteps] = useState<Set<string>>(new Set());

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setTriggerType(template.trigger_type);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setName('');
    setDescription('');
    setTriggerType('manual');
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    onCreate({
      name,
      description,
      trigger_type: selectedTemplate?.trigger_type || triggerType,
      trigger_config: selectedTemplate?.trigger_config || {},
      steps: selectedTemplate
        ? selectedTemplate.steps.map((s) => ({ ...s, id: crypto.randomUUID() }))
        : [],
    });
  };

  const togglePreviewExpand = (stepId: string) => {
    setPreviewExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className="flex-none w-full md:w-[45%] bg-card border-l border-border overflow-y-auto max-h-[calc(100vh-8rem)]"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 bg-card border-b border-border px-5 py-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedTemplate && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label="Back to templates"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className="font-semibold text-foreground text-lg">
            {selectedTemplate ? 'Configure Workflow' : 'New Workflow'}
          </h3>
        </div>
        <button
          onClick={onClose}
          disabled={isCreating}
          className="p-1 hover:bg-muted rounded transition-colors"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {selectedTemplate ? (
          /* Template selected — show config form */
          <>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary text-xs">
                {selectedTemplate.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {selectedTemplate.trigger_type}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workflow name"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Pre-configured Steps ({selectedTemplate.steps.length})
                </label>
                <WorkflowStepBuilder
                  steps={selectedTemplate.steps}
                  onStepsChange={() => {}}
                  expandedSteps={previewExpandedSteps}
                  onToggleExpand={togglePreviewExpand}
                  readOnly
                />
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating || !name.trim()}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create from "${selectedTemplate.name}"`
              )}
            </Button>
          </>
        ) : (
          /* No template selected — show tabs */
          <Tabs defaultValue="templates">
            <TabsList className="w-full">
              <TabsTrigger value="templates" className="flex-1">
                Templates
              </TabsTrigger>
              <TabsTrigger value="scratch" className="flex-1">
                From Scratch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4 mt-4">
              {TEMPLATE_CATEGORIES.map((cat) => {
                const templates = WORKFLOW_TEMPLATES.filter((t) => t.category === cat.id);
                return (
                  <div key={cat.id}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {cat.label}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {templates.map((template) => {
                        const Icon = template.icon;
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-md bg-primary/10 text-primary">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                  {template.name}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {template.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {template.trigger_type}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {template.steps.length} steps
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="scratch" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Workflow"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  placeholder="What does this workflow do?"
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Trigger Type
                </label>
                <select
                  value={triggerType}
                  onChange={(e) =>
                    setTriggerType(e.target.value as typeof triggerType)
                  }
                  disabled={isCreating}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="webhook">Webhook</option>
                  <option value="event">Event</option>
                </select>
              </div>

              <Button
                onClick={handleCreate}
                disabled={isCreating || !name.trim()}
                className="w-full"
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
            </TabsContent>
          </Tabs>
        )}
      </div>
    </motion.div>
  );
}
