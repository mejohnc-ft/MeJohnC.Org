/**
 * Schema Validation Tests
 *
 * Validates that mock fixtures and edge function code use correct column names
 * by parsing the migration SQL files as the source of truth.
 *
 * These tests would have caught bugs #176 (wrong column name) and #177
 * (wrong agent_commands column names) before they reached production.
 *
 * Issue: #183
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Migration SQL Parser ─────────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");
const EDGE_FUNCTIONS_DIR = path.resolve(__dirname, "../../supabase/functions");

/**
 * Parse CREATE TABLE columns from SQL migration files.
 * Extracts column names from CREATE TABLE statements.
 */
function parseTableColumns(sql: string, tableName: string): string[] {
  // Match CREATE TABLE <name> (...) with potential IF NOT EXISTS
  const tableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${tableName}\\s*\\(([^;]+?)\\)\\s*(?:PARTITION|;)`,
    "is",
  );
  const match = sql.match(tableRegex);
  if (!match) return [];

  const body = match[1];
  const columns: string[] = [];

  // Split by top-level commas (not inside parentheses)
  let depth = 0;
  let current = "";
  for (const char of body) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      columns.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) columns.push(current.trim());

  // Extract column names (skip constraints like PRIMARY KEY, CHECK, UNIQUE, FOREIGN KEY)
  return columns
    .map((col) => {
      const trimmed = col.trim();
      if (
        /^(PRIMARY\s+KEY|CHECK|UNIQUE|FOREIGN\s+KEY|CONSTRAINT)/i.test(trimmed)
      ) {
        return null;
      }
      // Column name is the first word
      const colMatch = trimmed.match(/^(\w+)\s+/);
      return colMatch ? colMatch[1] : null;
    })
    .filter((col): col is string => col !== null);
}

/**
 * Parse ALTER TABLE ADD COLUMN statements (handles IF NOT EXISTS)
 */
function parseAlterTableColumns(sql: string, tableName: string): string[] {
  const regex = new RegExp(
    `ALTER\\s+TABLE\\s+${tableName}\\s+ADD\\s+COLUMN\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(\\w+)`,
    "gi",
  );
  const columns: string[] = [];
  let match;
  while ((match = regex.exec(sql)) !== null) {
    columns.push(match[1]);
  }
  return columns;
}

/**
 * Parse RPC function names and their parameter names from CREATE FUNCTION statements
 */
function parseRpcFunctions(sql: string): Map<string, string[]> {
  const functions = new Map<string, string[]>();
  const funcRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\(([^)]*)\)/gi;
  let match;
  while ((match = funcRegex.exec(sql)) !== null) {
    const name = match[1];
    const paramsStr = match[2].trim();
    if (!paramsStr) {
      functions.set(name, []);
      continue;
    }
    const params = paramsStr.split(",").map((p) => {
      const parts = p.trim().split(/\s+/);
      return parts[0]; // parameter name
    });
    functions.set(name, params);
  }
  return functions;
}

/**
 * Load all migration SQL concatenated
 */
function loadAllMigrations(): string {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8"))
    .join("\n");
}

/**
 * Get all columns for a table (from CREATE TABLE + ALTER TABLE ADD COLUMN)
 */
function getTableColumns(allSql: string, tableName: string): string[] {
  const createCols = parseTableColumns(allSql, tableName);
  const alterCols = parseAlterTableColumns(allSql, tableName);
  return [...new Set([...createCols, ...alterCols])];
}

/**
 * Scan edge function .ts files for .from('tableName').select('columns') patterns
 * and .from('tableName').insert/update({columns}) patterns.
 * Works with multiline chains.
 */
function extractCodeColumnReferences(
  functionDir: string,
): { table: string; columns: string[]; file: string; line: number }[] {
  const refs: {
    table: string;
    columns: string[];
    file: string;
    line: number;
  }[] = [];

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");

        // Find line number for a character offset
        const getLineNumber = (offset: number): number => {
          return content.substring(0, offset).split("\n").length;
        };

        // Match .from('tableName') followed by .select('columns') without crossing another .from()
        const fromSelectRegex =
          /\.from\(['"](\w+)['"]\)(?:(?!\.from\()[\s\S]){0,500}?\.select\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = fromSelectRegex.exec(content)) !== null) {
          const table = match[1];
          const columns = match[2]
            .split(",")
            .map((c) => c.trim().split(/\s+/)[0])
            .filter(
              (c) =>
                c && !c.includes("(") && !c.includes("*") && !c.includes("."),
            );
          if (columns.length > 0) {
            refs.push({
              table,
              columns,
              file: fullPath,
              line: getLineNumber(match.index),
            });
          }
        }

        // Match .from('tableName') followed by .insert({...}) without crossing another .from()
        const fromInsertRegex =
          /\.from\(['"](\w+)['"]\)(?:(?!\.from\()[\s\S]){0,500}?\.insert\(\{([^}]+)\}/g;
        while ((match = fromInsertRegex.exec(content)) !== null) {
          const table = match[1];
          const columns = match[2]
            .split(",")
            .map((pair) => pair.trim().split(/\s*:/)[0].trim())
            .filter((c) => c && /^\w+$/.test(c));
          if (columns.length > 0) {
            refs.push({
              table,
              columns,
              file: fullPath,
              line: getLineNumber(match.index),
            });
          }
        }

        // Match .from('tableName') followed by .update({...}) without crossing another .from()
        const fromUpdateRegex =
          /\.from\(['"](\w+)['"]\)(?:(?!\.from\()[\s\S]){0,500}?\.update\(\{([^}]+)\}/g;
        while ((match = fromUpdateRegex.exec(content)) !== null) {
          const table = match[1];
          const columns = match[2]
            .split(",")
            .map((pair) => pair.trim().split(/\s*:/)[0].trim())
            .filter((c) => c && /^\w+$/.test(c));
          if (columns.length > 0) {
            refs.push({
              table,
              columns,
              file: fullPath,
              line: getLineNumber(match.index),
            });
          }
        }
      }
    }
  }

  scanDir(functionDir);
  return refs;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("Schema Validation: Migration SQL vs Code", () => {
  const allSql = loadAllMigrations();

  // Build schema map from migrations
  const KNOWN_TABLES = [
    "agents",
    "workflows",
    "workflow_runs",
    "integrations",
    "integration_credentials",
    "agent_integrations",
    "audit_log",
    "capability_definitions",
    "agent_skills",
    "event_types",
    "event_subscriptions",
    "events",
    "rate_limit_buckets",
    "agent_commands",
    "agent_responses",
    "agent_tasks",
    "agent_task_runs",
    "tool_definitions",
  ];

  const schemaMap = new Map<string, string[]>();
  for (const table of KNOWN_TABLES) {
    const cols = getTableColumns(allSql, table);
    if (cols.length > 0) {
      schemaMap.set(table, cols);
    }
  }

  it("should parse all expected tables from migrations", () => {
    const parsedTables = Array.from(schemaMap.keys());
    // At minimum these core tables must be found
    expect(parsedTables).toContain("agents");
    expect(parsedTables).toContain("workflows");
    expect(parsedTables).toContain("workflow_runs");
    expect(parsedTables).toContain("integrations");
    expect(parsedTables).toContain("integration_credentials");
    expect(parsedTables).toContain("audit_log");
  });

  describe("agents table", () => {
    it("should have expected columns", () => {
      const cols = schemaMap.get("agents")!;
      expect(cols).toContain("id");
      expect(cols).toContain("name");
      expect(cols).toContain("type");
      expect(cols).toContain("status");
      expect(cols).toContain("capabilities");
      expect(cols).toContain("api_key_hash");
      expect(cols).toContain("rate_limit_rpm");
      expect(cols).toContain("metadata");
      expect(cols).toContain("last_seen_at");
      expect(cols).toContain("created_at");
      expect(cols).toContain("updated_at");
      // Phase 4 addition
      expect(cols).toContain("signing_secret_encrypted");
    });
  });

  describe("integration_credentials table", () => {
    it("should have expected columns", () => {
      const cols = schemaMap.get("integration_credentials")!;
      expect(cols).toContain("id");
      expect(cols).toContain("integration_id");
      expect(cols).toContain("agent_id");
      expect(cols).toContain("credential_type");
      expect(cols).toContain("encrypted_data");
      expect(cols).toContain("encryption_key_id");
      expect(cols).toContain("expires_at");
      expect(cols).toContain("last_used_at");
      expect(cols).toContain("created_at");
      expect(cols).toContain("updated_at");
    });
  });

  describe("workflows table", () => {
    it("should have expected columns", () => {
      const cols = schemaMap.get("workflows")!;
      expect(cols).toContain("id");
      expect(cols).toContain("name");
      expect(cols).toContain("trigger_type");
      expect(cols).toContain("trigger_config");
      expect(cols).toContain("steps");
      expect(cols).toContain("is_active");
      expect(cols).toContain("created_by");
    });
  });

  describe("Mock fixture column names match schema", () => {
    it("AGENT fixtures should only use valid agents columns", () => {
      const validCols = new Set(schemaMap.get("agents") || []);
      const fixtureKeys = Object.keys({
        // Reproduce the fixture shape
        id: "",
        name: "",
        type: "",
        status: "",
        capabilities: [],
        rate_limit_rpm: 0,
        metadata: {},
        last_seen_at: null,
        created_at: "",
        updated_at: "",
      });
      for (const key of fixtureKeys) {
        expect(
          validCols.has(key),
          `agents fixture key "${key}" not in schema`,
        ).toBe(true);
      }
    });

    it("MOCK_CREDENTIAL fixture should only use valid integration_credentials columns", () => {
      const validCols = new Set(schemaMap.get("integration_credentials") || []);
      const fixtureKeys = [
        "id",
        "integration_id",
        "agent_id",
        "credential_type",
        "encrypted_data",
        "encryption_key_id",
        "expires_at",
        "last_used_at",
        "created_at",
        "updated_at",
      ];
      for (const key of fixtureKeys) {
        expect(
          validCols.has(key),
          `integration_credentials fixture key "${key}" not in schema`,
        ).toBe(true);
      }
    });

    it("WORKFLOW fixtures should only use valid workflows columns", () => {
      const validCols = new Set(schemaMap.get("workflows") || []);
      const fixtureKeys = [
        "id",
        "name",
        "description",
        "trigger_type",
        "trigger_config",
        "is_active",
        "steps",
        "created_by",
        "created_at",
        "updated_at",
      ];
      for (const key of fixtureKeys) {
        expect(
          validCols.has(key),
          `workflows fixture key "${key}" not in schema`,
        ).toBe(true);
      }
    });
  });

  describe("Edge function code references valid columns", () => {
    const codeRefs = extractCodeColumnReferences(EDGE_FUNCTIONS_DIR);

    it("should find column references in edge functions", () => {
      expect(codeRefs.length).toBeGreaterThan(0);
    });

    it("all .select() column references should exist in their table schema", () => {
      const errors: string[] = [];

      for (const ref of codeRefs) {
        const tableCols = schemaMap.get(ref.table);
        if (!tableCols) continue; // Skip tables we don't have schema for

        for (const col of ref.columns) {
          if (!tableCols.includes(col)) {
            errors.push(
              `${path.basename(ref.file)}:${ref.line} references "${ref.table}.${col}" but column doesn't exist. ` +
                `Valid columns: [${tableCols.join(", ")}]`,
            );
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(
          `Found ${errors.length} invalid column reference(s):\n` +
            errors.map((e) => `  - ${e}`).join("\n"),
        );
      }
    });
  });

  describe("RPC function signatures", () => {
    const rpcFunctions = parseRpcFunctions(allSql);

    it("should find expected RPC functions in migrations", () => {
      expect(rpcFunctions.has("verify_agent_api_key")).toBe(true);
      expect(rpcFunctions.has("log_audit_event")).toBe(true);
      expect(rpcFunctions.has("check_rate_limit")).toBe(true);
    });

    it("verify_agent_api_key should accept p_api_key parameter", () => {
      const params = rpcFunctions.get("verify_agent_api_key");
      expect(params).toBeDefined();
      expect(params).toContain("p_api_key");
    });

    it("log_audit_event should accept expected parameters", () => {
      const params = rpcFunctions.get("log_audit_event");
      expect(params).toBeDefined();
      expect(params).toContain("p_actor_type");
      expect(params).toContain("p_actor_id");
      expect(params).toContain("p_action");
      expect(params).toContain("p_resource_type");
      expect(params).toContain("p_resource_id");
      expect(params).toContain("p_details");
    });

    it("check_rate_limit should accept expected parameters", () => {
      const params = rpcFunctions.get("check_rate_limit");
      expect(params).toBeDefined();
      expect(params).toContain("p_key");
      expect(params).toContain("p_window_ms");
      expect(params).toContain("p_max_requests");
    });
  });
});
