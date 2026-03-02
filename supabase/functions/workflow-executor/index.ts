// Supabase Edge Function for workflow execution
// Deploy with: supabase functions deploy workflow-executor
// Invoke: POST /functions/v1/workflow-executor
//
// Step types:
//   agent_command — dispatch to single agent-executor, wait for completion
//   wait — setTimeout delay
//   condition — evaluate expression against previous step results, branch to step ID
//   integration_action — dispatch integration action, poll for completion
//   orchestrator — fan-out to multiple agents, collect + merge results (#270)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { authenticateAgent, AgentAuthResult } from "../_shared/agent-auth.ts";
import { Logger } from "../_shared/logger.ts";
import { validateInput, validateFields } from "../_shared/input-validator.ts";
import { CORS_ORIGIN } from "../_shared/cors.ts";
import { pollCommandCompletion } from "../_shared/command-polling.ts";
import { orchestrate, MergeStrategy } from "../_shared/orchestration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-key, x-scheduler-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WorkflowStep {
  id: string;
  type:
    | "agent_command"
    | "wait"
    | "condition"
    | "integration_action"
    | "orchestrator";
  config: Record<string, unknown>;
  timeout_ms?: number;
  retries?: number;
  on_failure?: "continue" | "stop" | "skip";
}

interface StepResult {
  step_id: string;
  status: "completed" | "failed" | "skipped";
  output?: unknown;
  error?: string;
  duration_ms: number;
}

/**
 * Execute a single workflow step with timeout and retry support
 */
async function executeStep(
  step: WorkflowStep,
  previousResults: StepResult[],
  supabase: ReturnType<typeof createClient>,
  agentId: string | null,
  logger: Logger,
): Promise<StepResult> {
  const start = performance.now();
  const timeoutMs = step.timeout_ms || 30000;
  const maxRetries = step.retries || 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        executeStepInner(step, previousResults, supabase, agentId, logger),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Step timed out")), timeoutMs),
        ),
      ]);

      return {
        step_id: step.id,
        status: "completed",
        output: result,
        duration_ms: Math.round(performance.now() - start),
      };
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      if (!isLastAttempt) {
        // Exponential backoff: 1s, 2s, 4s, ...
        const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn("Step failed, retrying", {
          stepId: step.id,
          attempt: attempt + 1,
          maxRetries,
          backoffMs: backoff,
        });
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      logger.error("Step failed", error as Error, {
        stepId: step.id,
        attempts: attempt + 1,
      });

      return {
        step_id: step.id,
        status: "failed",
        error: (error as Error).message,
        duration_ms: Math.round(performance.now() - start),
      };
    }
  }

  // Unreachable, but TypeScript needs it
  return {
    step_id: step.id,
    status: "failed",
    error: "Unexpected execution path",
    duration_ms: Math.round(performance.now() - start),
  };
}

/**
 * Execute the inner logic of a step (no timeout/retry wrapping)
 */
