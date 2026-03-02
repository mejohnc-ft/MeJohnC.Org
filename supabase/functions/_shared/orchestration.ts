/**
 * Multi-agent orchestration: fan-out, collect, merge/rank (#270)
 *
 * Broadcasts a command to multiple agents via the agent-executor,
 * collects their responses, and merges results using a configurable strategy.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Logger } from "./logger.ts";

// ─── Types ──────────────────────────────────────────────────────────

export type MergeStrategy =
  | "first_completed"
  | "best_score"
  | "merge_all"
  | "consensus";

export interface OrchestrationConfig {
  command: string;
  agent_ids: string[];
  strategy: MergeStrategy;
  timeout_ms?: number;
  workflow_run_id?: string;
  step_id?: string;
}

export interface AgentResult {
  agent_id: string;
  status: "completed" | "failed" | "timed_out";
  response?: string;
  tool_calls?: number;
  turns?: number;
  score?: number;
  duration_ms?: number;
  error?: string;
}

export interface OrchestrationResult {
  orchestration_run_id: string;
  status: "completed" | "failed" | "timed_out";
  merged_response: string;
  agent_results: AgentResult[];
  strategy: MergeStrategy;
  duration_ms: number;
}

// ─── Fan-out: dispatch to all agents concurrently ───────────────────

async function dispatchToAgent(
  agentId: string,
  command: string,
  logger: Logger,
): Promise<AgentResult> {
  const start = performance.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const schedulerSecret = Deno.env.get("SCHEDULER_SECRET")!;

    const response = await fetch(`${supabaseUrl}/functions/v1/agent-executor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scheduler-secret": schedulerSecret,
      },
      body: JSON.stringify({
        agent_id: agentId,
        command,
      }),
    });

    const data = await response.json();
    const durationMs = Math.round(performance.now() - start);

    if (!response.ok) {
      logger.warn("Agent dispatch failed", {
        agentId,
        status: response.status,
        error: data.error,
      });
      return {
        agent_id: agentId,
        status: "failed",
        error: data.error || "Agent executor returned error",
        duration_ms: durationMs,
      };
    }

    return {
      agent_id: agentId,
      status: "completed",
      response: data.response,
      tool_calls: data.tool_calls,
      turns: data.turns,
      duration_ms: durationMs,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    logger.error("Agent dispatch error", error as Error, { agentId });
    return {
      agent_id: agentId,
      status: "failed",
      error: (error as Error).message,
      duration_ms: durationMs,
    };
  }
}

/**
 * Fan-out: dispatch command to all agents concurrently with a timeout.
 */
export async function broadcastToAgents(
  agentIds: string[],
  command: string,
  timeoutMs: number,
  logger: Logger,
): Promise<AgentResult[]> {
  logger.info("Broadcasting to agents", {
    agentCount: agentIds.length,
    timeoutMs,
  });

  const agentPromises = agentIds.map((agentId) =>
    dispatchToAgent(agentId, command, logger),
  );

  // Race all agents against a timeout
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs),
  );

  const results: AgentResult[] = [];
  const settled = await Promise.allSettled(
    agentPromises.map((p) =>
      Promise.race([p, timeoutPromise.then(() => null as AgentResult | null)]),
    ),
  );

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled" && s.value) {
      results.push(s.value);
    } else {
      results.push({
        agent_id: agentIds[i],
        status: "timed_out",
        error: s.status === "rejected" ? String(s.reason) : "Timed out",
        duration_ms: timeoutMs,
      });
    }
  }

  return results;
}

// ─── Merge strategies ───────────────────────────────────────────────

/**
 * first_completed: return the first successful response
 */
function mergeFirstCompleted(results: AgentResult[]): string {
  const completed = results.filter(
    (r) => r.status === "completed" && r.response,
  );
  if (completed.length === 0) {
    return "No agents completed successfully.";
  }
  return completed[0].response!;
}

/**
 * best_score: return the response with the highest score (or fastest if no scores)
 */
