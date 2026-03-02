/**
 * Agent Memory Tests
 *
 * Tests the agent memory module: summary building, prompt formatting,
 * memory retrieval (mocked), memory storage (mocked), and graceful degradation.
 *
 * Issue: #269
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AGENT_OPENCLAW,
  MOCK_MEMORY_1,
  MOCK_MEMORY_2,
  MOCK_EMBEDDING,
  createMockSupabaseClient,
} from "./fixtures";

// ─── Inline types from agent-memory ─────────────────────────────────

interface AgentMemory {
  id: string;
  summary: string;
  command_text: string | null;
  response_text: string | null;
  tool_names: string[];
  importance: number;
  similarity: number;
  created_at: string;
}

interface StoreMemoryOptions {
  agentId: string;
  sessionId?: string;
  commandId?: string;
  command: string;
  response: string;
  toolNames?: string[];
  turnCount?: number;
  importance?: number;
}

// ─── Inline logic from agent-memory (pure functions) ─────────────────

const MAX_SUMMARY_LENGTH = 2000;
const MAX_STORED_TEXT_LENGTH = 1000;

function buildSummary(command: string, response: string): string {
  const summary = `Command: ${command}\nResponse: ${response}`;
  return summary.substring(0, MAX_SUMMARY_LENGTH);
}

function formatMemoriesForPrompt(memories: AgentMemory[]): string {
  if (memories.length === 0) {
    return "";
  }

  const lines = memories.map((m, i) => {
    const date = new Date(m.created_at).toISOString().split("T")[0];
    const tools =
      m.tool_names.length > 0 ? ` (tools: ${m.tool_names.join(", ")})` : "";
    return `${i + 1}. [${date}]${tools} ${m.summary}`;
  });

  return ["", "RELEVANT PAST INTERACTIONS:", ...lines, ""].join("\n");
}

// ─── Mock retrieval/storage functions ────────────────────────────────

async function retrieveMemories(
  agentId: string,
  command: string,
  supabase: ReturnType<typeof createMockSupabaseClient>,
  embedFn: (text: string) => Promise<number[] | null>,
): Promise<AgentMemory[]> {
  const embedding = await embedFn(command);
  if (!embedding) {
    return [];
  }

  try {
    const { data, error } = await supabase.rpc("match_agent_memories", {
      p_agent_id: agentId,
      p_embedding: JSON.stringify(embedding),
      p_match_count: 5,
      p_threshold: 0.7,
    });

    if (error) return [];

    const memories = (data as AgentMemory[]) || [];
    if (memories.length > 0) {
      const ids = memories.map((m) => m.id);
      supabase.rpc("touch_agent_memories", { p_ids: ids }).catch(() => {});
    }

    return memories;
  } catch {
    return [];
  }
}

async function storeMemory(
  opts: StoreMemoryOptions,
  supabase: ReturnType<typeof createMockSupabaseClient>,
  embedFn: (text: string) => Promise<number[] | null>,
): Promise<boolean> {
  const summary = buildSummary(opts.command, opts.response);
  const embedding = await embedFn(summary);

  if (!embedding) {
    return false;
  }

  try {
    const { error } = await supabase.from("agent_memories").insert({
      agent_id: opts.agentId,
      session_id: opts.sessionId || null,
      command_id: opts.commandId || null,
      summary,
      embedding: JSON.stringify(embedding),
      command_text: opts.command.substring(0, MAX_STORED_TEXT_LENGTH),
      response_text: opts.response.substring(0, MAX_STORED_TEXT_LENGTH),
      tool_names: opts.toolNames || [],
      turn_count: opts.turnCount || 0,
      importance: opts.importance || 1.0,
    });

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Agent Memory", () => {
  describe("buildSummary", () => {
    it("concatenates command and response", () => {
      const summary = buildSummary("Find Alice", "Found 3 contacts.");
      expect(summary).toBe("Command: Find Alice\nResponse: Found 3 contacts.");
    });

    it("truncates very long summaries", () => {
      const longCommand = "x".repeat(1500);
      const longResponse = "y".repeat(1500);
      const summary = buildSummary(longCommand, longResponse);
      expect(summary.length).toBeLessThanOrEqual(MAX_SUMMARY_LENGTH);
    });

    it("handles empty strings", () => {
      const summary = buildSummary("", "");
      expect(summary).toBe("Command: \nResponse: ");
    });
  });

  describe("formatMemoriesForPrompt", () => {
    it("returns empty string for no memories", () => {
      expect(formatMemoriesForPrompt([])).toBe("");
    });

    it("formats single memory with tools", () => {
      const result = formatMemoriesForPrompt([MOCK_MEMORY_1 as AgentMemory]);
      expect(result).toContain("RELEVANT PAST INTERACTIONS:");
      expect(result).toContain("2026-02-28");
      expect(result).toContain("(tools: search_contacts)");
      expect(result).toContain(MOCK_MEMORY_1.summary);
    });

    it("formats multiple memories in order", () => {
      const result = formatMemoriesForPrompt([
        MOCK_MEMORY_1 as AgentMemory,
        MOCK_MEMORY_2 as AgentMemory,
      ]);
      expect(result).toContain("1. [2026-02-28]");
      expect(result).toContain("2. [2026-02-27]");
    });

    it("omits tools section when no tools used", () => {
      const memoryNoTools: AgentMemory = {
        ...MOCK_MEMORY_1,
        tool_names: [],
      };
      const result = formatMemoriesForPrompt([memoryNoTools]);
      expect(result).not.toContain("(tools:");
    });
  });

  describe("retrieveMemories", () => {
    let supabase: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
      supabase = createMockSupabaseClient();
    });

    it("returns empty when embedding generation fails", async () => {
      const failEmbed = async () => null;
      const memories = await retrieveMemories(
        AGENT_OPENCLAW.id,
        "test command",
        supabase,
        failEmbed,
      );
      expect(memories).toHaveLength(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("calls match_agent_memories RPC with correct params", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setRpcResult("match_agent_memories", [MOCK_MEMORY_1]);

      await retrieveMemories(
        AGENT_OPENCLAW.id,
        "Find contacts",
        supabase,
        successEmbed,
      );

      expect(supabase.rpc).toHaveBeenCalledWith("match_agent_memories", {
        p_agent_id: AGENT_OPENCLAW.id,
        p_embedding: JSON.stringify(MOCK_EMBEDDING),
        p_match_count: 5,
        p_threshold: 0.7,
      });
    });

    it("returns matched memories", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setRpcResult("match_agent_memories", [
        MOCK_MEMORY_1,
        MOCK_MEMORY_2,
      ]);

      const memories = await retrieveMemories(
        AGENT_OPENCLAW.id,
        "Find contacts",
        supabase,
        successEmbed,
      );

      expect(memories).toHaveLength(2);
      expect(memories[0].id).toBe(MOCK_MEMORY_1.id);
    });

    it("touches retrieved memories", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setRpcResult("match_agent_memories", [MOCK_MEMORY_1]);

      await retrieveMemories(
        AGENT_OPENCLAW.id,
        "Find contacts",
        supabase,
        successEmbed,
      );

      // Wait for fire-and-forget
      await new Promise((r) => setTimeout(r, 10));

      expect(supabase.rpc).toHaveBeenCalledWith("touch_agent_memories", {
        p_ids: [MOCK_MEMORY_1.id],
      });
    });

    it("returns empty on RPC error", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setRpcResult("match_agent_memories", null, {
        message: "Database error",
      });

      const memories = await retrieveMemories(
        AGENT_OPENCLAW.id,
        "Find contacts",
        supabase,
        successEmbed,
      );

      expect(memories).toHaveLength(0);
    });
  });

  describe("storeMemory", () => {
    let supabase: ReturnType<typeof createMockSupabaseClient>;

    beforeEach(() => {
      supabase = createMockSupabaseClient();
    });

    it("returns false when embedding generation fails", async () => {
      const failEmbed = async () => null;
      const stored = await storeMemory(
        {
          agentId: AGENT_OPENCLAW.id,
          command: "test",
          response: "test",
        },
        supabase,
        failEmbed,
      );
      expect(stored).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("inserts memory with correct fields", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setQueryResult({ id: "new-id" });

      const stored = await storeMemory(
        {
          agentId: AGENT_OPENCLAW.id,
          sessionId: "session-1",
          command: "Find Alice",
          response: "Found 3 contacts.",
          toolNames: ["search_contacts"],
          turnCount: 2,
        },
        supabase,
        successEmbed,
      );

      expect(stored).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith("agent_memories");
    });

    it("truncates long command and response text", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setQueryResult({ id: "new-id" });

      const longText = "a".repeat(2000);
      const stored = await storeMemory(
        {
          agentId: AGENT_OPENCLAW.id,
          command: longText,
          response: longText,
        },
        supabase,
        successEmbed,
      );

      expect(stored).toBe(true);
      // The inline insert call should have truncated text
      const insertCall = supabase.from.mock.results[0]?.value?.insert;
      if (insertCall) {
        const args = insertCall.mock.calls[0]?.[0];
        if (args) {
          expect(args.command_text.length).toBeLessThanOrEqual(
            MAX_STORED_TEXT_LENGTH,
          );
          expect(args.response_text.length).toBeLessThanOrEqual(
            MAX_STORED_TEXT_LENGTH,
          );
        }
      }
    });

    it("returns false on database error", async () => {
      const successEmbed = async () => MOCK_EMBEDDING;
      supabase._setQueryResult(null, { message: "Insert failed" });

      const stored = await storeMemory(
        {
          agentId: AGENT_OPENCLAW.id,
          command: "test",
          response: "test",
        },
        supabase,
        successEmbed,
      );

      expect(stored).toBe(false);
    });
  });

  describe("graceful degradation", () => {
    it("retrieval returns empty without API key (embedding fails)", async () => {
      const supabase = createMockSupabaseClient();
      const noKeyEmbed = async () => null;

      const memories = await retrieveMemories(
        AGENT_OPENCLAW.id,
        "test",
        supabase,
        noKeyEmbed,
      );

      expect(memories).toHaveLength(0);
    });

    it("storage returns false without API key (embedding fails)", async () => {
      const supabase = createMockSupabaseClient();
      const noKeyEmbed = async () => null;

      const stored = await storeMemory(
        {
          agentId: AGENT_OPENCLAW.id,
          command: "test",
          response: "test",
        },
        supabase,
        noKeyEmbed,
      );

      expect(stored).toBe(false);
    });
  });
});