async function executeStepInner(
  step: WorkflowStep,
  previousResults: StepResult[],
  supabase: ReturnType<typeof createClient>,
  agentId: string | null,
  logger: Logger,
): Promise<unknown> {
  switch (step.type) {
    case "agent_command": {
      // Dispatch to agent-executor and wait for completion (#266, #268)
      const { command, payload, target_agent_id } = step.config as {
        command: string;
        payload?: unknown;
        target_agent_id?: string;
      };
      if (!command)
        throw new Error('agent_command step requires "command" in config');

      const content =
        typeof payload === "string" ? payload : JSON.stringify(payload || {});
      const commandText = `${command}: ${content}`;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const schedulerSecret = Deno.env.get("SCHEDULER_SECRET")!;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/agent-executor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-scheduler-secret": schedulerSecret,
          },
          body: JSON.stringify({
            agent_id: target_agent_id || agentId || "system",
            command: commandText,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Agent executor failed: ${data.error || "Unknown error"}`,
        );
      }

      logger.info("Agent command executed", {
        command,
        toolCalls: data.tool_calls,
        turns: data.turns,
      });

      return {
        command,
        response: data.response,
        tool_calls: data.tool_calls,
        turns: data.turns,
      };
    }

    case "wait": {
      const delayMs = (step.config.delay_ms as number) || 1000;
      const cappedDelay = Math.min(delayMs, 25000); // Cap at 25s to stay within edge function limits
      await new Promise((resolve) => setTimeout(resolve, cappedDelay));
      return { waited_ms: cappedDelay };
    }

    case "condition": {
      const { expression, then_step, else_step } = step.config as {
        expression: string;
        then_step?: string;
        else_step?: string;
      };
      if (!expression)
        throw new Error('condition step requires "expression" in config');

      // Evaluate condition against previous results
      // Simple evaluation: check if a previous step succeeded/failed
      const result = evaluateCondition(expression, previousResults);
      logger.info("Condition evaluated", {
        expression,
        result,
        thenStep: then_step,
        elseStep: else_step,
      });

      return {
        condition_met: result,
        next_step: result ? then_step : else_step,
      };
    }

    case "integration_action": {
      const { integration_id, action_name, parameters } = step.config as {
        integration_id?: string;
        action_name?: string;
        parameters?: Record<string, unknown>;
      };
      if (!action_name)
        throw new Error(
          'integration_action step requires "action_name" in config',
        );

      // Resolve integration action definition
      let actionDef = null;
      if (integration_id) {
        const { data } = await supabase
          .from("integration_actions")
          .select("*")
          .eq("integration_id", integration_id)
          .eq("action_name", action_name)
          .eq("is_active", true)
          .single();
        actionDef = data;
      }

      // Merge default config with provided parameters
      const mergedParams = {
        ...(actionDef?.default_config || {}),
        ...(parameters || {}),
      };

      // Dispatch as an agent command with integration context in metadata
      const content = JSON.stringify(mergedParams);

      const integrationMeta = {
        workflow_integration_action: action_name,
        integration_id: integration_id || null,
        integration_action_id: actionDef?.id || null,
      };

      const { data, error } = await supabase
        .from("agent_commands")
        .insert({
          command_type: "task",
          content,
          status: "pending",
          user_id: agentId || "system",
          user_email: "workflow@system",
          session_id: crypto.randomUUID(),
          metadata: integrationMeta,
        })
        .select("id")
        .single();

      if (error)
        throw new Error(
          `Failed to dispatch integration action: ${error.message}`,
        );

      logger.info("Dispatched integration action, polling for completion", {
        commandId: data.id,
        actionName: action_name,
        integrationId: integration_id,
      });

      // Poll for completion instead of fire-and-forget (#266)
      const timeoutMs = step.timeout_ms || 15000;
      const pollResult = await pollCommandCompletion(
        data.id,
        timeoutMs,
        supabase,
        logger,
      );

      if (pollResult.status === "timeout") {
        throw new Error(`Integration action timed out: ${action_name}`);
      }
      if (pollResult.status === "failed" || pollResult.status === "cancelled") {
        throw new Error(
          pollResult.error || `Integration action failed: ${action_name}`,
        );
      }

      return {
        command_id: data.id,
        action_name,
        integration_id,
        status: pollResult.status,
        output: pollResult.output,
        parameters: mergedParams,
      };
    }

    case "orchestrator": {
      // Fan-out command to multiple agents, collect + merge results (#270)
      const {
        agent_ids,
        command: orchCommand,
        strategy = "merge_all",
        payload,
      } = step.config as {
        agent_ids: string[];
        command: string;
        strategy?: MergeStrategy;
        payload?: unknown;
      };

      if (!agent_ids || agent_ids.length === 0)
        throw new Error('orchestrator step requires "agent_ids" in config');
      if (!orchCommand)
        throw new Error('orchestrator step requires "command" in config');

      const content =
        typeof payload === "string" ? payload : JSON.stringify(payload || {});
      const fullCommand = `${orchCommand}: ${content}`;

      const timeoutMs = step.timeout_ms || 20000;

      const orchResult = await orchestrate(
        {
          command: fullCommand,
          agent_ids,
          strategy,
          timeout_ms: timeoutMs,
        },
        supabase,
        logger,
      );

      logger.info("Orchestrator step completed", {
        orchestrationRunId: orchResult.orchestration_run_id,
        strategy,
        agentCount: agent_ids.length,
        completedCount: orchResult.agent_results.filter(
          (r) => r.status === "completed",
        ).length,
      });

      if (orchResult.status === "timed_out") {
        throw new Error("All agents timed out during orchestration");
      }
      if (orchResult.status === "failed") {
        throw new Error("All agents failed during orchestration");
      }

      return {
        orchestration_run_id: orchResult.orchestration_run_id,
        merged_response: orchResult.merged_response,
        strategy: orchResult.strategy,
        agent_results: orchResult.agent_results.map((r) => ({
          agent_id: r.agent_id,
          status: r.status,
          duration_ms: r.duration_ms,
        })),
        duration_ms: orchResult.duration_ms,
      };
    }

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

/**
 * Simple condition evaluator against previous step results.
 * Supports expressions like:
 *   "step_id.status == completed"
 *   "step_id.status != failed"
 */
function evaluateCondition(expression: string, results: StepResult[]): boolean {
  const resultMap = new Map(results.map((r) => [r.step_id, r]));

  // Parse "step_id.field op value"
  const match = expression.match(/^(\w+)\.(status|output)\s*(==|!=)\s*(\w+)$/);
  if (!match) {
    // Default: treat as truthy if expression matches a completed step ID
    return (
      resultMap.has(expression) &&
      resultMap.get(expression)!.status === "completed"
    );
  }

  const [, stepId, field, op, value] = match;
  const stepResult = resultMap.get(stepId);
  if (!stepResult) return false;

  const actual =
    field === "status" ? stepResult.status : String(stepResult.output);
  return op === "==" ? actual === value : actual !== value;
}

/**
 * Authenticate the request - supports agent auth or scheduler secret
 */
async function authenticateRequest(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  logger: Logger,
  triggerType: string,
): Promise<{
  authorized: boolean;
  agentId: string | null;
  error?: string;
  status?: number;
}> {
  // Scheduled triggers use a shared secret
  if (triggerType === "scheduled") {
    const schedulerSecret = req.headers.get("x-scheduler-secret");
    const expectedSecret = Deno.env.get("SCHEDULER_SECRET");

    if (!expectedSecret) {
      logger.error("SCHEDULER_SECRET not configured");
      return {
        authorized: false,
        agentId: null,
        error: "Scheduler not configured",
        status: 500,
      };
    }

    if (schedulerSecret !== expectedSecret) {
      logger.warn("Scheduler auth failed: invalid secret");
      return {
        authorized: false,
        agentId: null,
        error: "Invalid scheduler secret",
        status: 401,
      };
    }

    return { authorized: true, agentId: null };
  }

  // Manual/webhook triggers use agent auth
  const auth = await authenticateAgent(req, supabase, logger);
  if (!auth.authenticated) {
    return {
      authorized: false,
      agentId: null,
      error: auth.error,
      status: auth.status,
    };
  }

  return { authorized: true, agentId: auth.agent!.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const logger = Logger.fromRequest(req);
  logger.logRequest();
  const start = performance.now();

  try {
    // Validate input
    const validation = await validateInput(req);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          message: validation.error,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = validation.data as Record<string, unknown>;
    const fieldError = validateFields(body, {
      workflow_id: { required: true, type: "string" },
      trigger_type: {
        required: true,
        type: "string",
        enum: ["manual", "scheduled", "webhook", "event"],
      },
    });
    if (fieldError) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: fieldError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { workflow_id, trigger_type, trigger_data } = body as {
      workflow_id: string;
      trigger_type: string;
      trigger_data?: Record<string, unknown>;
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate
    const authResult = await authenticateRequest(
      req,
      supabase,
      logger,
      trigger_type,
    );
    if (!authResult.authorized) {
      const duration = Math.round(performance.now() - start);
      logger.logResponse(authResult.status || 401, duration);
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status || 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch workflow
    const { data: workflow, error: wfError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflow_id)
      .eq("is_active", true)
      .single();

    if (wfError || !workflow) {
      return new Response(
        JSON.stringify({ error: "Workflow not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create workflow run
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id,
        status: "running",
        trigger_type,
        trigger_data: trigger_data || {},
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runError) {
      logger.error(
        "Failed to create workflow run",
        runError as unknown as Error,
      );
      return new Response(
        JSON.stringify({ error: "Failed to create workflow run" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logger.info("Workflow execution started", {
      runId: run.id,
      workflowId: workflow_id,
    });

    // Execute steps sequentially
    const steps = workflow.steps as WorkflowStep[];
    const stepResults: StepResult[] = [];
    let failed = false;

    for (const step of steps) {
      // Check if a condition step redirected us
      if (stepResults.length > 0) {
        const lastResult = stepResults[stepResults.length - 1];
        if (lastResult.status === "completed" && lastResult.output) {
          const output = lastResult.output as { next_step?: string };
          if (output.next_step && output.next_step !== step.id) {
            // Skip steps until we reach the target step
            stepResults.push({
              step_id: step.id,
              status: "skipped",
              duration_ms: 0,
            });
            continue;
          }
        }
      }

      const result = await executeStep(
        step,
        stepResults,
        supabase,
        authResult.agentId,
        logger,
      );
      stepResults.push(result);

      // Update step_results in DB after each step
      await supabase
        .from("workflow_runs")
        .update({ step_results: stepResults })
        .eq("id", run.id);

      if (result.status === "failed") {
        const onFailure = step.on_failure || "stop";

        if (onFailure === "stop") {
          failed = true;
          break;
        }
        // 'continue' and 'skip' both proceed to next step
      }
    }

    // Update final run status
    const finalStatus = failed ? "failed" : "completed";
    const failedStep = failed
      ? stepResults.find((r) => r.status === "failed")
      : null;

    await supabase
      .from("workflow_runs")
      .update({
        status: finalStatus,
        step_results: stepResults,
        error: failedStep?.error || null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    // Audit log
    await supabase.rpc("log_audit_event", {
      p_actor_type: authResult.agentId ? "agent" : "scheduler",
      p_actor_id: authResult.agentId,
      p_action: `workflow.${finalStatus}`,
      p_resource_type: "workflow_run",
      p_resource_id: run.id,
      p_details: {
        workflow_id,
        trigger_type,
        steps_executed: stepResults.length,
        steps_failed: stepResults.filter((r) => r.status === "failed").length,
      },
    });

    const duration = Math.round(performance.now() - start);
    logger.logResponse(200, duration);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        status: finalStatus,
        steps_executed: stepResults.length,
        step_results: stepResults,
        duration_ms: duration,
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...logger.getResponseHeaders(),
        },
      },
    );
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error("Workflow executor error", error as Error);
    logger.logResponse(500, duration);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        correlationId: logger.getCorrelationId(),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...logger.getResponseHeaders(),
        },
      },
    );
  }
});
