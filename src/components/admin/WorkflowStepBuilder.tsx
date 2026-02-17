import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import IntegrationActionForm from './IntegrationActionForm';

export interface WorkflowStep {
  id: string;
  type: 'agent_command' | 'wait' | 'condition' | 'integration_action';
  config: Record<string, unknown>;
  timeout_ms: number;
  retries: number;
  on_failure: 'continue' | 'stop' | 'skip';
}

interface WorkflowStepBuilderProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  expandedSteps: Set<string>;
  onToggleExpand: (stepId: string) => void;
  readOnly?: boolean;
}

const STEP_TYPE_LABELS: Record<WorkflowStep['type'], string> = {
  agent_command: 'Agent Command',
  wait: 'Wait',
  condition: 'Condition',
  integration_action: 'Integration Action',
};

export default function WorkflowStepBuilder({
  steps,
  onStepsChange,
  expandedSteps,
  onToggleExpand,
  readOnly = false,
}: WorkflowStepBuilderProps) {
  const addStep = () => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      type: 'agent_command',
      config: {},
      timeout_ms: 30000,
      retries: 0,
      on_failure: 'stop',
    };
    onStepsChange([...steps, newStep]);
    onToggleExpand(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    onStepsChange(
      steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  };

  const deleteStep = (stepId: string) => {
    onStepsChange(steps.filter((step) => step.id !== stepId));
  };

  return (
    <div className="space-y-3">
      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {readOnly ? 'No steps defined.' : 'No steps yet. Click "Add Step" to get started.'}
        </div>
      ) : (
        <AnimatePresence>
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!readOnly && (
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    )}
                    <span className="font-semibold text-sm">Step {index + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {STEP_TYPE_LABELS[step.type]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleExpand(step.id)}
                    >
                      {expandedSteps.has(step.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteStep(step.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
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
                      {!readOnly && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Type</label>
                            <select
                              value={step.type}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  type: e.target.value as WorkflowStep['type'],
                                  config: {},
                                })
                              }
                              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                            >
                              <option value="agent_command">Agent Command</option>
                              <option value="wait">Wait</option>
                              <option value="condition">Condition</option>
                              <option value="integration_action">Integration Action</option>
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
                      )}

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
                              readOnly={readOnly}
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
                              readOnly={readOnly}
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
                            value={String(step.config.delay_ms || step.config.duration_ms || 0)}
                            onChange={(e) =>
                              updateStep(step.id, {
                                config: { ...step.config, delay_ms: parseInt(e.target.value) },
                              })
                            }
                            readOnly={readOnly}
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
                            readOnly={readOnly}
                            placeholder="result.success === true"
                            className="text-sm"
                          />
                        </div>
                      )}

                      {step.type === 'integration_action' && (
                        <IntegrationActionForm
                          config={step.config}
                          onChange={(newConfig) =>
                            updateStep(step.id, { config: newConfig })
                          }
                          disabled={readOnly}
                        />
                      )}

                      {!readOnly && (
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
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addStep} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Step
        </Button>
      )}
    </div>
  );
}
