/**
 * Command Polling Utility for Supabase Edge Functions
 *
 * Polls the `agent_commands` table until a command reaches a terminal state.
 * Used by workflow-executor to wait for integration_action steps to complete
 * instead of fire-and-forget dispatch.
 *
 * Usage:
 *   import { pollCommandCompletion } from '../_shared/command-polling.ts'
 *
 *   const result = await pollCommandCompletion(commandId, 10000, supabase, logger)
 *   if (result.status === 'completed') { ... }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Logger } from "./logger.ts";

const POLL_INTERVAL_MS = 500;
const MAX_TIMEOUT_MS = 24000; // 1s buffer for edge function 25s limit

const TERMINAL_STATES = new Set(["completed", "failed", "cancelled"]);

export interface PollResult {
  status: "completed" | "failed" | "cancelled" | "timeout";
  output?: unknown;
  error?: string;
}

/**
 * Poll an agent_commands row until it reaches a terminal status.
 *
 * @param commandId - UUID of the agent_commands row to watch
 * @param timeoutMs - Maximum time to poll (capped at 24s)
 * @param supabase  - Service-role Supabase client
 * @param logger    - Logger instance for structured logging
 */
export async function pollCommandCompletion(
  commandId: string,
  timeoutMs: number,
  supabase: ReturnType<typeof createClient>,
  logger: Logger,
): Promise<PollResult> {
  const effectiveTimeout = Math.min(timeoutMs, MAX_TIMEOUT_MS);
  const deadline = Date.now() + effectiveTimeout;

  logger.info("Polling command completion", {
    commandId,
    timeoutMs: effectiveTimeout,
  });

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("agent_commands")
      .select("status, metadata")
      .eq("id", commandId)
      .single();

    if (error) {
      logger.error("Poll query failed", error as unknown as Error, {
        commandId,
      });
      return { status: "failed", error: `Poll query error: ${error.message}` };
    }

    if (!data) {
      return { status: "failed", error: "Command not found" };
    }

    if (TERMINAL_STATES.has(data.status)) {
      logger.info("Command reached terminal state", {
        commandId,
        status: data.status,
      });
      const meta = data.metadata as Record<string, unknown> | null;
      if (data.status === "completed") {
        return { status: "completed", output: meta?.result ?? null };
      }
      if (data.status === "cancelled") {
        return { status: "cancelled", error: "Command was cancelled" };
      }
      return {
        status: "failed",
        error: (meta?.error as string) ?? "Command failed",
      };
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  logger.warn("Command polling timed out", {
    commandId,
    timeoutMs: effectiveTimeout,
  });
  return {
    status: "timeout",
    error: `Polling timed out after ${effectiveTimeout}ms`,
  };
}
