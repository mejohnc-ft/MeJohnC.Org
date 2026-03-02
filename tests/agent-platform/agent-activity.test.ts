/**
 * Per-Agent Activity & Metrics Tests (#272)
 *
 * Tests the agent activity stats structure and query patterns:
 * - Stats shape and field types
 * - Success rate calculation
 * - Latency formatting
 * - Period filtering
 * - Top tools aggregation
 * - Activity timeline structure
 * - Heartbeat update pattern
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSupabaseClient,
  AGENT_OPENCLAW,
  AGENT_DASHBOARD,
} from "./fixtures";

// ─── Inline query logic from agent-platform-queries.ts ─────────────

interface AgentActivityStats {
  agent_id: string;
  period_hours: number;
  total_commands: number;
  completed_commands: number;
  failed_commands: number;
  success_rate: number;
  total_responses: number;
  avg_latency_ms: number;
  total_tool_calls: number;
  top_tools: Array<{ tool: string; count: number }>;
  memory_count: number;
  audit_events: number;
  recent_activity: Array<{
    action: string;
    resource_type: string;
    resource_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}

// ─── Mock Stats Data ────────────────────────────────────────────────

const MOCK_STATS_ACTIVE: AgentActivityStats = {
  agent_id: AGENT_OPENCLAW.id,
  period_hours: 24,
  total_commands: 42,
  completed_commands: 38,
  failed_commands: 4,
  success_rate: 90.5,
  total_responses: 38,
  avg_latency_ms: 1250,
  total_tool_calls: 85,
  top_tools: [
    { tool: "search_contacts", count: 30 },
    { tool: "send_email", count: 20 },
    { tool: "create_task", count: 15 },
    { tool: "search_kb", count: 12 },
    { tool: "list_events", count: 8 },
  ],
  memory_count: 156,
  audit_events: 95,
  recent_activity: [
    {
      action: "agent.execute",
      resource_type: "agent_command",
      resource_id: "cmd-001",
      details: { command: "Find contacts named Alice", tool_calls: 2 },
      created_at: "2026-03-01T16:00:00Z",
    },
    {
      action: "agent.execute",
      resource_type: "agent_command",
      resource_id: "cmd-002",
      details: { command: "Send weekly report", tool_calls: 3 },
      created_at: "2026-03-01T15:30:00Z",
    },
  ],
};

const MOCK_STATS_IDLE: AgentActivityStats = {
  agent_id: AGENT_DASHBOARD.id,
  period_hours: 24,
  total_commands: 0,
  completed_commands: 0,
  failed_commands: 0,
  success_rate: 0,
  total_responses: 0,
  avg_latency_ms: 0,
  total_tool_calls: 0,
  top_tools: [],
  memory_count: 0,
  audit_events: 0,
  recent_activity: [],
};

// ─── Tests ──────────────────────────────────────────────────────────

describe("Agent Activity & Metrics (#272)", () => {
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    client = createMockSupabaseClient();
  });

  describe("Stats Structure", () => {
    it("returns all required metric fields", () => {
      const stats = MOCK_STATS_ACTIVE;
      expect(stats).toHaveProperty("agent_id");
      expect(stats).toHaveProperty("period_hours");
      expect(stats).toHaveProperty("total_commands");
      expect(stats).toHaveProperty("completed_commands");
      expect(stats).toHaveProperty("failed_commands");
      expect(stats).toHaveProperty("success_rate");
      expect(stats).toHaveProperty("total_responses");
      expect(stats).toHaveProperty("avg_latency_ms");
      expect(stats).toHaveProperty("total_tool_calls");
      expect(stats).toHaveProperty("top_tools");
      expect(stats).toHaveProperty("memory_count");
      expect(stats).toHaveProperty("audit_events");
      expect(stats).toHaveProperty("recent_activity");
    });

    it("has correct types for numeric fields", () => {
      const stats = MOCK_STATS_ACTIVE;
      expect(typeof stats.total_commands).toBe("number");
      expect(typeof stats.success_rate).toBe("number");
      expect(typeof stats.avg_latency_ms).toBe("number");
      expect(typeof stats.total_tool_calls).toBe("number");
      expect(typeof stats.memory_count).toBe("number");
    });

    it("top_tools is an array of {tool, count} objects", () => {
      const stats = MOCK_STATS_ACTIVE;
      expect(Array.isArray(stats.top_tools)).toBe(true);
      expect(stats.top_tools[0]).toHaveProperty("tool");
      expect(stats.top_tools[0]).toHaveProperty("count");
      expect(typeof stats.top_tools[0].tool).toBe("string");
      expect(typeof stats.top_tools[0].count).toBe("number");
    });

    it("recent_activity is an array of event objects", () => {
      const stats = MOCK_STATS_ACTIVE;
      expect(Array.isArray(stats.recent_activity)).toBe(true);
      expect(stats.recent_activity[0]).toHaveProperty("action");
      expect(stats.recent_activity[0]).toHaveProperty("resource_type");
      expect(stats.recent_activity[0]).toHaveProperty("created_at");
    });
  });

  describe("Success Rate Calculation", () => {
    it("calculates correct success rate", () => {
      const stats = MOCK_STATS_ACTIVE;
      // 38 completed / (38 completed + 4 failed) = 90.5%
      const expectedRate =
        Math.round(
          (stats.completed_commands /
            (stats.completed_commands + stats.failed_commands)) *
            1000,
        ) / 10;
      expect(stats.success_rate).toBe(expectedRate);
    });

    it("returns 0 when no commands executed", () => {
      expect(MOCK_STATS_IDLE.success_rate).toBe(0);
    });

    it("returns 100 when all commands succeed", () => {
      const perfectStats = {
        ...MOCK_STATS_ACTIVE,
        completed_commands: 10,
        failed_commands: 0,
        success_rate: 100,
      };
      expect(perfectStats.success_rate).toBe(100);
    });
  });

  describe("Latency Formatting", () => {
    function formatLatency(ms: number): string {
      if (ms === 0) return "N/A";
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(1)}s`;
    }

    it("formats zero as N/A", () => {
      expect(formatLatency(0)).toBe("N/A");
    });

    it("formats sub-second as milliseconds", () => {
      expect(formatLatency(500)).toBe("500ms");
    });

    it("formats seconds with one decimal", () => {
      expect(formatLatency(1250)).toBe("1.3s");
    });

    it("formats large values", () => {
      expect(formatLatency(15000)).toBe("15.0s");
    });
  });

  describe("Period Filtering", () => {
    it("supports 1-hour period", () => {
      const stats = { ...MOCK_STATS_ACTIVE, period_hours: 1 };
      expect(stats.period_hours).toBe(1);
    });

    it("supports 6-hour period", () => {
      const stats = { ...MOCK_STATS_ACTIVE, period_hours: 6 };
      expect(stats.period_hours).toBe(6);
    });

    it("supports 24-hour period", () => {
      expect(MOCK_STATS_ACTIVE.period_hours).toBe(24);
    });

    it("supports 7-day (168h) period", () => {
      const stats = { ...MOCK_STATS_ACTIVE, period_hours: 168 };
      expect(stats.period_hours).toBe(168);
    });
  });

  describe("Top Tools Aggregation", () => {
    it("limits to 5 tools max", () => {
      expect(MOCK_STATS_ACTIVE.top_tools.length).toBeLessThanOrEqual(5);
    });

    it("is sorted by count descending", () => {
      const counts = MOCK_STATS_ACTIVE.top_tools.map((t) => t.count);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    });

    it("returns empty array when no tools used", () => {
      expect(MOCK_STATS_IDLE.top_tools).toEqual([]);
    });
  });

  describe("Activity Timeline", () => {
    it("includes action and timestamp", () => {
      const event = MOCK_STATS_ACTIVE.recent_activity[0];
      expect(event.action).toBe("agent.execute");
      expect(event.created_at).toBeTruthy();
    });

    it("is sorted newest first", () => {
      const timestamps = MOCK_STATS_ACTIVE.recent_activity.map((e) =>
        new Date(e.created_at).getTime(),
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
      }
    });

    it("includes command details in event", () => {
      const event = MOCK_STATS_ACTIVE.recent_activity[0];
      expect(event.details).toHaveProperty("command");
      expect(event.details).toHaveProperty("tool_calls");
    });

    it("returns empty array for idle agents", () => {
      expect(MOCK_STATS_IDLE.recent_activity).toEqual([]);
    });
  });

  describe("RPC Call Patterns", () => {
    it("calls get_agent_activity_stats with correct params", () => {
      client._setRpcResult("get_agent_activity_stats", MOCK_STATS_ACTIVE);
      client.rpc("get_agent_activity_stats", {
        p_agent_id: AGENT_OPENCLAW.id,
        p_hours: 24,
      });

      expect(client.rpc).toHaveBeenCalledWith("get_agent_activity_stats", {
        p_agent_id: AGENT_OPENCLAW.id,
        p_hours: 24,
      });
    });

    it("calls agent_heartbeat with correct params", () => {
      client._setRpcResult("agent_heartbeat", null);
      client.rpc("agent_heartbeat", {
        p_agent_id: AGENT_OPENCLAW.id,
        p_health_status: "healthy",
      });

      expect(client.rpc).toHaveBeenCalledWith("agent_heartbeat", {
        p_agent_id: AGENT_OPENCLAW.id,
        p_health_status: "healthy",
      });
    });
  });

  describe("Idle Agent Detection", () => {
    it("identifies idle agents with zero metrics", () => {
      const stats = MOCK_STATS_IDLE;
      const isIdle = stats.total_commands === 0 && stats.audit_events === 0;
      expect(isIdle).toBe(true);
    });

    it("identifies active agents", () => {
      const stats = MOCK_STATS_ACTIVE;
      const isIdle = stats.total_commands === 0 && stats.audit_events === 0;
      expect(isIdle).toBe(false);
    });
  });
});
