# Agent Platform Setup and Deployment Guide

This guide walks through setting up and deploying the Agent Platform from scratch.

## Prerequisites

Before starting, ensure you have:

- **Supabase project** with the following extensions enabled:
  - `pg_cron` - For scheduled workflow execution
  - `pg_net` - For HTTP requests from database triggers
  - `pgcrypto` - For cryptographic functions (usually enabled by default)
- **Supabase CLI** installed and authenticated
- **Node.js 20+** for local development and testing
- **Git** access to the repository
- **Admin access** to Supabase Dashboard for configuration

## Environment Variables

### Edge Function Secrets

Configure these in Supabase Dashboard > Edge Functions > Secrets:

- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://abcdefgh.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS, used for encryption key derivation)
- `SCHEDULER_SECRET` - Shared secret for internal dispatch between edge functions and pg_cron jobs

### PostgreSQL Application Settings

These settings allow pg_cron jobs to access environment variables. Run in Supabase SQL Editor:

```sql
-- Set Supabase URL for pg_cron access
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';

-- Set scheduler secret for pg_cron authentication
ALTER DATABASE postgres SET app.scheduler_secret = 'your-scheduler-secret';
```

To verify settings:

```sql
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.%';
```

## Migration Order

Run migrations in this **exact order** using the Supabase SQL Editor or CLI:

### 1. Core Platform (`20240601000004_agent_platform.sql`)

Creates foundational tables:
- `agents` - Agent registry with API key management
- `workflows` - Workflow definitions with JSON steps
- `workflow_runs` - Execution history and state
- `integrations` - Integration catalog (GitHub, Slack, etc.)
- `integration_credentials` - Encrypted credential storage
- `agent_integrations` - Agent-to-integration mappings
- `audit_log` - Comprehensive audit trail

### 2. Scheduler (`20240601000005_scheduler.sql`)

Adds scheduling capabilities:
- `scheduled_workflow_runs` - Schedule registry for recurring workflows
- `cron_match()` function - Determines if schedule should run
- `check_due_workflows()` function - Finds and dispatches due workflows
- 4 pg_cron jobs:
  - `check-due-workflows` - Every minute
  - `cleanup-scheduled-runs` - Sundays at 3 AM UTC
  - `create-audit-log-partition` - 25th of each month
  - `integration-health-check` - Hourly

### 3. Advanced Features (`20240601000006_phase4.sql`)

Adds Phase 4 capabilities:
- `capability_definitions` - Agent capability catalog
- `agent_skills` - Agent-to-capability mappings
- `event_types` - Event bus type definitions
- `event_bus` - Event log with JSON payloads
- Signing secrets for webhooks
- Seed data for 3 default agents and 14 capabilities

## Edge Function Deployment

Deploy all 7 edge functions in sequence:

```bash
# Navigate to project directory
cd /path/to/MeJohnC.Org

# Deploy authentication function
supabase functions deploy agent-auth

# Deploy API gateway (main entry point)
supabase functions deploy api-gateway

# Deploy workflow executor
supabase functions deploy workflow-executor

# Deploy integration OAuth flow
supabase functions deploy integration-auth

# Deploy credential management
supabase functions deploy integration-credentials

# Deploy webhook receiver
supabase functions deploy webhook-receiver

# Deploy health check function
supabase functions deploy integration-health
```

Verify deployment in Supabase Dashboard > Edge Functions. All 7 functions should show "Deployed" status.

## API Key Generation

After running migrations, 3 default agents are created with auto-generated API keys:

1. **OpenClaw** (`autonomous` type) - Full workflow execution agent
2. **Dashboard** (`tool` type) - Admin dashboard backend
3. **Scheduler** (`tool` type) - Internal scheduler service

### Retrieving Agent Keys

API keys are only visible **once** at generation time. To retrieve or generate new keys:

```sql
-- Generate new key for an agent (returns plaintext key - store securely!)
SELECT generate_agent_api_key('a0000000-0000-0000-0000-000000000001');

-- Result example: mj_agent_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

-- View all agents with key prefixes (safe to display)
SELECT id, name, type, status, api_key_prefix, created_at
FROM agents
ORDER BY created_at;
```

**Important**: Store the full API key securely (e.g., environment variables, secrets manager). Only the prefix (first 12 chars) is stored in the database.

### Key Format

All agent keys follow the format: `mj_agent_<48_random_chars>`

## Verification Steps

Test each component to ensure proper deployment:

### 1. Authentication Check

Verify the agent-auth function validates API keys:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/agent-auth \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: mj_agent_YOUR_KEY_HERE" \
  -d '{}'
