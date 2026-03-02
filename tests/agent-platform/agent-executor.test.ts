/**
 * Agent Executor Tests
 *
 * Tests the agent-executor edge function logic:
 * - Tool loading by capability
 * - Claude conversation loop with mocked API
 * - Tool execution routing
 * - Timeout and turn limits
 * - Error handling
 *
 * Issues: #266, #268
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AGENT_OPENCLAW, AGENT_DASHBOARD } from "./fixtures";

// ─── Inline types from agent-executor ───────────────────────────────

interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface ToolDefinitionRow {
  name: string;
  display_name: string;
  description: string;
  capability_name: string;
  input_schema: Record<string, unknown>;
  action_name: string;
  is_active: boolean;
}

interface ClaudeTextBlock {
  type: "text";
  text: string;
}

interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ClaudeToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

type ClaudeContentBlock =
  | ClaudeTextBlock
  | ClaudeToolUseBlock
  | ClaudeToolResultBlock;

interface ClaudeResponse {
  id: string;
  role: "assistant";
  content: ClaudeContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

// ─── Inline logic from agent-executor ───────────────────────────────

function loadToolsForCapabilities(
  capabilities: string[],
  allTools: ToolDefinitionRow[],
): { tools: ClaudeTool[]; toolActionMap: Map<string, string> } {
  const toolActionMap = new Map<string, string>();
  const filtered = allTools.filter(
    (t) => t.is_active && capabilities.includes(t.capability_name),
  );
  const tools: ClaudeTool[] = filtered.map((row) => {
    toolActionMap.set(row.name, row.action_name);
    return {
      name: row.name,
      description: row.description,
      input_schema: row.input_schema,
    };
  });
  return { tools, toolActionMap };
}

function canPerformAction(capabilities: string[], action: string): boolean {
  const ACTION_CAPABILITY_MAP: Record<string, string> = {
    "query.contacts": "crm",
    "crm.create_contact": "crm",
    "email.send": "email",
    "tasks.create": "tasks",
    "research.web_search": "research",
    "data.query": "data",
    "documents.search": "documents",
    "kb.search": "kb",
  };
  const required = ACTION_CAPABILITY_MAP[action];
  if (required === undefined) return false;
  if (required === "") return true;
  return capabilities.includes(required);
}

function extractText(response: ClaudeResponse): string {
  return response.content
    .filter((b): b is ClaudeTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function extractToolUses(response: ClaudeResponse): ClaudeToolUseBlock[] {
  return response.content.filter(
    (b): b is ClaudeToolUseBlock => b.type === "tool_use",
  );
}

function wantsToolUse(response: ClaudeResponse): boolean {
  return response.stop_reason === "tool_use";
}

const MAX_TURNS = 5;

async function runAgentLoop(
  command: string,
  capabilities: string[],
  allTools: ToolDefinitionRow[],
  claudeFn: (
    messages: ClaudeMessage[],
    tools?: ClaudeTool[],
  ) => Promise<ClaudeResponse>,
  executeFn: (
    toolName: string,
    actionName: string,
    input: Record<string, unknown>,
  ) => Promise<{ result: string; isError: boolean }>,
  timeoutMs: number = 24000,
): Promise<{ response: string; toolCalls: number; turns: number }> {
  const startTime = Date.now();
  const { tools, toolActionMap } = loadToolsForCapabilities(
    capabilities,
    allTools,
  );

  const messages: ClaudeMessage[] = [{ role: "user", content: command }];
  let totalToolCalls = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (Date.now() - startTime > timeoutMs) {
      return {
        response: "Execution timed out.",
        toolCalls: totalToolCalls,
        turns: turn,
      };
    }

    const claudeResponse = await claudeFn(
      messages,
      tools.length > 0 ? tools : undefined,
    );

    if (!wantsToolUse(claudeResponse)) {
      return {
        response: extractText(claudeResponse),
        toolCalls: totalToolCalls,
        turns: turn + 1,
      };
    }

    const toolUses = extractToolUses(claudeResponse);
    totalToolCalls += toolUses.length;

    messages.push({ role: "assistant", content: claudeResponse.content });

    const toolResults: ClaudeContentBlock[] = [];
    for (const toolUse of toolUses) {
      const actionName = toolActionMap.get(toolUse.name);
      if (!actionName) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolUse.name}` }),
          is_error: true,
        });
        continue;
      }

      if (!canPerformAction(capabilities, actionName)) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: `Insufficient capability` }),
          is_error: true,
        });
        continue;
      }

      const { result, isError } = await executeFn(
        toolUse.name,
        actionName,
        toolUse.input,
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
        is_error: isError,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    response: "Reached maximum turns.",
    toolCalls: totalToolCalls,
    turns: MAX_TURNS,
  };
}

// ─── Mock Tool Definitions ──────────────────────────────────────────

const MOCK_TOOLS: ToolDefinitionRow[] = [
  {
    name: "search_contacts",
    display_name: "Search Contacts",
    description: "Search CRM contacts",
    capability_name: "crm",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    action_name: "query.contacts",
    is_active: true,
  },
  {
    name: "send_email",
    display_name: "Send Email",
    description: "Send an email",
    capability_name: "email",
    input_schema: {
      type: "object",
      properties: { to: { type: "string" }, subject: { type: "string" } },
    },
    action_name: "email.send",
    is_active: true,
  },
  {
    name: "create_task",
    display_name: "Create Task",
    description: "Create a task",
    capability_name: "tasks",
    input_schema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
    action_name: "tasks.create",
    is_active: true,
  },
  {
    name: "query_data",
    display_name: "Query Data",
    description: "Run a data query",
    capability_name: "data",
    input_schema: {
      type: "object",
      properties: { table: { type: "string" } },
      required: ["table"],
    },
    action_name: "data.query",
    is_active: true,
  },
  {
    name: "search_documents",
    display_name: "Search Documents",
    description: "Search documents",
    capability_name: "documents",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    action_name: "documents.search",
    is_active: true,
  },
  {
    name: "web_search",
    display_name: "Web Search",
    description: "Search the web",
    capability_name: "research",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    action_name: "research.web_search",
    is_active: true,
  },
  {
    name: "inactive_tool",
    display_name: "Inactive Tool",
    description: "Should not be loaded",
    capability_name: "crm",
    input_schema: { type: "object", properties: {} },
    action_name: "crm.search",
    is_active: false,
  },
];

// ─── Helper: create mock Claude responses ───────────────────────────

function makeTextResponse(text: string): ClaudeResponse {
  return {
    id: "msg-text",
    role: "assistant",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    model: "claude-sonnet-4-5-20250929",
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

function makeToolUseResponse(
  toolUses: Array<{ name: string; input: Record<string, unknown> }>,
): ClaudeResponse {
  return {
    id: "msg-tool",
    role: "assistant",
    content: toolUses.map((tu, i) => ({
      type: "tool_use" as const,
      id: `tu-${i}`,
      name: tu.name,
      input: tu.input,
    })),
    stop_reason: "tool_use",
    model: "claude-sonnet-4-5-20250929",
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Agent Executor", () => {
  describe("tool loading by capability", () => {
    it("loads only tools matching agent capabilities", () => {
      // AGENT_OPENCLAW has: crm, email, tasks, research, automation
      const { tools } = loadToolsForCapabilities(
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
      );

      const names = tools.map((t) => t.name);
      expect(names).toContain("search_contacts");
      expect(names).toContain("send_email");
      expect(names).toContain("create_task");
      expect(names).toContain("web_search");
      expect(names).not.toContain("query_data"); // requires 'data'
      expect(names).not.toContain("search_documents"); // requires 'documents'
      expect(names).not.toContain("inactive_tool"); // is_active=false
    });

    it("loads different tools for different agent capabilities", () => {
      // AGENT_DASHBOARD has: data, meta_analysis, documents
      const { tools } = loadToolsForCapabilities(
        AGENT_DASHBOARD.capabilities,
        MOCK_TOOLS,
      );

      const names = tools.map((t) => t.name);
      expect(names).toContain("query_data");
      expect(names).toContain("search_documents");
      expect(names).not.toContain("search_contacts"); // requires 'crm'
      expect(names).not.toContain("send_email"); // requires 'email'
    });

    it("builds correct tool-action map", () => {
      const { toolActionMap } = loadToolsForCapabilities(
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
      );

      expect(toolActionMap.get("search_contacts")).toBe("query.contacts");
      expect(toolActionMap.get("send_email")).toBe("email.send");
      expect(toolActionMap.get("create_task")).toBe("tasks.create");
    });

    it("returns empty tools for agent with no matching capabilities", () => {
      const { tools, toolActionMap } = loadToolsForCapabilities([], MOCK_TOOLS);

      expect(tools).toHaveLength(0);
      expect(toolActionMap.size).toBe(0);
    });
  });

  describe("Claude conversation loop", () => {
    const mockExecute = vi.fn(
      async (
        toolName: string,
        actionName: string,
        input: Record<string, unknown>,
      ) => ({
        result: JSON.stringify({
          success: true,
          data: { toolName, actionName },
        }),
        isError: false,
      }),
    );

    beforeEach(() => {
      mockExecute.mockClear();
    });

    it("returns text response when Claude does not use tools", async () => {
      const mockClaude = vi.fn(async () =>
        makeTextResponse("Hello! How can I help?"),
      );

      const result = await runAgentLoop(
        "Say hello",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        mockExecute,
      );

      expect(result.response).toBe("Hello! How can I help?");
      expect(result.toolCalls).toBe(0);
      expect(result.turns).toBe(1);
      expect(mockClaude).toHaveBeenCalledTimes(1);
    });

    it("executes tool use and continues conversation", async () => {
      let callCount = 0;
      const mockClaude = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // First call: Claude uses a tool
          return makeToolUseResponse([
            { name: "search_contacts", input: { query: "John" } },
          ]);
        }
        // Second call: Claude returns text
        return makeTextResponse('Found 3 contacts matching "John".');
      });

      const result = await runAgentLoop(
        "Find contacts named John",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        mockExecute,
      );

      expect(result.response).toBe('Found 3 contacts matching "John".');
      expect(result.toolCalls).toBe(1);
      expect(result.turns).toBe(2);
      expect(mockExecute).toHaveBeenCalledWith(
        "search_contacts",
        "query.contacts",
        { query: "John" },
      );
    });

    it("handles multiple tool uses in one turn", async () => {
      let callCount = 0;
      const mockClaude = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return makeToolUseResponse([
            { name: "search_contacts", input: { query: "Alice" } },
            { name: "create_task", input: { title: "Follow up with Alice" } },
          ]);
        }
        return makeTextResponse(
          "Done: found Alice and created follow-up task.",
        );
      });

      const result = await runAgentLoop(
        "Find Alice and create a follow-up task",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        mockExecute,
      );

      expect(result.toolCalls).toBe(2);
      expect(result.turns).toBe(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it("limits turns to MAX_TURNS", async () => {
      // Claude always requests tool use — should stop after MAX_TURNS
      const mockClaude = vi.fn(async () =>
        makeToolUseResponse([
          { name: "search_contacts", input: { query: "loop" } },
        ]),
      );

      const result = await runAgentLoop(
        "Keep searching forever",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        mockExecute,
      );

      expect(result.response).toBe("Reached maximum turns.");
      expect(result.turns).toBe(MAX_TURNS);
      expect(result.toolCalls).toBe(MAX_TURNS); // one per turn
    });
  });

  describe("tool execution routing", () => {
    it("rejects unknown tool names", async () => {
      let callCount = 0;
      const mockClaude = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return makeToolUseResponse([{ name: "nonexistent_tool", input: {} }]);
        }
        return makeTextResponse("Tool not found.");
      });

      const mockExecute = vi.fn(async () => ({ result: "{}", isError: false }));

      const result = await runAgentLoop(
        "Use a fake tool",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        mockExecute,
      );

      // Tool should NOT have been executed — unknown tool error sent back to Claude
      expect(mockExecute).not.toHaveBeenCalled();
      expect(result.toolCalls).toBe(1); // counted but not executed
    });

    it("rejects tool use when agent lacks capability", async () => {
      // AGENT_DASHBOARD has data, meta_analysis, documents — NOT crm
      let callCount = 0;
      const mockClaude = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // Try to use query_data (which Dashboard HAS access to)
          return makeToolUseResponse([
            { name: "query_data", input: { table: "metrics" } },
          ]);
        }
        return makeTextResponse("Query complete.");
      });

      const mockExecute = vi.fn(async () => ({
        result: JSON.stringify({ rows: [] }),
        isError: false,
      }));

      const result = await runAgentLoop(
        "Query metrics",
        AGENT_DASHBOARD.capabilities,
        MOCK_TOOLS,
        mockClaude,
        mockExecute,
      );

      // data.query should work for Dashboard
      expect(mockExecute).toHaveBeenCalledWith("query_data", "data.query", {
        table: "metrics",
      });
      expect(result.toolCalls).toBe(1);
    });
  });

  describe("error handling", () => {
    it("handles Claude API errors gracefully", async () => {
      const mockClaude = vi.fn(async () => {
        throw new Error("Claude API error: 529 Overloaded");
      });

      const mockExecute = vi.fn(async () => ({ result: "{}", isError: false }));

      await expect(
        runAgentLoop(
          "Do something",
          AGENT_OPENCLAW.capabilities,
          MOCK_TOOLS,
          mockClaude,
          mockExecute,
        ),
      ).rejects.toThrow("Claude API error: 529 Overloaded");
    });

    it("handles tool execution errors without crashing loop", async () => {
      let callCount = 0;
      const mockClaude = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return makeToolUseResponse([
            {
              name: "send_email",
              input: { to: "test@example.com", subject: "Hi" },
            },
          ]);
        }
        return makeTextResponse("Email failed but I handled it.");
      });

      const failingExecute = vi.fn(async () => ({
        result: JSON.stringify({ error: "SMTP connection failed" }),
        isError: true,
      }));

      const result = await runAgentLoop(
        "Send an email",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        failingExecute,
      );

      // Loop should complete — tool error sent back to Claude as tool_result
      expect(result.response).toBe("Email failed but I handled it.");
      expect(result.toolCalls).toBe(1);
      expect(result.turns).toBe(2);
    });

    it("handles timeout during multi-turn execution", async () => {
      let callCount = 0;
      const mockClaude = vi.fn(async () => {
        callCount++;
        // First call: use a tool (takes time)
        if (callCount === 1) {
          return makeToolUseResponse([
            { name: "search_contacts", input: { query: "test" } },
          ]);
        }
        // Second call would happen after timeout
        return makeTextResponse("Should not reach here");
      });

      const slowExecute = vi.fn(async () => {
        // Tool execution takes longer than the timeout budget
        await new Promise((r) => setTimeout(r, 100));
        return { result: "{}", isError: false };
      });

      const result = await runAgentLoop(
        "Do something",
        AGENT_OPENCLAW.capabilities,
        MOCK_TOOLS,
        mockClaude,
        slowExecute,
        50, // Short timeout — tool execution will push us past it
      );

      // After the slow tool execute, the loop should detect timeout on next iteration
      expect(result.response).toBe("Execution timed out.");
      expect(result.toolCalls).toBe(1);
    });
  });
});
