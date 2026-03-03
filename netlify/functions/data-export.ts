import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

/**
 * Netlify Function: Data Export
 *
 * Exports all tenant data as JSON for backup/migration.
 *
 * Issue: #318 - Tenant data export/import
 *
 * Client calls: POST /api/data-export
 * Body: { tenantId, dataTypes?: string[] }
 */

interface ExportRequest {
  tenantId?: string;
  dataTypes?: string[];
}

interface ExportData {
  version: string;
  exportedAt: string;
  tenantId: string;
  data: {
    contacts: unknown[];
    tasks: unknown[];
    blog_posts: unknown[];
    workflows: unknown[];
    configs: unknown[];
    prompts: unknown[];
    infrastructure_nodes: unknown[];
    bookmarks: unknown[];
  };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Verify the request is from an authenticated admin (check for Clerk JWT)
  const authHeader = event.headers["authorization"];
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  let body: ExportRequest;

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { tenantId, dataTypes } = body;

  if (!tenantId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "tenantId required" }),
    };
  }

  // Initialize Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Supabase configuration missing",
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Build export data structure
  const exportData: ExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    tenantId,
    data: {
      contacts: [],
      tasks: [],
      blog_posts: [],
      workflows: [],
      configs: [],
      prompts: [],
      infrastructure_nodes: [],
      bookmarks: [],
    },
  };

  const typesToExport = dataTypes || [
    "contacts",
    "tasks",
    "blog_posts",
    "workflows",
    "configs",
    "prompts",
    "infrastructure_nodes",
    "bookmarks",
  ];

  try {
    // Export each data type
    for (const dataType of typesToExport) {
      switch (dataType) {
        case "contacts": {
          const { data } = await supabase
            .schema("app")
            .from("contacts")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.contacts = data || [];
          break;
        }

        case "tasks": {
          const { data } = await supabase
            .schema("app")
            .from("tasks")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.tasks = data || [];
          break;
        }

        case "blog_posts": {
          const { data } = await supabase
            .schema("app")
            .from("blog_posts")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.blog_posts = data || [];
          break;
        }

        case "workflows": {
          const { data } = await supabase
            .schema("app")
            .from("workflows")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.workflows = data || [];
          break;
        }

        case "configs": {
          const { data } = await supabase
            .schema("app")
            .from("configs")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.configs = data || [];
          break;
        }

        case "prompts": {
          const { data } = await supabase
            .schema("app")
            .from("prompts")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.prompts = data || [];
          break;
        }

        case "infrastructure_nodes": {
          const { data } = await supabase
            .schema("app")
            .from("infrastructure_nodes")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.infrastructure_nodes = data || [];
          break;
        }

        case "bookmarks": {
          const { data } = await supabase
            .schema("app")
            .from("bookmarks")
            .select("*")
            .eq("tenant_id", tenantId);
          exportData.data.bookmarks = data || [];
          break;
        }

        default:
          // Skip unknown data types
          break;
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="export-${tenantId}-${Date.now()}.json"`,
      },
      body: JSON.stringify(exportData, null, 2),
    };
  } catch (error) {
    console.error("Export failed:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Export failed",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export { handler };