```

Expected response:
```json
{
  "authenticated": true,
  "agent_id": "a0000000-0000-0000-0000-000000000001",
  "agent_name": "OpenClaw",
  "agent_type": "autonomous"
}
```

### 2. API Gateway - Agent Status

Test the main API gateway:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/api-gateway \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: mj_agent_YOUR_KEY_HERE" \
  -d '{"action": "agent.status"}'
```

Expected response:
```json
{
  "agent_id": "a0000000-0000-0000-0000-000000000001",
  "name": "OpenClaw",
  "type": "autonomous",
  "status": "active",
  "capabilities": ["workflow.execute", "integration.read", ...],
  "workflows": 0,
  "integrations": 0
}
```

### 3. Workflow Execution

Execute a workflow (requires creating a workflow first):

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/api-gateway \
  -H "Content-Type: application/json" \
  -H "X-Agent-Key: mj_agent_YOUR_KEY_HERE" \
  -d '{
    "action": "workflow.execute",
    "params": {
      "workflow_id": "YOUR_WORKFLOW_ID",
      "input": {"test": true}
    }
  }'
```

### 4. Integration Health Check

Verify the scheduler-authenticated health check:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/integration-health \
  -H "Content-Type: application/json" \
  -H "x-scheduler-secret: YOUR_SCHEDULER_SECRET" \
  -d '{}'
```

Expected response:
```json
{
  "checked_at": "2026-02-16T10:30:00.000Z",
  "integrations_checked": 5,
  "credentials_checked": 3,
  "expired": 0,
  "expiring_soon": 1,
  "healthy": 2
}
```

### 5. Verify Cron Jobs

Check that all pg_cron jobs are registered:

```sql
SELECT jobid, jobname, schedule, active, database
FROM cron.job
ORDER BY jobname;
```

Expected jobs:
- `check-due-workflows` - Schedule: `* * * * *` (every minute)
- `cleanup-scheduled-runs` - Schedule: `0 3 * * 0` (Sundays 3 AM UTC)
- `create-audit-log-partition` - Schedule: `0 0 25 * *` (25th monthly, midnight UTC)
- `integration-health-check` - Schedule: `0 * * * *` (hourly)

All should show `active = true`.

### 6. Verify Seed Data

Check that Phase 4 seed data loaded correctly:

```sql
-- Verify agents
SELECT name, type, status, api_key_prefix
FROM agents
ORDER BY name;
```

Expected: 3 agents (OpenClaw, Dashboard, Scheduler)

```sql
-- Verify capabilities
SELECT name, category, requires_integration
FROM capability_definitions
ORDER BY category, name;
```

Expected: 14 capabilities across 6 categories:
- **Agent Management**: agent.create, agent.read, agent.update, agent.deactivate
- **Workflow**: workflow.create, workflow.read, workflow.execute
- **Integration**: integration.create, integration.read, integration.oauth
- **Credential**: credential.read, credential.write
- **Audit**: audit.read
- **System**: system.admin

```sql
-- Verify event types
SELECT name, category, description
FROM event_types
ORDER BY category, name;
```

Expected: 15 event types across 5 categories (agent, workflow, integration, credential, system)

## Local Development

For local testing and development:

```bash
# Install dependencies
npm install

# Run all tests including agent-platform integration
npm run test:run

# Run specific test suite
npm run test:run -- agent-platform
```

Tests verify:
- Database schema and constraints
- API key generation and validation
- Agent authentication flow
- Workflow execution logic
- Scheduler cron matching
- Audit logging

## Troubleshooting

### Edge Functions Not Deploying

- Verify Supabase CLI is authenticated: `supabase login`
- Check project is linked: `supabase link --project-ref YOUR_PROJECT_REF`
- Ensure you have admin access to the project

### Cron Jobs Not Running

- Verify pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Check PostgreSQL app settings are configured (see Environment Variables section)
- Review cron job logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### API Keys Not Working

- Ensure service role key is set in Edge Function secrets
- Verify API key format starts with `mj_agent_`
- Check agent status is `active`: `SELECT name, status FROM agents;`

### Integration Health Check Fails

- Confirm pg_net extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- Verify SCHEDULER_SECRET matches in both Edge Function secrets and PostgreSQL app settings
- Check function logs in Supabase Dashboard > Edge Functions > integration-health

## Next Steps

After successful deployment:

1. **Create workflows** using the API Gateway `workflow.create` action
2. **Set up integrations** via OAuth flows (GitHub, Slack, etc.)
3. **Schedule workflows** for recurring execution
4. **Monitor via audit log** for all platform activity
5. **Build admin dashboard** using the Dashboard agent's API key

For API documentation, see `api-reference.md`.
