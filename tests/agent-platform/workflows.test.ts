/**
 * Agent Platform Workflow Tests
 *
 * Tests workflow execution patterns from workflow-executor/index.ts:
 * - Step creation and sequential execution
 * - Failure handling (continue vs stop)
 * - Step timeout handling
 * - Retry with exponential backoff
 * - Agent command dispatch to agent-executor (#266)
 * - Integration action polling to completion (#266)
 * - Polling timeout behavior
 * - Command failure propagation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  WORKFLOW_SIMPLE,
  WORKFLOW_WITH_FAILURE,
  WORKFLOW_WITH_STOP,
  WORKFLOW_WITH_TIMEOUT,
} from "./fixtures";

// ─── Inline step execution logic from workflow-executor ─────────────

interface WorkflowStep {
  id: string;
  type: "agent_command" | "wait" | "condition" | "integration_action";
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

interface PollResult {
  status: "completed" | "failed" | "cancelled" | "timeout";
  output?: unknown;
  error?: string;
}

function evaluateCondition(expression: string, results: StepResult[]): boolean {
  const resultMap = new Map(results.map((r) => [r.step_id, r]));
  const match = expression.match(/^(\w+)\.(status|output)\s*(==|!=)\s*(\w+)$/);
  if (!match) {
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

async function executeStep(
  step: WorkflowStep,
  previousResults: StepResult[],
  dispatchFn: (cmd: string, payload: unknown) => Promise<{ id: string } | null>,
  agentExecutorFn?: (
    command: string,
    agentId: string,
  ) => Promise<Record<string, unknown>>,
  pollFn?: (commandId: string, timeoutMs: number) => Promise<PollResult>,
): Promise<StepResult> {
  const start = Date.now();
  const timeoutMs = step.timeout_ms || 30000;
  const maxRetries = step.retries || 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race<unknown>([
        executeStepInner(
          step,
          previousResults,
          dispatchFn,
          agentExecutorFn,
          pollFn,
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Step timed out")), timeoutMs),
        ),
      ]);
      return {
        step_id: step.id,
        status: "completed",
        output: result,
        duration_ms: Date.now() - start,
      };
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          step_id: step.id,
          status: "failed",
          error: (error as Error).message,
          duration_ms: Date.now() - start,
        };
      }
      // Exponential backoff (very short for tests)
      await new Promise((r) => setTimeout(r, 10 * Math.pow(2, attempt)));
    }
  }

  return {
    step_id: step.id,
    status: "failed",
    error: "Unreachable",
    duration_ms: Date.now() - start,
  };
}

async function executeStepInner(
  step: WorkflowStep,
  previousResults: StepResult[],
  dispatchFn: (cmd: string, payload: unknown) => Promise<{ id: string } | null>,
  agentExecutorFn?: (
    command: string,
    agentId: string,
  ) => Promise<Record<string, unknown>>,
  pollFn?: (commandId: string, timeoutMs: number) => Promise<PollResult>,
): Promise<unknown> {
  switch (step.type) {
    case "agent_command": {
      // Dispatch to agent-executor (#266, #268)
      const { command, payload, target_agent_id } = step.config as {
        command: string;
        payload?: unknown;
        target_agent_id?: string;
      };
      if (!command)
        throw new Error('agent_command step requires "command" in config');

      if (agentExecutorFn) {
        const content =
          typeof payload === "string" ? payload : JSON.stringify(payload || {});
        const data = await agentExecutorFn(
          `${command}: ${content}`,
          target_agent_id || "system",
        );
        return {
          command,
          response: data.response,
          tool_calls: data.tool_calls,
        };
      }

      // Fallback: legacy insert-based dispatch
      const result = await dispatchFn(command, payload || {});
      if (!result) throw new Error("Failed to dispatch command");
      return { command_id: result.id, command };
    }
    case "wait": {
      const delayMs = Math.min((step.config.delay_ms as number) || 1000, 25000);
      await new Promise((r) => setTimeout(r, delayMs));
      return { waited_ms: delayMs };
    }
    case "condition": {
      const { expression, then_step, else_step } = step.config as {
        expression: string;
        then_step?: string;
        else_step?: string;
      };
      if (!expression) throw new Error('condition step requires "expression"');
      const result = evaluateCondition(expression, previousResults);
      return {
        condition_met: result,
        next_step: result ? then_step : else_step,
      };
    }
    case "integration_action": {
      const { action_name, parameters } = step.config as {
        action_name?: string;
        parameters?: Record<string, unknown>;
      };
      if (!action_name)
        throw new Error(
          'integration_action step requires "action_name" in config',
        );

      // Insert command
      const result = await dispatchFn(action_name, parameters || {});
      if (!result)
        throw new Error(
          `Failed to dispatch integration action: ${action_name}`,
        );

      // Poll for completion (#266)
      if (pollFn) {
        const timeoutMs = step.timeout_ms || 15000;
        const pollResult = await pollFn(result.id, timeoutMs);

        if (pollResult.status === "timeout") {
          throw new Error(`Integration action timed out: ${action_name}`);
        }
        if (
          pollResult.status === "failed" ||
          pollResult.status === "cancelled"
        ) {
          throw new Error(
            pollResult.error || `Integration action failed: ${action_name}`,
          );
        }

        return {
          command_id: result.id,
          action_name,
          status: pollResult.status,
          output: pollResult.output,
        };
      }

      return { command_id: result.id, action_name };
    }
    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

describe("Workflows", () => {
  let supabase: ReturnType<typeof createMockSupabaseClient>;
  let commandInsertCount: number;

  const mockInsert = async (cmd: string, payload: unknown) => {
    commandInsertCount++;
    return { id: `cmd-${commandInsertCount}` };
  };

  const failingInsert = async (
    _cmd: string,
    _payload: unknown,
  ): Promise<{ id: string } | null> => {
    return null; // Simulates a DB insert failure
  };

  beforeEach(() => {
    supabase = createMockSupabaseClient();
    commandInsertCount = 0;
  });

  it("creates workflow with steps and records to DB", async () => {
    supabase._setQueryResult({ id: WORKFLOW_SIMPLE.id });

    await supabase
      .from("workflows")
      .insert({
        name: WORKFLOW_SIMPLE.name,
        trigger_type: WORKFLOW_SIMPLE.trigger_type,
        steps: WORKFLOW_SIMPLE.steps,
        is_active: true,
      })
      .select("id")
      .single();

    expect(supabase.from).toHaveBeenCalledWith("workflows");
  });

  it("executes workflow steps to completion", async () => {
    const steps = WORKFLOW_SIMPLE.steps as WorkflowStep[];
    const results: StepResult[] = [];

    for (const step of steps) {
      const result = await executeStep(step, results, mockInsert);
      results.push(result);
    }

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("completed");
    expect(results[0].step_id).toBe("step-1");
    expect((results[0].output as { command: string }).command).toBe("greet");

    expect(results[1].status).toBe("completed");
    expect(results[1].step_id).toBe("step-2");
  });

  it("on_failure=continue proceeds past failed step", async () => {
    const steps = WORKFLOW_WITH_FAILURE.steps as WorkflowStep[];
    const results: StepResult[] = [];

    for (const step of steps) {
      const result = await executeStep(step, results, failingInsert);
      results.push(result);

      if (result.status === "failed") {
        const onFailure = step.on_failure || "stop";
        if (onFailure === "stop") break;
        // 'continue' — keep going
      }
    }

    // Both steps should be executed
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toBe("Failed to dispatch command");
    expect(results[1].status).toBe("completed"); // wait step succeeds
  });

  it("on_failure=stop halts on failure", async () => {
    const steps = WORKFLOW_WITH_STOP.steps as WorkflowStep[];
    const results: StepResult[] = [];

    for (const step of steps) {
      const result = await executeStep(step, results, failingInsert);
      results.push(result);

      if (result.status === "failed") {
        const onFailure = step.on_failure || "stop";
        if (onFailure === "stop") break;
      }
    }

    // Only the first step should run; second is never reached
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
  });

  it("step timeout marks step as failed", async () => {
    const step: WorkflowStep = {
      id: "step-slow",
      type: "agent_command",
      config: { command: "slow_task" },
      timeout_ms: 50,
    };

    // Insert function that takes longer than the timeout
    const slowInsert = async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { id: "cmd-slow" };
    };

    const result = await executeStep(step, [], slowInsert);

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Step timed out");
    expect(result.step_id).toBe("step-slow");
  });

  it("retries with exponential backoff", async () => {
    let attemptCount = 0;
    const flakyInsert = async () => {
      attemptCount++;
      if (attemptCount < 3) {
        return null; // Fail first 2 attempts
      }
      return { id: "cmd-retry-success" };
    };

    const step: WorkflowStep = {
      id: "step-retry",
      type: "agent_command",
      config: { command: "flaky_task" },
      timeout_ms: 5000,
      retries: 3,
    };

    const result = await executeStep(step, [], flakyInsert);

    expect(result.status).toBe("completed");
    expect(attemptCount).toBe(3); // Failed twice, succeeded on third
    expect((result.output as { command_id: string }).command_id).toBe(
      "cmd-retry-success",
    );
  });

  // ─── New tests for #266 / #268 ─────────────────────────────────────

  describe("agent_command dispatch (#266)", () => {
    it("dispatches to agent-executor and returns response", async () => {
      const mockExecutor = vi.fn(async (command: string, agentId: string) => ({
        response: "Task completed successfully",
        tool_calls: 2,
        turns: 1,
      }));

      const step: WorkflowStep = {
        id: "step-agent",
        type: "agent_command",
        config: { command: "analyze_data", payload: { query: "sales" } },
        timeout_ms: 5000,
      };

      const result = await executeStep(step, [], mockInsert, mockExecutor);

      expect(result.status).toBe("completed");
      expect(result.step_id).toBe("step-agent");
      const output = result.output as {
        command: string;
        response: string;
        tool_calls: number;
      };
      expect(output.command).toBe("analyze_data");
      expect(output.response).toBe("Task completed successfully");
      expect(output.tool_calls).toBe(2);

      expect(mockExecutor).toHaveBeenCalledWith(
        'analyze_data: {"query":"sales"}',
        "system",
      );
    });

    it("propagates agent-executor failures", async () => {
      const failingExecutor = vi.fn(async () => {
        throw new Error("Agent executor failed: API timeout");
      });

      const step: WorkflowStep = {
        id: "step-fail-agent",
        type: "agent_command",
        config: { command: "failing_task" },
        timeout_ms: 5000,
      };

      const result = await executeStep(step, [], mockInsert, failingExecutor);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Agent executor failed: API timeout");
    });
  });

  describe("integration_action polling (#266)", () => {
    it("polls integration_action to completion", async () => {
      const mockPoll = vi.fn(
        async (commandId: string, timeoutMs: number): Promise<PollResult> => ({
          status: "completed",
          output: { records_updated: 5 },
        }),
      );

      const step: WorkflowStep = {
        id: "step-integration",
        type: "integration_action",
        config: { action_name: "sync_contacts", parameters: { source: "crm" } },
        timeout_ms: 10000,
      };

      const result = await executeStep(
        step,
        [],
        mockInsert,
        undefined,
        mockPoll,
      );

      expect(result.status).toBe("completed");
      const output = result.output as {
        command_id: string;
        action_name: string;
        status: string;
        output: unknown;
      };
      expect(output.action_name).toBe("sync_contacts");
      expect(output.status).toBe("completed");
      expect(output.output).toEqual({ records_updated: 5 });

      expect(mockPoll).toHaveBeenCalledWith("cmd-1", 10000);
    });

    it("fails on polling timeout", async () => {
      const mockPoll = vi.fn(
        async (): Promise<PollResult> => ({
          status: "timeout",
          error: "Polling timed out after 10000ms",
        }),
      );

      const step: WorkflowStep = {
        id: "step-timeout",
        type: "integration_action",
        config: { action_name: "slow_action" },
        timeout_ms: 10000,
      };

      const result = await executeStep(
        step,
        [],
        mockInsert,
        undefined,
        mockPoll,
      );

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Integration action timed out: slow_action");
    });

    it("propagates command failure from polling", async () => {
      const mockPoll = vi.fn(
        async (): Promise<PollResult> => ({
          status: "failed",
          error: "External API returned 503",
        }),
      );

      const step: WorkflowStep = {
        id: "step-fail-poll",
        type: "integration_action",
        config: { action_name: "flaky_api_call" },
        timeout_ms: 10000,
      };

      const result = await executeStep(
        step,
        [],
        mockInsert,
        undefined,
        mockPoll,
      );

      expect(result.status).toBe("failed");
      expect(result.error).toBe("External API returned 503");
    });

    it("propagates cancelled command from polling", async () => {
      const mockPoll = vi.fn(
        async (): Promise<PollResult> => ({
          status: "cancelled",
          error: "Command was cancelled",
        }),
      );

      const step: WorkflowStep = {
        id: "step-cancel-poll",
        type: "integration_action",
        config: { action_name: "cancelled_action" },
        timeout_ms: 10000,
      };

      const result = await executeStep(
        step,
        [],
        mockInsert,
        undefined,
        mockPoll,
      );

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Command was cancelled");
    });
  });
});
