# Agent Development Guide

This guide explains how to build agents that interact with the MeJohnC.Org agent platform.

## Agent Types

The platform supports three agent types, each with different operational models:

### Autonomous Agents
Self-directed agents that can initiate actions without human approval. These agents run continuously and make decisions based on their programming and available data.

**Example**: OpenClaw - A CRM automation agent that monitors contact activity, enriches profiles, and triggers follow-up workflows automatically.

**Use Cases**:
- Background data processing
- Automated monitoring and alerting
- Scheduled maintenance tasks
- Reactive workflows triggered by events

### Supervised Agents
Agents that require human approval for sensitive or high-impact actions. They can analyze and recommend, but need confirmation before executing.

**Example**: An email agent that drafts responses but waits for user approval before sending.

**Use Cases**:
- Financial transactions
- External communications
- Data deletion or modification
- Integration with third-party services

### Tool Agents
Service agents that respond to requests from other agents or users. They don't initiate actions independently but provide specialized capabilities.

**Example**:
- Dashboard - Answers queries about system data and metrics
- Scheduler - Handles calendar operations and availability checks

**Use Cases**:
- Data retrieval and analysis
- Specialized computations
- Integration wrappers
- Utility services

## API Key Lifecycle

### 1. Agent Registration

First, register your agent in the `agents` table:

```sql
INSERT INTO agents (name, type, description, capabilities, status)
VALUES (
  'my-agent',
  'autonomous',
  'Automated contact enrichment agent',
  ARRAY['crm', 'research'],
  'active'
)
RETURNING id;
```

### 2. Generate API Key

Admin generates an API key for the agent:

```sql
SELECT generate_agent_api_key('agent-uuid-here');
```

This returns a plaintext key in the format `mj_agent_<32 hex chars>` (42 characters total). **This is the only time the full key is visible** - store it securely immediately.

The database stores:
- `api_key_hash`: SHA-256 hash of the full key
- `api_key_prefix`: First 16 characters (e.g., `mj_agent_a1b2c3d4`)

### 3. Key Authentication

Include the API key in every request:

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-Agent-Key': process.env.AGENT_API_KEY,
};
```

The gateway validates by hashing the provided key and comparing it to the stored hash.

### 4. Key Rotation

Rotate keys periodically or when compromised:

```sql
SELECT rotate_agent_api_key('agent-uuid-here');
```

This generates a new key and immediately invalidates the old one. The agent must update its stored key to continue operating.

### 5. Key Revocation

Revoke access completely:

```sql
SELECT revoke_agent_api_key('agent-uuid-here');
```

This clears both the hash and prefix. The agent can no longer authenticate until a new key is generated.

## Making API Calls

All agent interactions go through the API Gateway edge function at `/functions/v1/api-gateway`.

### Basic Request Structure

```typescript
const AGENT_KEY = process.env.AGENT_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