function mergeBestScore(results: AgentResult[]): string {
  const completed = results.filter(
    (r) => r.status === "completed" && r.response,
  );
  if (completed.length === 0) {
    return "No agents completed successfully.";
  }

  // If any agent returned a score, use that; otherwise use fastest (lowest duration)
  const hasScores = completed.some((r) => r.score != null);
  if (hasScores) {
    completed.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else {
    completed.sort(
      (a, b) => (a.duration_ms ?? Infinity) - (b.duration_ms ?? Infinity),
    );
  }

  return completed[0].response!;
}

/**
 * merge_all: combine all successful responses with agent attribution
 */
function mergeMergeAll(
  results: AgentResult[],
  agentNames?: Map<string, string>,
): string {
  const completed = results.filter(
    (r) => r.status === "completed" && r.response,
  );
  if (completed.length === 0) {
    return "No agents completed successfully.";
  }
  if (completed.length === 1) {
    return completed[0].response!;
  }

  return completed
    .map((r) => {
      const name = agentNames?.get(r.agent_id) || r.agent_id.slice(0, 8);
      return `[Agent ${name}]: ${r.response}`;
    })
    .join("\n\n");
}

/**
 * consensus: find common themes across responses (simple keyword overlap)
 */
function mergeConsensus(results: AgentResult[]): string {
  const completed = results.filter(
    (r) => r.status === "completed" && r.response,
  );
  if (completed.length === 0) {
    return "No agents completed successfully.";
  }
  if (completed.length === 1) {
    return completed[0].response!;
  }

  // Simple consensus: return all responses with a summary header
  const summary = `${completed.length} of ${results.length} agents responded. Responses:`;
  const responses = completed
    .map((r, i) => `[${i + 1}] ${r.response}`)
    .join("\n\n");

  return `${summary}\n\n${responses}`;
}

/**
 * Apply the selected merge strategy to agent results.
 */
export function mergeResults(
  results: AgentResult[],
  strategy: MergeStrategy,
  agentNames?: Map<string, string>,
): string {
  switch (strategy) {
    case "first_completed":
      return mergeFirstCompleted(results);
    case "best_score":
      return mergeBestScore(results);
    case "merge_all":
      return mergeMergeAll(results, agentNames);
    case "consensus":
      return mergeConsensus(results);
    default:
      return mergeMergeAll(results, agentNames);
  }
}

// ─── Orchestrate: full pipeline ─────────────────────────────────────

/**
 * Run a full orchestration: create run record, fan-out, collect, merge, persist.
 */
export async function orchestrate(
  config: OrchestrationConfig,
  supabase: ReturnType<typeof createClient>,
  logger: Logger,
): Promise<OrchestrationResult> {
  const start = performance.now();
  const timeoutMs = config.timeout_ms || 20000;

  // Create orchestration run record
  const { data: run, error: runError } = await supabase
    .from("orchestration_runs")
    .insert({
      workflow_run_id: config.workflow_run_id || null,
      step_id: config.step_id || null,
      command: config.command,
      agent_ids: config.agent_ids,
      strategy: config.strategy,
      status: "running",
      timeout_ms: timeoutMs,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (runError || !run) {
    logger.error(
      "Failed to create orchestration run",
      runError as unknown as Error,
    );
    throw new Error(`Failed to create orchestration run: ${runError?.message}`);
  }

  const orchestrationRunId = run.id;

  // Insert pending response records for each agent
  const responseInserts = config.agent_ids.map((agentId) => ({
    orchestration_run_id: orchestrationRunId,
    agent_id: agentId,
    status: "pending",
  }));

  await supabase.from("orchestration_responses").insert(responseInserts);

  // Send inter-agent task messages
  const messages = config.agent_ids.map((agentId) => ({
    from_agent_id: config.agent_ids[0], // coordinator = first agent
    to_agent_id: agentId,
    channel: `orchestration:${orchestrationRunId}`,
    message_type: "task",
    content: {
      command: config.command,
      orchestration_run_id: orchestrationRunId,
    },
    correlation_id: orchestrationRunId,
    status: "pending",
  }));

  await supabase.from("agent_messages").insert(messages);

  // Fan-out to all agents
  const agentResults = await broadcastToAgents(
    config.agent_ids,
    config.command,
    timeoutMs,
    logger,
  );

  // Persist individual agent responses
  for (const result of agentResults) {
    await supabase
      .from("orchestration_responses")
      .update({
        status: result.status,
        response: result.response || null,
        tool_calls: result.tool_calls || 0,
        turns: result.turns || 0,
        score: result.score || null,
        duration_ms: result.duration_ms || null,
        error: result.error || null,
        completed_at: new Date().toISOString(),
      })
      .eq("orchestration_run_id", orchestrationRunId)
      .eq("agent_id", result.agent_id);
  }

  // Load agent names for attribution
  const { data: agents } = await supabase
    .from("agents")
    .select("id, name")
    .in("id", config.agent_ids);

  const agentNames = new Map<string, string>(
    (agents || []).map((a: { id: string; name: string }) => [a.id, a.name]),
  );

  // Merge results
  const mergedResponse = mergeResults(
    agentResults,
    config.strategy,
    agentNames,
  );
  const hasAnyCompleted = agentResults.some((r) => r.status === "completed");
  const allTimedOut = agentResults.every((r) => r.status === "timed_out");
  const finalStatus = allTimedOut
    ? "timed_out"
    : hasAnyCompleted
      ? "completed"
      : "failed";

  const durationMs = Math.round(performance.now() - start);

  // Update orchestration run
  await supabase
    .from("orchestration_runs")
    .update({
      status: finalStatus,
      result: {
        merged_response: mergedResponse,
        agent_count: config.agent_ids.length,
        completed_count: agentResults.filter((r) => r.status === "completed")
          .length,
        strategy: config.strategy,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", orchestrationRunId);

  // Mark messages as delivered
  await supabase
    .from("agent_messages")
    .update({ status: "delivered" })
    .eq("correlation_id", orchestrationRunId);

  logger.info("Orchestration completed", {
    orchestrationRunId,
    status: finalStatus,
    agentCount: config.agent_ids.length,
    completedCount: agentResults.filter((r) => r.status === "completed").length,
    strategy: config.strategy,
    durationMs,
  });

  return {
    orchestration_run_id: orchestrationRunId,
    status: finalStatus as "completed" | "failed" | "timed_out",
    merged_response: mergedResponse,
    agent_results: agentResults,
    strategy: config.strategy,
    duration_ms: durationMs,
  };
}
