# Agent Platform Troubleshooting Guide

This guide covers common errors, diagnostics, and solutions for the Agent Platform.

## Common Errors

### 401 Unauthorized

**Causes and diagnostics:**

1. **Missing X-Agent-Key header**
   - Solution: Add the header to your request
   ```bash
   curl -H "X-Agent-Key: mj_agent_..." https://api.example.com/endpoint
   ```

2. **Invalid key prefix**
   - Must start with `mj_agent_`
   - Check key format: `mj_agent_<prefix>_<secret>`

3. **Key doesn't match any active agent**
   - Verify with SQL:
   ```sql
   SELECT id, name, api_key_prefix, status
   FROM agents
   WHERE api_key_prefix LIKE 'mj_agent_%';
   ```

4. **Agent is suspended**
   - Check status:
   ```sql
   SELECT status FROM agents
   WHERE api_key_prefix = 'mj_agent_XXXX...';
   ```
   - Solution: Reactivate via admin dashboard or:
   ```sql
   UPDATE agents SET status = 'active' WHERE id = 'agent-uuid';
   ```

5. **HMAC signature verification failed**
   - Timestamp must be within 5 minutes of server time
   - Verify signing secret matches
   - Ensure request body hasn't been modified after signing
   - See [HMAC Signing Issues](#hmac-signing-issues) below

6. **Webhook signature mismatch**
   - Verify signature format (hmac_sha256, stripe, github)
   - Check secret in workflow trigger_config matches integration webhook secret

### 403 Forbidden

**Causes and diagnostics:**

1. **Agent lacks required capability for the action**
   - Check agent capabilities:
   ```sql
   SELECT capabilities FROM agents WHERE id = 'agent-uuid';
   ```
   - Check required capability: look up action in `ACTION_CAPABILITY_MAP` in `capabilities.ts`

2. **Agent doesn't have access to integration**
   ```sql
   SELECT * FROM agent_integrations
   WHERE agent_id = 'agent-uuid' AND integration_id = 'integration-uuid';
   ```

**Fix: Grant capability**
```sql
INSERT INTO agent_skills (agent_id, capability_name, proficiency)
VALUES ('agent-uuid', 'crm', 80);
```

### 429 Rate Limit Exceeded

**Causes:**
- Agent exceeded their `rate_limit_rpm` (requests per minute)
- Rate limiters reset on edge function cold starts (in-memory)

**Diagnostics:**
```sql
-- Check current limit
SELECT rate_limit_rpm FROM agents WHERE id = 'agent-uuid';
```

**Solutions:**
- Check `Retry-After` header in response
- Increase limit:
```sql
UPDATE agents SET rate_limit_rpm = 200 WHERE id = 'agent-uuid';
```

**Webhook rate limits:**
- 100 req/min per webhook_id (hardcoded)
- Webhook rate limiters also reset on cold starts

### Timeout Errors

**Types of timeouts:**
- Edge function timeout: 30s default (Supabase limit)
- Workflow step timeout: configurable via `timeout_ms` (default 30000ms)
- Health check timeout: 10s per integration

**Solutions:**
1. Increase step timeout in workflow definition:
   ```json
   {
     "steps": [{
       "id": "long-running-step",
       "timeout_ms": 60000
     }]
   }
   ```
2. Break long workflows into smaller steps
3. Use async patterns with callbacks instead of long-running requests

## Scheduler Not Dispatching

**Diagnostic steps:**

1. **Check pg_cron is running**
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'check-due-workflows';
   ```
   - Should show job with 1-minute schedule
   - Check `active` column is true

2. **Check app settings are configured**
   ```sql
   SELECT
     current_setting('app.supabase_url', true) AS supabase_url,
     current_setting('app.scheduler_secret', true) AS has_secret;
   ```
   - Both should return values (secret will show if set)

3. **Check workflow is active and scheduled**
   ```sql
   SELECT id, name, trigger_type, trigger_config, is_active
   FROM workflows
   WHERE trigger_type = 'scheduled' AND is_active = true;
   ```
   - Verify `trigger_config` contains valid cron expression

4. **Check cron expression matches current time**
   ```sql
   -- Create helper function (if not exists)
   CREATE OR REPLACE FUNCTION cron_matches_now(cron_expr text)
   RETURNS boolean AS $$
   BEGIN
     -- Simplified check - manual validation
     RETURN true;
   END;
   $$ LANGUAGE plpgsql;
   ```

5. **Check for duplicate prevention**
   ```sql
   SELECT * FROM scheduled_workflow_runs
   WHERE workflow_id = 'wf-uuid'
   ORDER BY scheduled_at DESC LIMIT 5;
   ```
   - Look for status='pending' or 'dispatched' in recent runs

6. **Check pg_net request log**
   ```sql
   SELECT * FROM net._http_response
   ORDER BY created DESC LIMIT 10;
   ```
   - Look for POST requests to workflow_trigger function

7. **Check audit log**
   ```sql
   SELECT * FROM audit_log
   WHERE action = 'workflow.dispatched'
   ORDER BY timestamp DESC LIMIT 10;
   ```

## Health Check Failures

**Common issues:**

1. **Integration health_check_url is NULL**
   - No check performed, status unchanged
   - Solution: Set health_check_url in integration config

2. **OAuth2 decrypt fails**
   - Credential may be corrupted
   - Service role key may have changed
   - Solution: Re-authenticate integration

3. **HTTP non-200 response**
   - Integration service is down
   - Check integration status dashboard

4. **Timeout after 10s**
   - Network issue or slow endpoint
   - Check integration's health endpoint directly

**Check health results:**
```sql
SELECT id, service_name, status, health_checked_at
FROM integrations
ORDER BY health_checked_at DESC;
```

## HMAC Signing Issues

**Error messages and solutions:**

1. **"Invalid signature header format"**
   - Must be: `t=<unix_timestamp>,v1=<hex_hmac>`
   - Example: `t=1707984000,v1=abc123def456...`

2. **"Signature timestamp outside replay window"**
   - Timestamp must be within 5 minutes of server time
   - Check clock synchronization on client
   - Test: `date +%s` (should match server time ±300s)

3. **"Signature mismatch"**
   - Verify signed payload format: `<timestamp>.<json_body>`
   - Secret must match agent's `signing_secret`
   - Body must be raw JSON (no whitespace changes)
   - Example signing code:
   ```typescript
   const payload = `${timestamp}.${JSON.stringify(body)}`;
   const hmac = crypto
     .createHmac('sha256', signingSecret)
     .update(payload)
     .digest('hex');
   const signature = `t=${timestamp},v1=${hmac}`;
   ```

4. **"Failed to decrypt signing secret"**
   - Service role key may have changed
   - Solution: Regenerate signing secret via admin dashboard

## Diagnostic SQL Queries

### Recent auth failures
```sql
SELECT timestamp, actor_id, details
FROM audit_log
WHERE action = 'agent_auth.failed'
ORDER BY timestamp DESC LIMIT 20;
```

### Workflow execution history
```sql
SELECT
  wr.id,
  w.name,
  wr.status,
  wr.trigger_type,
  wr.error,
  wr.started_at,
  wr.completed_at
FROM workflow_runs wr
JOIN workflows w ON w.id = wr.workflow_id
ORDER BY wr.created_at DESC LIMIT 20;
```

### Agent activity (last seen)
```sql
SELECT
  name,
  type,
  status,
  last_seen_at,
  rate_limit_rpm
FROM agents
ORDER BY last_seen_at DESC NULLS LAST;
```

### Event bus activity
```sql
SELECT
  event_type,
  source_type,
  source_id,
  correlation_id,
  created_at,
  dispatched_to
FROM events
ORDER BY created_at DESC LIMIT 20;
```

### Integration credential status
```sql
SELECT
  ic.id,
  i.service_name,
  ic.credential_type,
  ic.expires_at,
  ic.last_used_at
FROM integration_credentials ic
JOIN integrations i ON i.id = ic.integration_id
ORDER BY ic.last_used_at DESC NULLS LAST;
```

### Capability matrix (which agents have which skills)
```sql
SELECT
  a.name AS agent,
  s.capability_name,
  s.proficiency
FROM agent_skills s
JOIN agents a ON a.id = s.agent_id
ORDER BY a.name, s.proficiency DESC;
```

### Scheduled workflow dispatch log
```sql
SELECT
  swr.workflow_id,
  w.name,
  swr.scheduled_at,
  swr.status,
  swr.dispatched_at,
  swr.error
FROM scheduled_workflow_runs swr
JOIN workflows w ON w.id = swr.workflow_id
ORDER BY swr.scheduled_at DESC LIMIT 20;
```

### Recent workflow errors
```sql
SELECT
  wr.id,
  w.name,
  wr.status,
  wr.error,
  wr.started_at
FROM workflow_runs wr
JOIN workflows w ON w.id = wr.workflow_id
WHERE wr.status = 'failed'
ORDER BY wr.started_at DESC LIMIT 20;
```

### Integration usage stats
```sql
SELECT
  i.service_name,
  COUNT(DISTINCT ai.agent_id) AS agent_count,
  i.status,
  i.health_checked_at
FROM integrations i
LEFT JOIN agent_integrations ai ON ai.integration_id = i.id
GROUP BY i.id, i.service_name, i.status, i.health_checked_at
ORDER BY agent_count DESC;
```

## Additional Resources

- [Architecture Guide](./architecture.md) - System design and data flow
- [API Reference](./api-reference.md) - Endpoint documentation
- [Security Guide](./security.md) - Authentication and authorization patterns