async function callGateway(
  action: string,
  params: Record<string, unknown> = {},
  correlationId?: string
) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/api-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Key': AGENT_KEY,
    },
    body: JSON.stringify({
      action,
      params,
      correlation_id: correlationId || crypto.randomUUID(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gateway error: ${error.message}`);
  }

  return response.json();
}
```

### Example API Calls

```typescript
// Query contacts
const contacts = await callGateway('query.contacts', {
  select: 'id,name,email,company',
  limit: 10,
  order: 'created_at.desc',
});

// Check agent status
const status = await callGateway('agent.status');
console.log(`Agent status: ${status.health_status}, last seen: ${status.last_seen_at}`);

// Execute a workflow
await callGateway('workflow.execute', {
  workflow_id: 'wf-uuid-here',
  trigger_type: 'manual',
  trigger_data: { contact_id: 'contact-uuid' },
});

// Create a task
const task = await callGateway('task.create', {
  title: 'Follow up with contact',
  description: 'Send proposal document',
  due_date: '2026-02-20T10:00:00Z',
  priority: 'high',
});

// Log an event
await callGateway('event.log', {
  event_type: 'contact.enriched',
  payload: {
    contact_id: 'contact-uuid',
    enriched_fields: ['company', 'title', 'location'],
  },
});
```

### Response Handling

```typescript
interface GatewayResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rate_limit?: {
    remaining: number;
    reset_at: number;
  };
}

async function safeCallGateway<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const response = await callGateway(action, params);

  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }

  // Check rate limits
  if (response.rate_limit?.remaining < 10) {
    console.warn(`Rate limit warning: ${response.rate_limit.remaining} requests remaining`);
  }

  return response.data as T;
}
```

## HMAC Command Signing

For sensitive actions, use HMAC signatures to prevent replay attacks and verify request integrity.

### Signature Format

```
X-Signature: t=<unix_timestamp>,v1=<hex_hmac>
```

**Signed payload**: `<timestamp>.<json_body>`
**Algorithm**: HMAC-SHA256
**Replay window**: 5 minutes (300 seconds)

### Implementation

```typescript
async function signRequest(body: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `t=${timestamp},v1=${hex}`;
}

// Usage
async function signedCallGateway(
  action: string,
  params: Record<string, unknown>,
  signingSecret: string
) {
  const body = JSON.stringify({ action, params });
  const signature = await signRequest(body, signingSecret);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/api-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Key': AGENT_KEY,
      'X-Signature': signature,
    },
    body,
  });

  return response.json();
}
```

### Generate Signing Secret

Admins generate signing secrets for agents:

```sql
SELECT generate_signing_secret('agent-uuid-here');
```

Returns a secret in the format `mj_sign_<64 hex chars>` (72 characters total). Store securely alongside the API key.

## Capability System

The platform uses a capability-based security model. Agents must have the required capability to perform actions.

### Available Capabilities

1. **crm** - Contact and relationship management
2. **kb** - Knowledge base and documentation
3. **video** - Video content management
4. **meta_analysis** - System analytics and insights
5. **email** - Email sending and management
6. **calendar** - Calendar and scheduling
7. **tasks** - Task creation and tracking
8. **documents** - Document processing
9. **research** - Web research and data gathering
10. **code** - Code generation and analysis
11. **data** - Data processing and transformation
12. **social** - Social media integration
13. **finance** - Financial operations
14. **automation** - Workflow automation

### Granting Capabilities

Capabilities are granted via the `agent_skills` table with proficiency scores (0-100):

```sql
INSERT INTO agent_skills (agent_id, capability, proficiency_score)
VALUES
  ('agent-uuid', 'crm', 95),
  ('agent-uuid', 'email', 80),
  ('agent-uuid', 'research', 70);
```

Skills automatically sync to the `agents.capabilities` array via database triggers.

### Checking Capabilities

```sql
-- Check if agent can perform a skill
SELECT can_agent_perform_skill('agent-uuid', 'crm');

-- Find the best agent for a skill
SELECT * FROM get_best_agent_for_skill('email');

-- Get all agents with a capability
SELECT a.name, s.proficiency_score
FROM agents a
JOIN agent_skills s ON s.agent_id = a.id
WHERE s.capability = 'crm'
ORDER BY s.proficiency_score DESC;
```

### Action-Capability Mapping

Each API action requires specific capabilities:

- `query.contacts`, `contact.create`, `contact.update` → requires **crm**
- `email.send`, `email.draft` → requires **email**
- `task.create`, `task.complete` → requires **tasks**
- `workflow.execute` → requires **automation**
- `agent.status`, `event.log` → no capability required (system actions)

## Event Subscriptions

Agents can subscribe to events for reactive behavior.

### Event Types

**Contact Events**: `contact.created`, `contact.updated`, `contact.deleted`
**Task Events**: `task.created`, `task.completed`, `task.overdue`
**Workflow Events**: `workflow.started`, `workflow.completed`, `workflow.failed`
**Agent Events**: `agent.registered`, `agent.status_changed`, `agent.error`
**Integration Events**: `integration.connected`, `integration.disconnected`, `integration.error`

### Subscribe a Workflow

```sql
INSERT INTO event_subscriptions (
  event_type,
  subscriber_type,
  subscriber_id,
  is_active,
  filter_conditions
)
VALUES (
  'contact.created',
  'workflow',
  'workflow-uuid',
  true,
  '{"tags": ["lead", "hot"]}'::jsonb
);
```

### Subscribe an Agent

```sql
INSERT INTO event_subscriptions (
  event_type,
  subscriber_type,
  subscriber_id,
  is_active
)
VALUES (
  'task.overdue',
  'agent',
  'agent-uuid',
  true
);
```

When subscribed events occur, the platform triggers the workflow or notifies the agent via webhook (if configured).

## Best Practices

### Security
- Store API keys in environment variables, never in code or version control
- Rotate keys every 90 days or immediately if compromised
- Use HMAC signing for all actions that modify data
- Validate all user inputs before passing to API
- Implement least-privilege: only request capabilities you need

### Reliability
- Always include `correlation_id` in gateway calls for request tracing
- Implement exponential backoff for retries: 1s, 2s, 4s, 8s, capped at 10s
- Handle rate limits gracefully (check `X-RateLimit-Remaining` header)
- Log all API errors with correlation IDs for debugging
- Set reasonable timeouts (30s for queries, 120s for long operations)

### Monitoring
- Track agent health via `last_seen_at` and `health_status` fields
- Send periodic heartbeats using `agent.status` action
- Monitor error rates in the `audit_log` table
- Set up alerts for failed workflows or capability errors
- Review `agent_analytics` for performance metrics

### Performance
- Batch operations when possible (e.g., bulk contact updates)
- Use pagination for large datasets (limit + offset or cursor)
- Cache frequently accessed data (with appropriate TTL)
- Avoid polling - use event subscriptions instead
- Profile slow operations and optimize queries

### Example Agent Structure

```typescript
class MyAgent {
  private apiKey: string;
  private gatewayUrl: string;
  private correlationId: string;

  constructor() {
    this.apiKey = process.env.AGENT_API_KEY!;
    this.gatewayUrl = `${process.env.SUPABASE_URL}/functions/v1/api-gateway`;
    this.correlationId = crypto.randomUUID();
  }

  async initialize() {
    // Send heartbeat on startup
    await this.callGateway('agent.status');
    console.log('Agent initialized');
  }

  async callGateway(action: string, params: Record<string, unknown> = {}) {
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Key': this.apiKey,
      },
      body: JSON.stringify({
        action,
        params,
        correlation_id: this.correlationId,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(`API error: ${data.error}`);
    }
    return data.data;
  }

  async processContacts() {
    const contacts = await this.callGateway('query.contacts', {
      select: 'id,name,email',
      limit: 50,
    });

    for (const contact of contacts) {
      await this.enrichContact(contact);
    }
  }

  async enrichContact(contact: { id: string; name: string }) {
    // Agent logic here
    console.log(`Processing ${contact.name}`);
  }
}

// Run agent
const agent = new MyAgent();
await agent.initialize();
await agent.processContacts();
```

## Next Steps

- Review the [Platform Architecture](./platform-architecture.md) for system design
- See [Workflow Development](./workflow-development.md) for building workflows
- Check [API Reference](./api-reference.md) for complete action list
- Explore example agents in the `/examples/agents/` directory
