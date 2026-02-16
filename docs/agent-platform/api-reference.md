# Agent Platform API Reference

Complete API reference for the MeJohnC.Org Agent Platform. All endpoints are Supabase Edge Functions deployed at `https://<project-ref>.supabase.co/functions/v1/`.

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Codes](#error-codes)
- [Edge Functions](#edge-functions)
  - [Agent Auth](#post-functionsv1agent-auth)
  - [API Gateway](#post-functionsv1api-gateway)
  - [Workflow Executor](#post-functionsv1workflow-executor)
  - [Integration Credentials](#post-functionsv1integration-credentials)
  - [Integration Auth](#post-functionsv1integration-auth)
  - [Webhook Receiver](#post-functionsv1webhook-receiver)
  - [Integration Health](#post-functionsv1integration-health)
- [Gateway Actions](#gateway-actions)

---

## Authentication

All agent-facing endpoints require authentication via API key in the request header:

```http
X-Agent-Key: mj_agent_<32 hex characters>
```

### Key Format

- Prefix: `mj_agent_`
- Key body: 32 hexadecimal characters (128 bits)
- Example: `mj_agent_a1b2c3d4e5f67890abcdef1234567890`

### Verification Process

API keys are verified using the `verify_agent_api_key()` database function:

1. Key is hashed using SHA-256
2. Hash is looked up in `agent_platform.agents` table
3. Agent must have `status = 'active'` to authenticate
4. Rate limit configuration is loaded from agent record

### Suspended Agents

Agents with `status = 'suspended'` will receive a `401 Unauthorized` error with message:

```json
{
  "error": "Agent suspended",
  "correlationId": "req_..."
}
```

---

## Rate Limiting

Rate limits are enforced per-agent based on the `rate_limit_rpm` field in the agent configuration. The platform uses a sliding window algorithm with Redis.

### Response Headers

All authenticated requests include rate limit headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests per minute for this agent | `60` |
| `X-RateLimit-Remaining` | Remaining requests in current window | `42` |
| `X-RateLimit-Reset` | Unix timestamp when the window resets | `1708123456` |

### Rate Limit Exceeded

When rate limit is exceeded, the API returns `429 Too Many Requests`:

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 15,
  "correlationId": "req_..."
}
```

Additional header:

```http
Retry-After: 15
```

Value is in seconds until the next request can be made.

---

## Error Codes

Standard HTTP status codes with consistent JSON error responses.

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `400` | Bad Request | Validation error, unknown action, invalid JSON, missing required parameters |
| `401` | Unauthorized | Missing API key, invalid API key, suspended agent, HMAC signature verification failure |
| `403` | Forbidden | Agent lacks required capability for the requested action |
| `404` | Not Found | Workflow not found, credential not found, resource does not exist |
| `405` | Method Not Allowed | Non-POST request to POST-only endpoint |
| `410` | Gone | Credential expired (check `expires_at` timestamp) |
| `429` | Too Many Requests | Rate limit exceeded (see `Retry-After` header) |
| `500` | Internal Server Error | Database error, unexpected exception, runtime failure |
| `502` | Bad Gateway | OAuth2 token exchange failed, OAuth2 refresh failed, external API error |

### Error Response Format

All errors return JSON with this structure:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional)",
  "correlationId": "req_abc123def456"
}
```

The `correlationId` is included in all responses and logged in `agent_platform.audit_log` for tracing.

---

## Edge Functions

### POST /functions/v1/agent-auth

Authenticate an agent and retrieve its configuration and capabilities.

#### Headers

```http
X-Agent-Key: mj_agent_<key>
```

#### Request Body

None (empty POST or `{}`)

#### Response: 200 OK

```json
{
  "authenticated": true,
  "agent": {
    "id": "01234567-89ab-cdef-0123-456789abcdef",
    "name": "My Research Agent",
    "type": "research",
    "capabilities": ["research.web_search", "research.summarize", "kb.search"],
    "metadata": {
      "created_by": "user@example.com",
      "environment": "production"
    }
  },
  "rateLimit": {
    "limit": 60,
    "remaining": 59,
    "reset": 1708123456
  },
  "correlationId": "req_abc123"
}
```

#### Use Cases

- Verifying API key validity
- Retrieving agent capabilities before making requests
- Health checks and monitoring

---

### POST /functions/v1/api-gateway

Main entrypoint for all agent actions. Routes requests to appropriate handlers based on action type.

#### Headers

```http
X-Agent-Key: mj_agent_<key>
X-Signature: sha256=<hmac_hex> (optional, for webhook-triggered requests)
```

#### Request Body

```json
{
  "action": "kb.search",
  "params": {
    "query": "agent platform architecture",
    "limit": 10,
    "filters": {
      "category": "technical"
    }
  },
  "correlation_id": "client_trace_123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | Action identifier (see [Gateway Actions](#gateway-actions)) |
| `params` | object | No | Action-specific parameters |
| `correlation_id` | string | No | Client-provided trace ID (max 255 chars) |

#### Response: 200 OK

```json
{
  "request_id": "req_abc123",
  "status": "success",
  "data": {
    "results": [
      {
        "id": "doc_123",
        "title": "Agent Platform Architecture",
        "score": 0.92,
        "content": "..."
      }
    ],
    "total": 1
  },
  "meta": {
    "agent_id": "01234567-89ab-cdef-0123-456789abcdef",
    "action": "kb.search",
    "duration_ms": 245,
    "rate_limit": {
      "remaining": 58,
      "reset": 1708123456
    }
  }
}
```

#### Response: 200 OK (Error Case)

For application-level errors, the gateway returns 200 with `status: "error"`:

```json
{
  "request_id": "req_abc123",
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query parameter is required"
  },
  "meta": {
    "agent_id": "...",
    "action": "kb.search",
    "duration_ms": 12
  }
}
```

#### HMAC Signature Verification

For webhook-triggered requests, the gateway can verify HMAC signatures:

```http
X-Signature: sha256=a1b2c3d4e5f6...
```

Signature is computed as:

```
HMAC-SHA256(body, agent_api_key)
```

If signature is invalid, returns `401 Unauthorized`.

---

### POST /functions/v1/workflow-executor

Execute a workflow with multiple steps, conditionals, and retry logic.

#### Headers

```http
X-Agent-Key: mj_agent_<key>
```

OR (for scheduled/event triggers):

```http
x-scheduler-secret: <SCHEDULER_SECRET>
```

#### Request Body

```json
{
  "workflow_id": "wf_01234567-89ab-cdef-0123-456789abcdef",
  "trigger_type": "manual",
  "trigger_data": {
    "user_id": "user_123",
    "context": "admin dashboard"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflow_id` | string | Yes | UUID of the workflow to execute |
| `trigger_type` | string | Yes | One of: `manual`, `scheduled`, `webhook`, `event` |
| `trigger_data` | object | No | Context data for the workflow execution |

#### Workflow Step Types

Each workflow consists of ordered steps with these types:

**agent_command**
```json
{
  "type": "agent_command",
  "action": "kb.search",
  "params": {
    "query": "{{ trigger.data.query }}"
  },
  "config": {
    "timeout_ms": 5000,
    "retries": 3,
    "on_failure": "continue"
  }
}
```

**wait**
```json
{
  "type": "wait",
  "duration_ms": 2000
}
```

**condition**
```json
{
  "type": "condition",
  "expression": "{{ steps.search.results.length }} > 0",
  "then_step": 3,
  "else_step": 5
}
```

#### Step Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout_ms` | number | 30000 | Maximum execution time for this step |
| `retries` | number | 0 | Number of retry attempts on failure |
| `on_failure` | string | `stop` | Behavior on failure: `continue`, `stop`, `skip` |

#### Response: 200 OK

```json
{
  "run_id": "run_01234567-89ab-cdef-0123-456789abcdef",
  "status": "completed",
  "steps_executed": 5,
  "step_results": [
    {
      "step": 1,
      "action": "kb.search",
      "status": "success",
      "duration_ms": 234,
      "output": { "results": [...] }
    },
    {
      "step": 2,
      "action": "email.send",
      "status": "success",
      "duration_ms": 156,
      "output": { "message_id": "msg_123" }
    }
  ],
  "duration_ms": 512,
  "correlationId": "req_abc123"
}
```

#### Response: 200 OK (Failed Workflow)

```json
{
  "run_id": "run_...",
  "status": "failed",
  "steps_executed": 2,
  "step_results": [
    {
      "step": 1,
      "action": "kb.search",
      "status": "success",
      "duration_ms": 234,
      "output": { "results": [...] }
    },
    {
      "step": 2,
      "action": "email.send",
      "status": "failed",
      "duration_ms": 89,
      "error": "SMTP connection timeout",
      "retries_attempted": 3
    }
  ],
  "duration_ms": 1456,
  "correlationId": "req_abc123"
}
```

---

### POST /functions/v1/integration-credentials

Manage OAuth tokens, API keys, and other credentials for third-party integrations.

#### Headers

```http
X-Agent-Key: mj_agent_<key>
```

#### Actions

The endpoint supports four actions via the `action` field.

---

#### Action: store

Store new credentials for an integration.

```json
{
  "action": "store",
  "integration_id": "github",
  "credential_type": "oauth2_token",
  "credentials": {
    "access_token": "gho_...",
    "refresh_token": "ghr_...",
    "token_type": "bearer",
    "scope": "repo,user"
  },
  "expires_at": "2026-02-16T12:00:00Z"
}
```

**Credential Types:**
- `oauth2_token` - OAuth 2.0 access/refresh tokens
- `api_key` - Static API keys
- `service_account` - Service account credentials (JSON)
- `custom` - Custom credential format

**Response:**
```json
{
  "credential_id": "cred_01234567-89ab-cdef-0123-456789abcdef",
  "integration_id": "github",
  "created_at": "2026-02-16T10:30:00Z",
  "expires_at": "2026-02-16T12:00:00Z"
}
```

---

#### Action: retrieve

Retrieve stored credentials by ID.

```json
{
  "action": "retrieve",
  "credential_id": "cred_01234567-89ab-cdef-0123-456789abcdef"
}
```

**Response:**
```json
{
  "credential_id": "cred_...",
  "integration_id": "github",
  "credential_type": "oauth2_token",
  "credentials": {
    "access_token": "gho_...",
    "refresh_token": "ghr_...",
    "token_type": "bearer",
    "scope": "repo,user"
  },
  "expires_at": "2026-02-16T12:00:00Z",
  "created_at": "2026-02-16T10:30:00Z"
}
```

**Error: 410 Gone**

If the credential has expired:

```json
{
  "error": "Credential expired",
  "expired_at": "2026-02-16T12:00:00Z",
  "correlationId": "req_abc123"
}
```

---

#### Action: delete

Delete stored credentials.

```json
{
  "action": "delete",
  "credential_id": "cred_01234567-89ab-cdef-0123-456789abcdef"
}
```

**Response:**
```json
{
  "deleted": true,
  "credential_id": "cred_..."
}
```

---

#### Action: list

List all credentials for an agent, optionally filtered by integration.

```json
{
  "action": "list",
  "integration_id": "github"
}
```

**Response:**
```json
{
  "credentials": [
    {
      "credential_id": "cred_...",
      "integration_id": "github",
      "credential_type": "oauth2_token",
      "created_at": "2026-02-16T10:30:00Z",
      "expires_at": "2026-02-16T12:00:00Z",
      "is_expired": false
    }
  ],
  "total": 1
}
```

---

### POST /functions/v1/integration-auth

Handle OAuth 2.0 flows for third-party integrations.

#### Headers

```http
X-Agent-Key: mj_agent_<key>
```

#### Actions

---

#### Action: initiate

Start OAuth flow and get authorization URL.

```json
{
  "action": "initiate",
  "integration_id": "github",
  "scopes": ["repo", "user"]
}
```

**Response:**
```json
{
  "auth_url": "https://github.com/login/oauth/authorize?client_id=...&state=...",
  "state": "state_abc123def456",
  "expires_in": 600
}
```

The `state` parameter is stored in the database and must be provided in the callback.

---

#### Action: callback

Complete OAuth flow after user authorization.

```json
{
  "action": "callback",
  "integration_id": "github",
  "code": "authorization_code_from_github"
}
```

**Response:**
```json
{
  "credential_id": "cred_01234567-89ab-cdef-0123-456789abcdef",
  "token_type": "bearer",
  "expires_at": "2026-02-16T12:00:00Z",
  "has_refresh_token": true,
  "scopes": ["repo", "user"]
}
```

**Error: 502 Bad Gateway**

If token exchange fails:

```json
{
  "error": "OAuth token exchange failed",
  "details": "Invalid authorization code",
  "correlationId": "req_abc123"
}
```

---

#### Action: refresh

Refresh an expired OAuth token using refresh token.

```json
{
  "action": "refresh",
  "credential_id": "cred_01234567-89ab-cdef-0123-456789abcdef"
}
```

**Response:**
```json
{
  "credential_id": "cred_...",
  "token_type": "bearer",
  "expires_at": "2026-02-16T14:00:00Z",
  "refreshed": true
}
```

**Error: 502 Bad Gateway**

If refresh fails:

```json
{
  "error": "OAuth token refresh failed",
  "details": "Refresh token revoked",
  "correlationId": "req_abc123"
}
```

---

### POST /functions/v1/webhook-receiver

Receive webhooks from external services and trigger workflows.

#### Headers

None required. External services authenticate via webhook secret/signature.

#### Request Body

```json
{
  "webhook_id": "wh_github_push",
  "repository": "mejohnc/agent-platform",
  "ref": "refs/heads/main",
  "commits": [...]
}
```

The `webhook_id` is required and must match a registered webhook in `agent_platform.webhooks`.

#### Signature Verification

The endpoint supports multiple signature formats:

**HMAC-SHA256** (header: `X-Webhook-Signature`)
```
sha256=a1b2c3d4e5f6...
```

**Stripe** (header: `Stripe-Signature`)
```
t=1234567890,v1=a1b2c3d4e5f6...,v0=...
```

**GitHub** (header: `X-Hub-Signature-256`)
```
sha256=a1b2c3d4e5f6...
```

If signature verification fails, returns `401 Unauthorized`.

#### Response: 200 OK

```json
{
  "received": true,
  "webhook_id": "wh_github_push",
  "workflow_id": "wf_...",
  "run_id": "run_...",
  "correlationId": "req_abc123"
}
```

If no workflow is configured for this webhook:

```json
{
  "received": true,
  "webhook_id": "wh_github_push",
  "workflow_id": null,
  "correlationId": "req_abc123"
}
```

---

### POST /functions/v1/integration-health

Automated health check for all integrations. Called hourly by pg_cron.

#### Headers

```http
x-scheduler-secret: <SCHEDULER_SECRET>
```

This endpoint is NOT accessible via agent API keys.

#### Request Body

None (empty POST or `{}`)

#### Response: 200 OK

```json
{
  "checked": 12,
  "healthy": 10,
  "unhealthy": 2,
  "status_changes": 1,
  "results": [
    {
      "integration_id": "github",
      "status": "healthy",
      "last_check": "2026-02-16T11:00:00Z",
      "response_time_ms": 234
    },
    {
      "integration_id": "stripe",
      "status": "degraded",
      "last_check": "2026-02-16T11:00:00Z",
      "response_time_ms": 1456,
      "error": "High latency"
    }
  ],
  "duration_ms": 3456
}
```

**Status Values:**
- `healthy` - Integration responding normally
- `degraded` - High latency or intermittent errors
- `unhealthy` - Failing health checks

---

## Gateway Actions

The API Gateway (`/functions/v1/api-gateway`) supports 41 actions across 11 capability domains. Each action requires specific capabilities assigned to the agent.

### Capability: crm

**query.contacts**
```json
{
  "action": "query.contacts",
  "params": {
    "filters": { "status": "active" },
    "limit": 50,
    "offset": 0
  }
}
```

**query.deals**
```json
{
  "action": "query.deals",
  "params": {
    "filters": { "stage": "negotiation" },
    "sort": "value DESC"
  }
}
```

**query.interactions**
```json
{
  "action": "query.interactions",
  "params": {
    "contact_id": "contact_123",
    "since": "2026-01-01T00:00:00Z"
  }
}
```

**crm.create_contact**
```json
{
  "action": "crm.create_contact",
  "params": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Acme Corp"
  }
}
```

**crm.update_contact**
```json
{
  "action": "crm.update_contact",
  "params": {
    "contact_id": "contact_123",
    "fields": { "status": "customer" }
  }
}
```

**crm.search**
```json
{
  "action": "crm.search",
  "params": {
    "query": "acme",
    "types": ["contacts", "deals"]
  }
}
```

### Capability: kb

**kb.search**
```json
{
  "action": "kb.search",
  "params": {
    "query": "agent platform architecture",
    "limit": 10
  }
}
```

**kb.ingest**
```json
{
  "action": "kb.ingest",
  "params": {
    "content": "Agent Platform enables...",
    "metadata": { "source": "docs", "category": "technical" }
  }
}
```

**kb.summarize**
```json
{
  "action": "kb.summarize",
  "params": {
    "document_id": "doc_123",
    "max_length": 500
  }
}
```

### Capability: video

**video.transcode**
```json
{
  "action": "video.transcode",
  "params": {
    "source_url": "https://...",
    "format": "mp4",
    "resolution": "1080p"
  }
}
```

**video.analyze**
```json
{
  "action": "video.analyze",
  "params": {
    "video_id": "video_123",
    "features": ["transcription", "sentiment", "topics"]
  }
}
```

### Capability: analysis

**analysis.cross_domain**
**analysis.patterns**
**analysis.report**

### Capability: email

**email.send**
**email.draft**
**email.search**

### Capability: calendar

**calendar.create_event**
**calendar.list_events**
**calendar.check_availability**

### Capability: tasks

**tasks.create**
**tasks.update**
**tasks.list**
**tasks.complete**

### Capability: documents

**documents.create**
**documents.edit**
**documents.search**

### Capability: research

**research.web_search**
**research.summarize**
**research.gather**

### Capability: code

**code.generate**
**code.review**
**code.deploy**

### Capability: data

**data.transform**
**data.query**
**data.export**

### Capability: social

**social.post**
**social.schedule**
**social.analytics**

### Capability: finance

**finance.invoice**
**finance.report**
**finance.payment**

### Capability: automation

**automation.trigger**
**automation.schedule**

### No Capability Required

**agent.status** - Get current agent status
**agent.capabilities** - List agent capabilities
**workflow.execute** - Execute a workflow
**workflow.status** - Get workflow execution status
**integration.status** - Get integration status

---

## Response Metadata

All gateway responses include a `meta` object with execution details:

```json
{
  "meta": {
    "agent_id": "01234567-89ab-cdef-0123-456789abcdef",
    "action": "kb.search",
    "duration_ms": 245,
    "rate_limit": {
      "remaining": 58,
      "reset": 1708123456
    }
  }
}
```

---

## Audit Logging

All requests are logged to `agent_platform.audit_log` with:

- `agent_id` - Agent that made the request
- `action` - Action that was performed
- `ip_address` - Request origin IP
- `correlation_id` - Request trace ID
- `request_payload` - Full request body
- `response_status` - HTTP status code
- `error_message` - Error details (if any)
- `duration_ms` - Request duration

Logs are retained for 90 days and can be queried via the admin dashboard.

---

## Best Practices

1. **Use correlation IDs** for distributed tracing across multiple requests
2. **Handle rate limits** gracefully with exponential backoff
3. **Store credentials** using the integration-credentials endpoint, never in code
4. **Verify HMAC signatures** for webhook-triggered requests
5. **Set appropriate timeouts** in workflow steps to prevent hanging
6. **Use workflow retries** for transient failures
7. **Monitor audit logs** for security and debugging

---

## Support

For API issues or questions:
- GitHub: https://github.com/mejohnc/agent-platform
- Email: support@mejohnc.org
- Docs: https://mejohnc.org/docs/agent-platform
