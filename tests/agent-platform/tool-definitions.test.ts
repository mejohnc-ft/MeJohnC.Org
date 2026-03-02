/**
 * Tool Definitions Admin UI Tests (#359)
 *
 * Tests the tool definitions CRUD patterns:
 * - Query patterns for tool_definitions table
 * - Schema validation
 * - Active/inactive toggle
 * - Filter by capability
 * - Search logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "./fixtures";

// ─── Inline types and logic ─────────────────────────────────────────

interface ToolDefinition {
  id: string;
  name: string;
  display_name: string;
  description: string;
  capability_name: string;
  input_schema: Record<string, unknown>;
  action_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const MOCK_TOOL: ToolDefinition = {
  id: "td000000-0000-0000-0000-000000000001",
  name: "search_contacts",
  display_name: "Search Contacts",
  description: "Search CRM contacts by name, email, company, or tags",
  capability_name: "crm",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      limit: { type: "integer", description: "Max results", default: 10 },
    },
    required: ["query"],
  },
  action_name: "query.contacts",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_TOOL_INACTIVE: ToolDefinition = {
  ...MOCK_TOOL,
  id: "td000000-0000-0000-0000-000000000002",
  name: "web_search",
  display_name: "Web Search",
  description: "Search the web",
  capability_name: "research",
  action_name: "research.web_search",
  is_active: false,
};

function validateSchema(text: string): { valid: boolean; error: string } {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) {
      return { valid: false, error: "Schema must be a JSON object" };
    }
    return { valid: true, error: "" };
  } catch {
    return { valid: false, error: "Invalid JSON" };
  }
}

function searchTools(tools: ToolDefinition[], query: string): ToolDefinition[] {
  const lower = query.toLowerCase();
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(lower) ||
      t.display_name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.capability_name.toLowerCase().includes(lower),
  );
}

function filterByCapability(
  tools: ToolDefinition[],
  cap: string,
): ToolDefinition[] {
  return cap ? tools.filter((t) => t.capability_name === cap) : tools;
}

function filterByActive(
  tools: ToolDefinition[],
  active: string,
): ToolDefinition[] {
  if (active === "true") return tools.filter((t) => t.is_active);
  if (active === "false") return tools.filter((t) => !t.is_active);
  return tools;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("Tool Definitions Admin UI (#359)", () => {
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    client = createMockSupabaseClient();
  });

  // ─── Query Patterns ────────────────────────────────────────────

  describe("query patterns", () => {
    it("should query tool_definitions table", async () => {
      client._setQueryResult([MOCK_TOOL]);

      const { data } = await client
        .from("tool_definitions")
        .select("*")
        .order("capability_name")
        .order("name");

      expect(client.from).toHaveBeenCalledWith("tool_definitions");
      expect(data).toHaveLength(1);
    });

    it("should insert new tool definition", async () => {
      client._setQueryResult(MOCK_TOOL);

      await client.from("tool_definitions").insert({
        name: MOCK_TOOL.name,
        display_name: MOCK_TOOL.display_name,
        description: MOCK_TOOL.description,
        capability_name: MOCK_TOOL.capability_name,
        input_schema: MOCK_TOOL.input_schema,
        action_name: MOCK_TOOL.action_name,
        is_active: true,
      });

      expect(client.from("tool_definitions").insert).toHaveBeenCalled();
    });

    it("should update existing tool definition", async () => {
      client._setQueryResult(MOCK_TOOL);

      await client
        .from("tool_definitions")
        .update({ display_name: "Updated Name" })
        .eq("id", MOCK_TOOL.id);

      expect(client.from("tool_definitions").update).toHaveBeenCalledWith({
        display_name: "Updated Name",
      });
    });

    it("should delete tool definition", async () => {
      client._setQueryResult(null);

      await client.from("tool_definitions").delete().eq("id", MOCK_TOOL.id);

      expect(client.from("tool_definitions").delete).toHaveBeenCalled();
    });

    it("should toggle is_active", async () => {
      client._setQueryResult({ ...MOCK_TOOL, is_active: false });

      await client
        .from("tool_definitions")
        .update({ is_active: false })
        .eq("id", MOCK_TOOL.id);

      expect(client.from("tool_definitions").update).toHaveBeenCalledWith({
        is_active: false,
      });
    });
  });

  // ─── Schema Validation ─────────────────────────────────────────

  describe("schema validation", () => {
    it("should accept valid JSON object", () => {
      const result = validateSchema('{"type": "object", "properties": {}}');
      expect(result.valid).toBe(true);
      expect(result.error).toBe("");
    });

    it("should reject invalid JSON", () => {
      const result = validateSchema("{bad json}");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid JSON");
    });

    it("should reject non-object JSON", () => {
      const result = validateSchema('"just a string"');
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema must be a JSON object");
    });

    it("should reject null", () => {
      const result = validateSchema("null");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Schema must be a JSON object");
    });

    it("should accept complex nested schema", () => {
      const schema = JSON.stringify({
        type: "object",
        properties: {
          query: { type: "string" },
          filters: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["active", "inactive"] },
            },
          },
        },
        required: ["query"],
      });
      expect(validateSchema(schema).valid).toBe(true);
    });
  });

  // ─── Search and Filtering ──────────────────────────────────────

  describe("search and filtering", () => {
    const tools = [MOCK_TOOL, MOCK_TOOL_INACTIVE];

    it("should search by name", () => {
      expect(searchTools(tools, "search_contacts")).toHaveLength(1);
    });

    it("should search by display name", () => {
      expect(searchTools(tools, "Web Search")).toHaveLength(1);
    });

    it("should search by description", () => {
      expect(searchTools(tools, "CRM contacts")).toHaveLength(1);
    });

    it("should search by capability", () => {
      expect(searchTools(tools, "research")).toHaveLength(1);
    });

    it("should be case insensitive", () => {
      expect(searchTools(tools, "WEB SEARCH")).toHaveLength(1);
    });

    it("should return all for empty search", () => {
      expect(searchTools(tools, "")).toHaveLength(2);
    });

    it("should filter by capability", () => {
      expect(filterByCapability(tools, "crm")).toHaveLength(1);
      expect(filterByCapability(tools, "research")).toHaveLength(1);
      expect(filterByCapability(tools, "")).toHaveLength(2);
    });

    it("should filter by active status", () => {
      expect(filterByActive(tools, "true")).toHaveLength(1);
      expect(filterByActive(tools, "false")).toHaveLength(1);
      expect(filterByActive(tools, "")).toHaveLength(2);
    });
  });

  // ─── Tool Definition Structure ─────────────────────────────────

  describe("tool definition structure", () => {
    it("should have required fields", () => {
      expect(MOCK_TOOL.id).toBeDefined();
      expect(MOCK_TOOL.name).toBeDefined();
      expect(MOCK_TOOL.display_name).toBeDefined();
      expect(MOCK_TOOL.description).toBeDefined();
      expect(MOCK_TOOL.capability_name).toBeDefined();
      expect(MOCK_TOOL.input_schema).toBeDefined();
      expect(MOCK_TOOL.action_name).toBeDefined();
      expect(typeof MOCK_TOOL.is_active).toBe("boolean");
    });

    it("should have valid input schema structure", () => {
      expect(MOCK_TOOL.input_schema.type).toBe("object");
      expect(MOCK_TOOL.input_schema.properties).toBeDefined();
    });

    it("should map name to action_name", () => {
      expect(MOCK_TOOL.action_name).toBe("query.contacts");
    });
  });
});
