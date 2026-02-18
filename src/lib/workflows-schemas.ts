import { z } from "zod";

// Workflow Step Schemas
export const WorkflowStepTypeSchema = z.enum([
  "agent_command",
  "wait",
  "condition",
]);
export type WorkflowStepType = z.infer<typeof WorkflowStepTypeSchema>;

export const WorkflowStepOnFailureSchema = z.enum(["continue", "stop", "skip"]);
export type WorkflowStepOnFailure = z.infer<typeof WorkflowStepOnFailureSchema>;

export const WorkflowStepConfigSchema = z.record(z.unknown());

export const WorkflowStepSchema = z.object({
  id: z.string().uuid(),
  type: WorkflowStepTypeSchema,
  config: WorkflowStepConfigSchema,
  timeout_ms: z.number().int().min(0).default(30000),
  retries: z.number().int().min(0).max(10).default(0),
  on_failure: WorkflowStepOnFailureSchema.default("stop"),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

// Agent Command Step Config
export const AgentCommandStepConfigSchema = z.object({
  agent_id: z.string().uuid().optional(),
  agent_name: z.string().optional(),
  command: z.string(),
  params: z.record(z.unknown()).optional(),
});
export type AgentCommandStepConfig = z.infer<
  typeof AgentCommandStepConfigSchema
>;

// Wait Step Config
export const WaitStepConfigSchema = z.object({
  duration_ms: z.number().int().min(0),
});
export type WaitStepConfig = z.infer<typeof WaitStepConfigSchema>;

// Condition Step Config
export const ConditionStepConfigSchema = z.object({
  expression: z.string(),
  then_steps: z.array(z.string().uuid()).optional(),
  else_steps: z.array(z.string().uuid()).optional(),
});
export type ConditionStepConfig = z.infer<typeof ConditionStepConfigSchema>;

// Workflow Trigger Schemas
export const WorkflowTriggerTypeSchema = z.enum([
  "manual",
  "scheduled",
  "webhook",
  "event",
]);
export type WorkflowTriggerType = z.infer<typeof WorkflowTriggerTypeSchema>;

// Scheduled Trigger Config
export const ScheduledTriggerConfigSchema = z.object({
  cron: z.string(),
  timezone: z.string().optional().default("UTC"),
});
export type ScheduledTriggerConfig = z.infer<
  typeof ScheduledTriggerConfigSchema
>;

// Webhook Trigger Config
export const WebhookTriggerConfigSchema = z.object({
  webhook_id: z.string().uuid().optional(),
  secret: z.string().optional(),
  url: z.string().url().optional(),
});
export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerConfigSchema>;

// Event Trigger Config
export const EventTriggerConfigSchema = z.object({
  event_type: z.string(),
  filters: z.record(z.unknown()).optional(),
});
export type EventTriggerConfig = z.infer<typeof EventTriggerConfigSchema>;

// Union of all trigger configs
export const WorkflowTriggerConfigSchema = z.union([
  ScheduledTriggerConfigSchema,
  WebhookTriggerConfigSchema,
  EventTriggerConfigSchema,
  z.record(z.unknown()),
]);
export type WorkflowTriggerConfig = z.infer<typeof WorkflowTriggerConfigSchema>;

// Main Workflow Schema
export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  trigger_type: WorkflowTriggerTypeSchema,
  trigger_config: z.record(z.unknown()).nullable(),
  steps: z.array(z.record(z.unknown())).default([]),
  is_active: z.boolean().default(true),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

// Workflow Run Schemas
export const WorkflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type WorkflowRunStatus = z.infer<typeof WorkflowRunStatusSchema>;

export const WorkflowRunStepResultSchema = z.object({
  step_id: z.string().uuid(),
  step_type: WorkflowStepTypeSchema,
  status: z.enum(["success", "failed", "skipped"]),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  result: z.record(z.unknown()).nullable(),
  error: z.string().nullable(),
});
export type WorkflowRunStepResult = z.infer<typeof WorkflowRunStepResultSchema>;

export const WorkflowRunSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  status: WorkflowRunStatusSchema,
  trigger_type: z.string().nullable(),
  trigger_data: z.record(z.unknown()).nullable(),
  step_results: z.array(z.record(z.unknown())).default([]),
  error: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
});
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>;

// Create/Update Workflow Schemas (for form validation)
export const CreateWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  description: z.string().optional().nullable(),
  trigger_type: WorkflowTriggerTypeSchema,
  trigger_config: z.record(z.unknown()).optional().nullable(),
  steps: z.array(z.record(z.unknown())).default([]),
  is_active: z.boolean().default(false),
  created_by: z.string().optional().nullable(),
});
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;

// Workflow Query Options
export const WorkflowQueryOptionsSchema = z.object({
  trigger_type: WorkflowTriggerTypeSchema.optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export type WorkflowQueryOptions = z.infer<typeof WorkflowQueryOptionsSchema>;

// Workflow Run Query Options
export const WorkflowRunQueryOptionsSchema = z.object({
  workflow_id: z.string().uuid().optional(),
  status: WorkflowRunStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export type WorkflowRunQueryOptions = z.infer<
  typeof WorkflowRunQueryOptionsSchema
>;

// Agent List Item (for step builder dropdowns)
export const AgentListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(["autonomous", "supervised", "tool"]),
  status: z.enum(["active", "inactive", "suspended"]),
  capabilities: z.array(z.string()),
});
export type AgentListItem = z.infer<typeof AgentListItemSchema>;

// Helper function to parse and validate workflow steps
export function parseWorkflowSteps(steps: unknown[]): WorkflowStep[] {
  return steps.map((step, index) => {
    try {
      return WorkflowStepSchema.parse(step);
    } catch (error) {
      throw new Error(`Invalid step at index ${index}: ${error}`, {
        cause: error,
      });
    }
  });
}

// Helper function to validate trigger config based on trigger type
export function validateTriggerConfig(
  triggerType: WorkflowTriggerType,
  config: unknown,
): WorkflowTriggerConfig {
  switch (triggerType) {
    case "scheduled":
      return ScheduledTriggerConfigSchema.parse(config);
    case "webhook":
      return WebhookTriggerConfigSchema.parse(config);
    case "event":
      return EventTriggerConfigSchema.parse(config);
    case "manual":
      return {}; // Manual triggers don't need config
    default:
      throw new Error(`Unknown trigger type: ${triggerType}`);
  }
}

// Helper to create a default workflow step
export function createDefaultStep(
  type: WorkflowStepType = "agent_command",
): WorkflowStep {
  const id = crypto.randomUUID();

  const defaultConfigs: Record<WorkflowStepType, WorkflowStepConfigSchema> = {
    agent_command: { command: "", params: {} },
    wait: { duration_ms: 5000 },
    condition: { expression: "" },
  };

  return {
    id,
    type,
    config: defaultConfigs[type],
    timeout_ms: 30000,
    retries: 0,
    on_failure: "stop",
  };
}

// Helper to create a default workflow
export function createDefaultWorkflow(
  name: string,
  triggerType: WorkflowTriggerType = "manual",
): CreateWorkflowInput {
  return {
    name,
    description: null,
    trigger_type: triggerType,
    trigger_config: null,
    steps: [],
    is_active: false,
    created_by: null,
  };
}
