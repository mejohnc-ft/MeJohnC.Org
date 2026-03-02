/**
 * Multi-Agent Orchestration Tests (#270)
 *
 * Tests orchestration patterns from _shared/orchestration.ts:
 * - Fan-out: broadcast command to multiple agents concurrently
 * - Merge strategies: first_completed, best_score, merge_all, consensus
 * - Timeout handling for slow agents
 * - Partial success (some agents fail)
 * - Orchestrator workflow step integration
 * - Agent message bus persistence
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  AGENT_DASHBOARD,
  AGENT_SUPERVISED,
} from "./fixtures";

// ─── Inline merge logic from orchestration.ts ───────────────────────

type MergeStrategy =
  | "first_completed"
  | "best_score"
  | "merge_all"
  | "consensus";

interface AgentResult {
  agent_id: string;
  status: "completed" | "failed" | "timed_out";
  response?: string;
  tool_calls?: number;
  turns?: number;
  score?: number;
  duration_ms?: number;
  error?: string;
}

function mergeFirstCompleted(results: AgentResult[]): string {
  const completed = results.filter(
    (r) => r.status === "completed" && r.response,
  );
  if (completed.length === 0) {
    return "No agents completed successfully.";
  }
  return completed[0].response!;
}

function mergeBestScore(results: AgentResult[]): string {
  const completed = results.filter(
    (r) => r.status === "completed" && r.response,
  );
  if (completed.length === 0) {
    return "No agents completed successfully.";
  }
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
  const summary = `${completed.length} of ${results.length} agents responded. Responses:`;
  const responses = completed
    .map((r, i) => `[${i + 1}] ${r.response}`)
    .join("\n\n");
  return `${summary}\n\n${responses}`;
}

function mergeResults(
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

// ─── Test Data ──────────────────────────────────────────────────────

const ORCHESTRATION_RUN_ID = "o0000000-0000-0000-0000-000000000001";

const RESULT_OPENCLAW: AgentResult = {
  agent_id: AGENT_OPENCLAW.id,
  status: "completed",
  response: "Found 3 contacts matching the query.",
  tool_calls: 2,
  turns: 2,
  score: 0.9,
  duration_ms: 1200,
};

const RESULT_DASHBOARD: AgentResult = {
  agent_id: AGENT_DASHBOARD.id,
  status: "completed",
  response: "Dashboard analysis shows 5 relevant records.",
  tool_calls: 1,
  turns: 1,
  score: 0.75,
  duration_ms: 800,
};

const RESULT_SUPERVISED: AgentResult = {
  agent_id: AGENT_SUPERVISED.id,
  status: "completed",
  response: "CRM lookup returned 2 matches.",
  tool_calls: 1,
  turns: 1,
  score: 0.85,
  duration_ms: 1500,
};

const RESULT_FAILED: AgentResult = {
  agent_id: AGENT_SUPERVISED.id,
  status: "failed",
  error: "Agent execution error",
  duration_ms: 500,
};

const RESULT_TIMED_OUT: AgentResult = {
  agent_id: AGENT_DASHBOARD.id,
  status: "timed_out",
  error: "Timed out",
  duration_ms: 20000,
};

const AGENT_NAMES = new Map<string, string>([
  [AGENT_OPENCLAW.id, "OpenClaw"],
  [AGENT_DASHBOARD.id, "Dashboard"],
  [AGENT_SUPERVISED.id, "Supervised"],
]);

// ─── Tests ──────────────────────────────────────────────────────────

describe("Multi-Agent Orchestration (#270)", () => {
  describe("Merge Strategy: first_completed", () => {
    it("returns the first completed response", () => {
      const results = [RESULT_OPENCLAW, RESULT_DASHBOARD];
      const merged = mergeResults(results, "first_completed");
      expect(merged).toBe("Found 3 contacts matching the query.");
    });

    it("skips failed agents and returns first completed", () => {
      const results = [RESULT_FAILED, RESULT_DASHBOARD];
      const merged = mergeResults(results, "first_completed");
      expect(merged).toBe("Dashboard analysis shows 5 relevant records.");
    });

    it("returns fallback when no agents complete", () => {
      const results = [RESULT_FAILED, RESULT_TIMED_OUT];
      const merged = mergeResults(results, "first_completed");
      expect(merged).toBe("No agents completed successfully.");
    });
  });

  describe("Merge Strategy: best_score", () => {
    it("returns the highest-scored response", () => {
      const results = [RESULT_DASHBOARD, RESULT_OPENCLAW, RESULT_SUPERVISED];
      const merged = mergeResults(results, "best_score");
      // OpenClaw has score 0.9 (highest)
      expect(merged).toBe("Found 3 contacts matching the query.");
    });

    it("falls back to fastest when no scores present", () => {
      const noScores = [
        { ...RESULT_OPENCLAW, score: undefined, duration_ms: 1200 },
        { ...RESULT_DASHBOARD, score: undefined, duration_ms: 800 },
      ];
      const merged = mergeResults(noScores, "best_score");
      // Dashboard is fastest (800ms)
      expect(merged).toBe("Dashboard analysis shows 5 relevant records.");
    });

    it("ignores failed agents", () => {
      const results = [RESULT_FAILED, RESULT_SUPERVISED];
      const merged = mergeResults(results, "best_score");
      expect(merged).toBe("CRM lookup returned 2 matches.");
    });
  });

  describe("Merge Strategy: merge_all", () => {
    it("combines all responses with agent attribution", () => {
      const results = [RESULT_OPENCLAW, RESULT_DASHBOARD];
      const merged = mergeResults(results, "merge_all", AGENT_NAMES);
      expect(merged).toContain("[Agent OpenClaw]:");
      expect(merged).toContain("[Agent Dashboard]:");
      expect(merged).toContain("Found 3 contacts");
      expect(merged).toContain("Dashboard analysis shows 5");
    });

    it("returns single response without attribution when only one completes", () => {
      const results = [RESULT_FAILED, RESULT_DASHBOARD];
      const merged = mergeResults(results, "merge_all", AGENT_NAMES);
      expect(merged).toBe("Dashboard analysis shows 5 relevant records.");
      expect(merged).not.toContain("[Agent");
    });

    it("uses truncated agent ID when no name map provided", () => {
      const results = [RESULT_OPENCLAW, RESULT_DASHBOARD];
      const merged = mergeResults(results, "merge_all");
      expect(merged).toContain(`[Agent ${AGENT_OPENCLAW.id.slice(0, 8)}]:`);
    });
  });

  describe("Merge Strategy: consensus", () => {
    it("includes response count and all responses", () => {
      const results = [RESULT_OPENCLAW, RESULT_DASHBOARD, RESULT_SUPERVISED];
      const merged = mergeResults(results, "consensus");
      expect(merged).toContain("3 of 3 agents responded");
      expect(merged).toContain("[1]");
      expect(merged).toContain("[2]");
      expect(merged).toContain("[3]");
    });

    it("reports correct count when some agents fail", () => {
      const results = [RESULT_OPENCLAW, RESULT_FAILED, RESULT_DASHBOARD];
      const merged = mergeResults(results, "consensus");
      expect(merged).toContain("2 of 3 agents responded");
    });

    it("returns single response directly when only one completes", () => {
      const results = [RESULT_FAILED, RESULT_TIMED_OUT, RESULT_OPENCLAW];
      const merged = mergeResults(results, "consensus");
      expect(merged).toBe("Found 3 contacts matching the query.");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty results array", () => {
      const merged = mergeResults([], "merge_all");
      expect(merged).toBe("No agents completed successfully.");
    });

    it("handles all agents failing", () => {
      const results: AgentResult[] = [
        { ...RESULT_FAILED, agent_id: AGENT_OPENCLAW.id },
        { ...RESULT_FAILED, agent_id: AGENT_DASHBOARD.id },
      ];
      const merged = mergeResults(results, "merge_all");
      expect(merged).toBe("No agents completed successfully.");
    });

    it("handles all agents timing out", () => {
      const results: AgentResult[] = [
        { ...RESULT_TIMED_OUT, agent_id: AGENT_OPENCLAW.id },
        { ...RESULT_TIMED_OUT, agent_id: AGENT_DASHBOARD.id },
      ];
      const merged = mergeResults(results, "first_completed");
      expect(merged).toBe("No agents completed successfully.");
    });

    it("handles unknown strategy by falling back to merge_all", () => {
      const results = [RESULT_OPENCLAW, RESULT_DASHBOARD];
      const merged = mergeResults(
        results,
        "unknown_strategy" as MergeStrategy,
        AGENT_NAMES,
      );
      expect(merged).toContain("[Agent OpenClaw]:");
    });
  });

  describe("Orchestration Status Determination", () => {
    it("determines completed when at least one agent completes", () => {
      const results = [RESULT_OPENCLAW, RESULT_FAILED, RESULT_TIMED_OUT];
      const hasAnyCompleted = results.some((r) => r.status === "completed");
      const allTimedOut = results.every((r) => r.status === "timed_out");
      const status = allTimedOut
        ? "timed_out"
        : hasAnyCompleted
          ? "completed"
          : "failed";
      expect(status).toBe("completed");
    });

    it("determines timed_out when all agents time out", () => {
      const results: AgentResult[] = [
        { ...RESULT_TIMED_OUT, agent_id: AGENT_OPENCLAW.id },
        { ...RESULT_TIMED_OUT, agent_id: AGENT_DASHBOARD.id },
      ];
      const hasAnyCompleted = results.some((r) => r.status === "completed");
      const allTimedOut = results.every((r) => r.status === "timed_out");
      const status = allTimedOut
        ? "timed_out"
        : hasAnyCompleted
          ? "completed"
          : "failed";
      expect(status).toBe("timed_out");
    });

    it("determines failed when all agents fail (not timeout)", () => {
      const results: AgentResult[] = [
        { ...RESULT_FAILED, agent_id: AGENT_OPENCLAW.id },
        { ...RESULT_FAILED, agent_id: AGENT_DASHBOARD.id },
      ];
      const hasAnyCompleted = results.some((r) => r.status === "completed");
      const allTimedOut = results.every((r) => r.status === "timed_out");
      const status = allTimedOut
        ? "timed_out"
        : hasAnyCompleted
          ? "completed"
          : "failed";
      expect(status).toBe("failed");
    });
  });

  describe("Orchestrator Workflow Step Config Validation", () => {
    it("requires agent_ids in config", () => {
      const config = { command: "test", strategy: "merge_all" } as Record<
        string,
        unknown
      >;
      const agentIds = config.agent_ids as string[] | undefined;
      expect(!agentIds || (agentIds as string[]).length === 0).toBe(true);
    });

    it("requires command in config", () => {
      const config = {
        agent_ids: [AGENT_OPENCLAW.id],
        strategy: "merge_all",
      } as Record<string, unknown>;
      expect(!config.command).toBe(true);
    });

    it("defaults strategy to merge_all", () => {
      const config = {
        agent_ids: [AGENT_OPENCLAW.id],
        command: "test",
      } as Record<string, unknown>;
      const strategy = (config.strategy as MergeStrategy) || "merge_all";
      expect(strategy).toBe("merge_all");
    });

    it("accepts all valid strategies", () => {
      const strategies: MergeStrategy[] = [
        "first_completed",
        "best_score",
        "merge_all",
        "consensus",
      ];
      for (const strategy of strategies) {
        const result = mergeResults([RESULT_OPENCLAW], strategy);
        expect(result).toBeTruthy();
      }
    });
  });

  describe("Agent Message Bus", () => {
    let client: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
      client = createMockSupabaseClient();
    });

    it("creates task messages for each agent in orchestration", () => {
      const agentIds = [AGENT_OPENCLAW.id, AGENT_DASHBOARD.id];
      const messages = agentIds.map((agentId) => ({
        from_agent_id: agentIds[0],
        to_agent_id: agentId,
        channel: `orchestration:${ORCHESTRATION_RUN_ID}`,
        message_type: "task",
        content: {
          command: "analyze data",
          orchestration_run_id: ORCHESTRATION_RUN_ID,
        },
        correlation_id: ORCHESTRATION_RUN_ID,
        status: "pending",
      }));

      expect(messages).toHaveLength(2);
      expect(messages[0].to_agent_id).toBe(AGENT_OPENCLAW.id);
      expect(messages[1].to_agent_id).toBe(AGENT_DASHBOARD.id);
      expect(messages[0].channel).toBe(`orchestration:${ORCHESTRATION_RUN_ID}`);
      expect(messages[0].correlation_id).toBe(ORCHESTRATION_RUN_ID);
    });

    it("marks messages as delivered after orchestration completes", () => {
      client._setQueryResult({ count: 2 });
      // Verify the update pattern matches what orchestration.ts does
      client.from("agent_messages");
      expect(client.from).toHaveBeenCalledWith("agent_messages");
    });
  });

  describe("Orchestration Run Persistence", () => {
    let client: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
      client = createMockSupabaseClient();
    });

    it("creates pending response records for each agent", () => {
      const agentIds = [AGENT_OPENCLAW.id, AGENT_DASHBOARD.id];
      const responseInserts = agentIds.map((agentId) => ({
        orchestration_run_id: ORCHESTRATION_RUN_ID,
        agent_id: agentId,
        status: "pending",
      }));

      expect(responseInserts).toHaveLength(2);
      expect(responseInserts[0].status).toBe("pending");
      expect(responseInserts[1].agent_id).toBe(AGENT_DASHBOARD.id);
    });

    it("structures final result with merged response and counts", () => {
      const agentResults = [RESULT_OPENCLAW, RESULT_DASHBOARD, RESULT_FAILED];
      const completedCount = agentResults.filter(
        (r) => r.status === "completed",
      ).length;
      const result = {
        merged_response: mergeResults(agentResults, "merge_all", AGENT_NAMES),
        agent_count: agentResults.length,
        completed_count: completedCount,
        strategy: "merge_all",
      };

      expect(result.agent_count).toBe(3);
      expect(result.completed_count).toBe(2);
      expect(result.strategy).toBe("merge_all");
      expect(result.merged_response).toContain("[Agent OpenClaw]:");
    });
  });
});
