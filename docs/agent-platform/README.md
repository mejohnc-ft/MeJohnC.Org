# Agent Platform

A production-ready, Supabase-based multi-agent system with workflow orchestration, integration management, capability-based access control, and event-driven architecture.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Inventory](#component-inventory)
- [Security Model](#security-model)
- [Database Schema](#database-schema)
- [Edge Functions](#edge-functions)
- [Shared Utilities](#shared-utilities)
- [Database Migrations](#database-migrations)
- [Seed Data](#seed-data)
- [Getting Started](#getting-started)
- [Documentation Index](#documentation-index)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                              │
│  HTTP Requests (REST/GraphQL) + WebSocket (real-time subscriptions) │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             v
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                  │
│  Route: /functions/v1/api-gateway                                   │
│  - Request routing & validation                                     │
│  - API key authentication                                           │
│  - Rate limiting (per-agent configurable RPM)                       │
│  - Optional HMAC-SHA256 signature verification                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             v
┌─────────────────────────────────────────────────────────────────────┐
│                     CAPABILITY AUTHORIZATION                         │
│  - Action → Capability mapping (41 actions → 14 capabilities)       │
│  - Agent skill verification via agent_skills table                  │
│  - Audit logging of all authorized actions                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┬────────────────┐
            v                v                v                v
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ workflow-    │ │ query-       │ │ agent-       │ │ integration- │
  │ executor     │ │ engine       │ │ command      │ │ credentials  │
  │              │ │              │ │              │ │              │
  │ Run workflows│ │ Query DB     │ │ Execute cmds │ │ Manage creds │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
            │                │                │                │
            └────────────────┴────────────────┴────────────────┘
                             │
                             v
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  - PostgreSQL with Row-Level Security                               │
│  - AES-256-GCM encrypted credentials                                │
│  - Partitioned audit log (monthly)                                  │
│  - Full-text search indexes                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT BUS FLOW                               │
│                                                                      │
│  emit_event(type, payload)                                          │
│         │                                                            │
│         v                                                            │
│  events table (INSERT)                                              │
│         │                                                            │
│         v                                                            │
│  event_subscriptions (WHERE event_type = type AND active = true)   │
│         │                                                            │
│         v                                                            │
│  pg_net.http_post(webhook_url, payload)  [async dispatch]          │
│         │                                                            │
│         v                                                            │
│  webhook-receiver (Edge Function) → Agent handler                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      SCHEDULING LAYER                                │
│                                                                      │
│  pg_cron job (every minute)                                         │
│         │                                                            │
│         v                                                            │
│  check_due_workflows() → scheduled_workflow_runs                    │
│         │                                                            │
│         v                                                            │
│  emit_event('workflow.scheduled', {workflow_id, agent_id})          │
│         │                                                            │
│         v                                                            │
│  workflow-executor (via event subscription)                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Inventory

| Component Type | Count | Names |
|---------------|-------|-------|
| **Edge Functions** | 7 | agent-auth, integration-auth, integration-credentials, workflow-executor, api-gateway, webhook-receiver, integration-health |
| **Shared Utilities** | 7 | agent-auth.ts, capabilities.ts, command-signing.ts, encryption.ts, rate-limiter.ts, logger.ts, input-validator.ts |
| **Database Tables** | 13 | agents, workflows, workflow_runs, integrations, integration_credentials, agent_integrations, audit_log (partitioned), scheduled_workflow_runs, capability_definitions, agent_skills, event_types, event_subscriptions, events |
| **Database Functions** | 20 | API key management (4), audit logging (1), event bus (1), scheduling (3), capabilities (5), signing secrets (3), utility functions (3) |
| **Migrations** | 3 | Core tables, Scheduler, Phase 4 (capabilities + events) |
| **Default Agents** | 3 | OpenClaw, Dashboard, Scheduler |
| **Capability Definitions** | 14 | Across 6 categories (workflow, integration, data, agent, event, system) |
| **Built-in Event Types** | 15 | Across 5 categories (workflow, integration, agent, data, system) |

## Security Model

### Authentication
- API key-based authentication with `mj_agent_` prefix
- Keys are SHA-256 hashed before storage (never stored in plaintext)
- Automatic expiration support with configurable TTL
- Key rotation and revocation with audit trail

### Authorization
- Capability-based access control (CBAC)
- 41 platform actions mapped to 14 granular capabilities
- Per-agent skill assignment via `agent_skills` table
- Runtime capability checks on every request

### Encryption
- Integration credentials encrypted with AES-256-GCM
- PBKDF2 key derivation from Supabase service role key (100,000 iterations)
- Unique IV per credential, authenticated encryption (tag verification)
- Encryption keys never leave the edge function runtime

### Rate Limiting
- Per-agent configurable rate limits (requests per minute)
- Sliding window algorithm with Redis-like in-memory state
- 429 Too Many Requests response with Retry-After header
- Automatic cleanup of expired rate limit entries

### Command Signing (Optional)
- HMAC-SHA256 signature verification for high-security operations
- Per-agent signing secrets with automatic rotation
- 5-minute replay window to prevent replay attacks
- Nonce tracking to prevent duplicate command execution

### Database Security
- Row-Level Security (RLS) enabled on all tables
- Service role access for edge functions, anon role restrictions for clients
- Partitioned audit log for performance and compliance
- Prepared statements and parameterized queries throughout

## Database Schema

### Core Tables

**agents**
- Primary entity for autonomous or tool agents
- API key management (hash storage, expiration, rotation)
- Rate limiting configuration
- Status tracking (active, suspended, archived)

**workflows**
- Workflow definitions with JSON-based step configuration
- Agent ownership and scheduling rules (cron expressions)
- Integration dependencies tracking
- Version control and metadata

**workflow_runs**
- Execution history with detailed step results
- Status tracking (pending, running, completed, failed)
- Retry count and error logging
- Performance metrics (execution time)

**integrations**
- Third-party service definitions
- Auth method configuration (oauth2, api_key, basic)
- Health check endpoints
- Rate limiting per integration

**integration_credentials**
- Encrypted credential storage (AES-256-GCM)
- Per-agent credential isolation
- Expiration and auto-refresh support
- Encryption metadata (IV, tag, algorithm)

**agent_integrations**
- Many-to-many relationship between agents and integrations
- Per-agent credential references
- Usage tracking and status

**audit_log** (Partitioned by month)
- Comprehensive audit trail for all platform operations
- Action-level logging with before/after state
- IP address and user agent tracking
- Fast querying with partitioning and indexes

**scheduled_workflow_runs**
- Cron-based workflow scheduling
- Next run calculation and execution tracking
- Automatic rescheduling after execution
- Timezone support (UTC)

### Capability System (Phase 4)

**capability_definitions**
- 14 predefined capabilities across 6 categories
- Action mappings (which actions require which capability)
- Category grouping for UI and reporting

**agent_skills**
- Per-agent capability assignments
- Granted by and grant date tracking
- Notes for audit and documentation

### Event Bus (Phase 4)

**event_types**
- 15 built-in event types across 5 categories
- Schema definitions for event payloads
- Subscription rules and rate limits

**event_subscriptions**
- Agent subscriptions to event types
- Webhook URL for event delivery
- Filter conditions and retry configuration

**events**
- Event history with full payload
- Processing status and retry tracking
- Delivered-to agent tracking

## Edge Functions

### agent-auth
Manages agent authentication and API key lifecycle.
- Generate new API keys with SHA-256 hashing
- Verify API keys on incoming requests
- Rotate keys with grace period support
- Revoke keys with audit logging

### integration-auth
Handles OAuth2 and API key authentication flows for integrations.
- OAuth2 authorization code and PKCE flows
- Token refresh and expiration handling
- Integration health checks
- Credential validation

### integration-credentials
Securely manages encrypted integration credentials.
- Store credentials with AES-256-GCM encryption
- Retrieve and decrypt for agent use
- Update and rotate credentials
- Delete with audit trail

### workflow-executor
Executes workflow definitions with step-by-step orchestration.
- Parse and validate workflow JSON
- Execute steps sequentially or in parallel
- Handle retries and error recovery
- Log execution history to workflow_runs

### api-gateway
Main entry point for all agent API requests.
- Route requests to appropriate handlers
- API key authentication and rate limiting
- Capability authorization checks
- Request/response logging and metrics

### webhook-receiver
Receives and processes incoming webhooks from integrations.
- Signature verification for supported providers
- Event payload validation
- Async dispatch to agent handlers
- Retry logic for failed deliveries

### integration-health
Monitors integration availability and performance.
- Scheduled health checks via pg_cron
- Status updates to integrations table
- Alert generation for failures
- Performance metrics collection

## Shared Utilities

### agent-auth.ts
API key generation, verification, and rotation utilities.
Functions: `generateApiKey()`, `hashApiKey()`, `verifyApiKey()`, `rotateApiKey()`

### capabilities.ts
Capability-based access control logic.
Functions: `actionToCapability()`, `canAgentPerformAction()`, `getAgentCapabilities()`

### command-signing.ts
HMAC-SHA256 signature generation and verification.
Functions: `generateSignature()`, `verifySignature()`, `checkReplayWindow()`

### encryption.ts
AES-256-GCM encryption for sensitive data.
Functions: `encrypt()`, `decrypt()`, `deriveKey()`, `generateIV()`

### rate-limiter.ts
Sliding window rate limiting implementation.
Functions: `checkRateLimit()`, `recordRequest()`, `getRemainingRequests()`

### logger.ts
Structured logging with correlation IDs.
Functions: `log()`, `logError()`, `logAudit()`, `withContext()`

### input-validator.ts
Request validation and sanitization.
Functions: `validateWorkflowPayload()`, `sanitizeInput()`, `validateCronExpression()`

## Database Migrations

### 1. 20240601000004_agent_platform.sql
Core platform tables and foundational infrastructure.

**Tables Created:**
- agents, workflows, workflow_runs
- integrations, integration_credentials, agent_integrations
- audit_log (with monthly partitioning)

**Functions Created:**
- `generate_agent_api_key()` - Create new API key with hash
- `verify_agent_api_key()` - Validate API key and check expiration
- `rotate_agent_api_key()` - Rotate key with grace period
- `revoke_agent_api_key()` - Revoke key with audit
- `log_audit_event()` - Insert audit log entry

**Indexes & Performance:**
- Full-text search on workflows and agents
- Composite indexes for common queries
- Partition pruning for audit log

### 2. 20240601000005_scheduler.sql
Workflow scheduling with cron expressions and pg_cron integration.

**Tables Created:**
- scheduled_workflow_runs

**Functions Created:**
- `check_due_workflows()` - Find workflows due for execution
- `cron_matches_now()` - Evaluate cron expressions against current time
- `schedule_workflow()` - Create scheduled workflow run

**Cron Jobs:**
- Workflow scheduler (every minute)
- Audit log partition maintenance (daily)

### 3. 20240601000006_phase4.sql
Advanced features: capability system, event bus, and signing secrets.

**Tables Created:**
- capability_definitions, agent_skills
- event_types, event_subscriptions, events

**Functions Created:**
- `get_agent_skills()` - Retrieve agent capabilities
- `get_skill_agents()` - Find agents with specific capability
- `get_best_agent_for_skill()` - Agent selection by capability
- `can_agent_perform_skill()` - Runtime capability check
- `emit_event()` - Publish event to event bus
- `generate_signing_secret()` - Create HMAC signing secret
- `rotate_signing_secret()` - Rotate signing secret
- `revoke_signing_secret()` - Revoke signing secret

**Indexes:**
- Event type and subscription lookups
- Capability and skill queries
- Signing secret hash lookups

## Seed Data

### Default Agents

**OpenClaw** (Autonomous Agent)
- Primary autonomous agent for CRM, email, and task management
- Full capability set (all 14 capabilities)
- 60 RPM rate limit
- Active status

**Dashboard** (Tool Agent)
- Data analysis and documentation tool
- Limited capabilities: data_read, data_query, workflow_read
- 120 RPM rate limit
- Active status

**Scheduler** (Tool Agent)
- Calendar and task automation
- Capabilities: workflow_execute, integration_execute, event_subscribe
- 30 RPM rate limit
- Active status

### Capability Definitions (14 total)

**Workflow Management (3):**
- workflow_execute, workflow_manage, workflow_read

**Integration Management (3):**
- integration_execute, integration_manage, integration_read

**Data Access (3):**
- data_read, data_write, data_query

**Agent Management (2):**
- agent_manage, agent_impersonate

**Event Bus (2):**
- event_publish, event_subscribe

**System Administration (1):**
- system_admin

### Built-in Event Types (15 total)

**Workflow Events (4):**
- workflow.started, workflow.completed, workflow.failed, workflow.scheduled

**Integration Events (3):**
- integration.connected, integration.disconnected, integration.error

**Agent Events (3):**
- agent.created, agent.updated, agent.suspended

**Data Events (3):**
- data.created, data.updated, data.deleted

**System Events (2):**
- system.error, system.maintenance

## Getting Started

1. Run migrations in order:
   ```bash
   supabase migration up 20240601000004_agent_platform.sql
   supabase migration up 20240601000005_scheduler.sql
   supabase migration up 20240601000006_phase4.sql
   ```

2. Deploy edge functions:
   ```bash
   supabase functions deploy agent-auth
   supabase functions deploy integration-auth
   supabase functions deploy integration-credentials
   supabase functions deploy workflow-executor
   supabase functions deploy api-gateway
   supabase functions deploy webhook-receiver
   supabase functions deploy integration-health
   ```

3. Generate API key for default agent:
   ```sql
   SELECT generate_agent_api_key('OpenClaw', '365 days'::interval);
   ```

4. Test authentication:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/api-gateway \
     -H "Authorization: Bearer mj_agent_..." \
     -H "Content-Type: application/json" \
     -d '{"action": "workflow.list"}'
   ```

## Documentation Index

- [API Reference](./api-reference.md) - Complete API documentation
- [Capability System](./capabilities.md) - CBAC implementation details
- [Event Bus](./event-bus.md) - Event-driven architecture guide
- [Security Guide](./security.md) - Security best practices
- [Workflow Engine](./workflows.md) - Workflow definition and execution
- [Integration Guide](./integrations.md) - Third-party integration setup
- [Deployment Guide](./deployment.md) - Production deployment checklist
- [Development Setup](./development.md) - Local development environment

---

**Version:** 1.0.0
**Last Updated:** 2026-02-16
**Maintained By:** MeJohnC Engineering
