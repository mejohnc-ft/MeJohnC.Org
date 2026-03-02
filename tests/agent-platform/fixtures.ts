/**
 * Shared test fixtures and mock helpers for agent platform integration tests.
 *
 * Since edge functions use Deno imports and can't be imported into Vitest directly,
 * tests mock the Supabase JS client to verify correct query/RPC call patterns and
 * inline pure business logic for unit testing.
 */
import { vi } from "vitest";

// ─── Mock Agent Profiles ────────────────────────────────────────────

export const AGENT_OPENCLAW = {
  id: "a0000000-0000-0000-0000-000000000001",
  name: "OpenClaw",
  type: "autonomous" as const,
  status: "active" as const,
  capabilities: ["crm", "email", "tasks", "research", "automation"],
  rate_limit_rpm: 120,
  metadata: { description: "Autonomous agent", version: "1.0" },
  last_seen_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const AGENT_DASHBOARD = {
  id: "a0000000-0000-0000-0000-000000000002",
  name: "Dashboard",
  type: "tool" as const,
  status: "active" as const,
  capabilities: ["data", "meta_analysis", "documents"],
  rate_limit_rpm: 300,
  metadata: { description: "Tool agent", version: "1.0" },
  last_seen_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const AGENT_SUPERVISED = {
  id: "a0000000-0000-0000-0000-000000000003",
  name: "Supervised",
  type: "supervised" as const,
  status: "active" as const,
  capabilities: ["crm", "email"],
  rate_limit_rpm: 60,
  metadata: { description: "Supervised agent", version: "1.0" },
  allow_destructive: false,
  last_seen_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const AGENT_DESTRUCTIVE = {
  id: "a0000000-0000-0000-0000-000000000004",
  name: "Destructive",
  type: "autonomous" as const,
  status: "active" as const,
  capabilities: ["crm", "email", "social", "finance"],
  rate_limit_rpm: 120,
  metadata: { description: "Agent with destructive perms", version: "1.0" },
  allow_destructive: true,
  last_seen_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const AGENT_SUSPENDED = {
  id: "a0000000-0000-0000-0000-000000000099",
  name: "Suspended",
  type: "tool" as const,
  status: "suspended" as const,
  capabilities: [],
  rate_limit_rpm: 60,
  metadata: {},
  last_seen_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// ─── Mock API Keys ──────────────────────────────────────────────────

export const VALID_API_KEY = "mj_agent_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
export const INVALID_API_KEY = "mj_agent_0000000000000000000000000000dead";
export const WRONG_PREFIX_KEY = "wrong_prefix_a1b2c3d4e5f6a1b2c3d4e5f6";

// ─── Mock Workflow Definitions ──────────────────────────────────────

export const WORKFLOW_SIMPLE = {
  id: "w0000000-0000-0000-0000-000000000001",
  name: "Simple Workflow",
  description: "A basic two-step workflow",
  trigger_type: "manual",
  trigger_config: {},
  is_active: true,
  steps: [
    {
      id: "step-1",
      type: "agent_command",
      config: { command: "greet", payload: { message: "hello" } },
      timeout_ms: 5000,
    },
    {
      id: "step-2",
      type: "wait",
      config: { delay_ms: 100 },
    },
  ],
  created_by: "user_test",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const WORKFLOW_WITH_FAILURE = {
  id: "w0000000-0000-0000-0000-000000000002",
  name: "Failure Handling Workflow",
  trigger_type: "manual",
  trigger_config: {},
  is_active: true,
  steps: [
    {
      id: "step-fail",
      type: "agent_command",
      config: { command: "bad_cmd" },
      on_failure: "continue",
    },
    {
      id: "step-after",
      type: "wait",
      config: { delay_ms: 50 },
    },
  ],
};

export const WORKFLOW_WITH_STOP = {
  id: "w0000000-0000-0000-0000-000000000003",
  name: "Stop on Failure Workflow",
  trigger_type: "manual",
  trigger_config: {},
  is_active: true,
  steps: [
    {
      id: "step-fail",
      type: "agent_command",
      config: { command: "bad_cmd" },
      on_failure: "stop",
    },
    {
      id: "step-never",
      type: "wait",
      config: { delay_ms: 50 },
    },
  ],
};

export const WORKFLOW_WITH_TIMEOUT = {
  id: "w0000000-0000-0000-0000-000000000004",
  name: "Timeout Workflow",
  trigger_type: "manual",
  trigger_config: {},
  is_active: true,
  steps: [
    {
      id: "step-slow",
      type: "agent_command",
      config: { command: "slow_task" },
      timeout_ms: 50, // Very short timeout for testing
    },
  ],
};

export const WORKFLOW_SCHEDULED = {
  id: "w0000000-0000-0000-0000-000000000005",
  name: "Scheduled Workflow",
  trigger_type: "scheduled",
  trigger_config: { cron: "*/5 * * * *" },
  is_active: true,
  steps: [
    {
      id: "step-1",
      type: "wait",
      config: { delay_ms: 50 },
    },
  ],
};

// ─── Mock Integration Data ──────────────────────────────────────────

export const INTEGRATION_GITHUB = {
  id: "i0000000-0000-0000-0000-000000000001",
  service_name: "github",
  service_type: "oauth2",
  display_name: "GitHub",
  config: {
    client_id: "gh_client_123",
    client_secret: "gh_secret_456",
    auth_url: "https://github.com/login/oauth/authorize",
    token_url: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "user"],
    redirect_uri: "https://mejohnc.org/auth/callback",
  },
  status: "active",
  health_check_url: "https://api.github.com/rate_limit",
};

export const INTEGRATION_SLACK = {
  id: "i0000000-0000-0000-0000-000000000002",
  service_name: "slack",
  service_type: "api_key",
  display_name: "Slack",
  config: { api_key_header: "Authorization" },
  status: "active",
  health_check_url: "https://slack.com/api/auth.test",
};

// ─── Mock Credential Data ───────────────────────────────────────────

export const MOCK_ENCRYPTED_PAYLOAD = {
  ciphertext: "dGVzdF9jaXBoZXJ0ZXh0",
  iv: "dGVzdF9pdg==",
  key_id: "key-v1",
  salt: "dGVzdF9zYWx0",
  alg: "AES-256-GCM" as const,
};

export const MOCK_CREDENTIAL = {
  id: "c0000000-0000-0000-0000-000000000001",
  integration_id: INTEGRATION_GITHUB.id,
  agent_id: AGENT_OPENCLAW.id,
  credential_type: "oauth2_token",
  encrypted_data: JSON.stringify(MOCK_ENCRYPTED_PAYLOAD),
  encryption_key_id: "key-v1",
  expires_at: null,
  last_used_at: null,
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

export const MOCK_EXPIRED_CREDENTIAL = {
  ...MOCK_CREDENTIAL,
  id: "c0000000-0000-0000-0000-000000000002",
  expires_at: "2025-01-01T00:00:00Z", // Expired
};

// ─── Mock Event Data ────────────────────────────────────────────────

export const MOCK_EVENT_TYPES = [
  {
    name: "contact.created",
    display_name: "Contact Created",
    category: "crm",
    is_built_in: true,
  },
  {
    name: "workflow.completed",
    display_name: "Workflow Completed",
    category: "workflows",
    is_built_in: true,
  },
  {
    name: "agent.error",
    display_name: "Agent Error",
    category: "agents",
    is_built_in: true,
  },
];

export const MOCK_SUBSCRIPTION_WORKFLOW = {
  id: "s0000000-0000-0000-0000-000000000001",
  event_type: "contact.created",
  subscriber_type: "workflow",
  subscriber_id: WORKFLOW_SIMPLE.id,
  config: {},
  is_active: true,
};

export const MOCK_SUBSCRIPTION_INACTIVE = {
  id: "s0000000-0000-0000-0000-000000000002",
  event_type: "contact.created",
  subscriber_type: "workflow",
  subscriber_id: WORKFLOW_WITH_FAILURE.id,
  config: {},
  is_active: false,
};

// ─── Supabase Mock Client Factory ───────────────────────────────────

type MockQueryResult = { data: unknown; error: unknown };

/**
 * Creates a chainable mock Supabase client.
 * Each query chain method returns `this` so `.from().select().eq()` works.
 * Call `.mockResolve(data)` or `.mockReject(error)` on the chain to set the return.
 */
export function createMockSupabaseClient() {
  let rpcResults = new Map<string, MockQueryResult>();
  let queryResult: MockQueryResult = { data: null, error: null };

  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(queryResult)),
    maybeSingle: vi.fn(() => Promise.resolve(queryResult)),
    then: vi.fn((resolve: (v: MockQueryResult) => void) => {
      resolve(queryResult);
      return Promise.resolve(queryResult);
    }),
  };

  // Make chainable methods also act as promises (auto-resolve on await)
  const fromMock = vi.fn(() => {
    // Return a proxy that is both chainable and thenable
    const proxy = new Proxy(chainable, {
      get(target, prop) {
        if (prop === "then") {
          return (resolve: (v: MockQueryResult) => void) => {
            resolve(queryResult);
            return Promise.resolve(queryResult);
          };
        }
        return target[prop as keyof typeof target];
      },
    });
    return proxy;
  });

  const rpcMock = vi.fn((fnName: string, params?: unknown) => {
    const result = rpcResults.get(fnName) ?? { data: null, error: null };
    return Promise.resolve(result);
  });

  const client = {
    from: fromMock,
    rpc: rpcMock,

    // Test helpers
    _setQueryResult(data: unknown, error: unknown = null) {
      queryResult = { data, error };
    },
    _setRpcResult(fnName: string, data: unknown, error: unknown = null) {
      rpcResults.set(fnName, { data, error });
    },
    _reset() {
      rpcResults = new Map();
      queryResult = { data: null, error: null };
      vi.clearAllMocks();
    },
  };

  return client;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

// ─── Helper Functions ───────────────────────────────────────────────

/**
 * Assert that an audit log insert was called via rpc('log_audit_event', ...)
 */
export function expectAuditLogInserted(
  client: MockSupabaseClient,
  expectedAction: string,
) {
  const calls = client.rpc.mock.calls.filter(
    (call) => call[0] === "log_audit_event",
  );
  const match = calls.find(
    (call) => (call[1] as Record<string, unknown>)?.p_action === expectedAction,
  );
  return match !== undefined;
}

/**
 * Create a mock Request object
 */
export function createMockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://test.supabase.co/functions/v1/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Compute HMAC-SHA256 hex using Web Crypto API (Node 20+ compatible)
 */
export async function computeHmacSha256(
  secret: string,
  payload: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Mock Agent Memory Data ────────────────────────────────────────

export const MOCK_MEMORY_1 = {
  id: "m0000000-0000-0000-0000-000000000001",
  summary:
    "Command: Find contacts named Alice\nResponse: Found 3 contacts matching Alice.",
  command_text: "Find contacts named Alice",
  response_text: "Found 3 contacts matching Alice.",
  tool_names: ["search_contacts"],
  importance: 1.0,
  similarity: 0.85,
  created_at: "2026-02-28T10:00:00Z",
};

export const MOCK_MEMORY_2 = {
  id: "m0000000-0000-0000-0000-000000000002",
  summary: "Command: Send email to Bob\nResponse: Email sent successfully.",
  command_text: "Send email to Bob",
  response_text: "Email sent successfully.",
  tool_names: ["send_email"],
  importance: 1.0,
  similarity: 0.72,
  created_at: "2026-02-27T14:30:00Z",
};

export const MOCK_EMBEDDING = new Array(1536).fill(0.01);

// ─── Mock Orchestration Data (#270) ─────────────────────────────────

export const WORKFLOW_ORCHESTRATED = {
  id: "w0000000-0000-0000-0000-000000000010",
  name: "Multi-Agent Orchestration Workflow",
  description: "Fan-out to multiple agents and merge results",
  trigger_type: "manual",
  trigger_config: {},
  is_active: true,
  steps: [
    {
      id: "step-orchestrate",
      type: "orchestrator",
      config: {
        agent_ids: [AGENT_OPENCLAW.id, AGENT_DASHBOARD.id, AGENT_SUPERVISED.id],
        command: "analyze_contacts",
        strategy: "merge_all",
        payload: { query: "recent signups" },
      },
      timeout_ms: 15000,
    },
    {
      id: "step-after",
      type: "wait",
      config: { delay_ms: 50 },
    },
  ],
  created_by: "user_test",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

export const WORKFLOW_ORCHESTRATED_FIRST = {
  id: "w0000000-0000-0000-0000-000000000011",
  name: "First-Completed Orchestration",
  trigger_type: "manual",
  trigger_config: {},
  is_active: true,
  steps: [
    {
      id: "step-race",
      type: "orchestrator",
      config: {
        agent_ids: [AGENT_OPENCLAW.id, AGENT_DASHBOARD.id],
        command: "quick_lookup",
        strategy: "first_completed",
      },
      timeout_ms: 10000,
    },
  ],
};
