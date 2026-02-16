# Agent Platform Security Runbook

## Security Architecture Summary

The Agent Platform implements defense-in-depth security with multiple layers of protection:

### API Keys
- **Format**: `mj_agent_` prefix for easy identification and rotation
- **Storage**: SHA-256 hashed in database, never stored in plaintext after initial generation
- **Distribution**: Only shown once on generation, must be stored securely by operator
- **Revocation**: Instant invalidation via `revoke_agent_api_key()` function

### Signing Secrets
- **Format**: `mj_sign_` prefix for HMAC command signing
- **Storage**: Encrypted with AES-256-GCM in `agents.signing_secret_encrypted` column
- **Usage**: Agents sign commands with HMAC-SHA256 to prove authenticity
- **Rotation**: Can be rotated independently of API keys

### Credential Encryption
- **Algorithm**: AES-256-GCM authenticated encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Key Material**: SUPABASE_SERVICE_ROLE_KEY + random 32-byte salt per encryption
- **Salt Storage**: Stored alongside ciphertext in database
- **Authenticity**: GCM mode provides built-in authentication tag

### Rate Limiting
- **Scope**: Per-agent configurable requests per minute (RPM)
- **Implementation**: In-memory sliding window algorithm
- **Storage**: Ephemeral (resets on function cold start)
- **Configuration**: Set via `agents.rate_limit_rpm` column

### HMAC Command Signing
- **Algorithm**: HMAC-SHA256
- **Replay Protection**: 5-minute timestamp window
- **Timing Attacks**: Constant-time signature comparison
- **Headers**: `x-agent-signature` and `x-agent-timestamp`

### Row-Level Security
- **Coverage**: All 13 platform tables have RLS enabled
- **Isolation**: Agents can only access their own data (own agent_id)
- **Admin Access**: Users with `is_admin=true` have full access
- **Service Role**: Edge functions bypass RLS using service role key

### Audit Logging
- **Table**: `audit_log` with monthly partitioning
- **Fields**: actor_id, actor_type, action, resource_type, resource_id, details, timestamp
- **Immutability**: No UPDATE or DELETE allowed, only INSERT
- **Retention**: 6 months (configurable)
- **Performance**: Indexes on actor_id, action, resource_type, timestamp

### Internal Dispatch
- **Purpose**: Scheduler edge function triggers workflow execution
- **Authentication**: `x-scheduler-secret` header (not agent auth)
- **Secret Storage**: Environment variable + PostgreSQL app setting
- **Isolation**: Separate from agent authentication layer

## Incident Response Procedures

### Compromised API Key

**Severity**: High - Immediate action required

**Signs of Compromise**:
- Unexpected geographic locations in audit log
- Unusual API call patterns or rate limit hits
- Agent activity outside normal hours
- Failed authentication attempts with partial key match

**Response Steps**:

1. **Immediate Revocation** (within 5 minutes of detection)
   ```sql
   SELECT revoke_agent_api_key('compromised-agent-uuid');
   ```
   This invalidates the key immediately. All subsequent requests will fail authentication.

2. **Assess Damage** (within 15 minutes)
   ```sql
   SELECT * FROM audit_log
   WHERE actor_id = 'compromised-agent-uuid'
   AND timestamp > now() - interval '24 hours'
   ORDER BY timestamp DESC;
   ```
   Look for:
   - Credential access (`credential_read`, `credential_decrypt`)
   - Workflow executions (`workflow_run_create`)
   - Integration usage (`integration_use`)
   - Data exfiltration patterns (excessive reads)

3. **Contain Blast Radius** (within 30 minutes)
   ```sql
   -- Suspend the agent to prevent new key generation
   UPDATE agents SET status = 'suspended' WHERE id = 'compromised-agent-uuid';

   -- Check if credentials were accessed
   SELECT ic.id, i.service_name, ic.credential_type, al.timestamp
   FROM audit_log al
   JOIN integration_credentials ic ON ic.id = al.resource_id
   JOIN integrations i ON i.id = ic.integration_id
   WHERE al.actor_id = 'compromised-agent-uuid'
   AND al.action LIKE 'credential%'
   ORDER BY al.timestamp DESC;
   ```
   If credentials were accessed, escalate to "Compromised Integration Credential" procedure.

4. **Recover** (after investigation complete)
   ```sql
   -- Re-activate agent after investigation
   UPDATE agents SET status = 'active' WHERE id = 'agent-uuid';

   -- Generate new API key
   SELECT generate_agent_api_key('agent-uuid');
   ```
   Securely distribute the new key to the legitimate agent operator (encrypted email, secure vault, etc.).

5. **Post-Incident Review** (within 48 hours)
   - Document timeline of compromise
   - Identify root cause (phishing, code exposure, log leak, etc.)
   - Update security controls to prevent recurrence
   - Consider reducing agent capabilities if over-permissioned

### Compromised Integration Credential

**Severity**: Critical - Third-party access at risk

**Signs of Compromise**:
- Unauthorized activity in third-party service (GitHub, Slack, etc.)
- Credential accessed by suspended/unknown agent
- Unusual integration usage patterns

**Response Steps**:

1. **Immediate Deletion** (within 5 minutes)
   ```sql
   -- Note the credential details before deletion
   SELECT i.service_name, ic.credential_type, ic.scopes, ic.created_at
   FROM integration_credentials ic
   JOIN integrations i ON i.id = ic.integration_id
   WHERE ic.id = 'credential-uuid';

   -- Delete from platform
   DELETE FROM integration_credentials WHERE id = 'credential-uuid';
   ```

2. **Provider-Side Revocation** (within 10 minutes)
   - **GitHub**: Settings > Developer settings > Personal access tokens > Revoke
   - **Slack**: Apps > Your App > OAuth & Permissions > Revoke tokens
   - **Linear**: Settings > API > Revoke key
   - **Other**: Follow provider-specific revocation procedures

3. **Assess Access Trail** (within 20 minutes)
   ```sql
   SELECT * FROM audit_log
   WHERE resource_type = 'integration_credential'
   AND resource_id = 'credential-uuid'
   ORDER BY timestamp DESC;
   ```
   Check for:
   - Which agents accessed the credential
   - When it was first accessed after compromise
   - What workflows used the credential

4. **Rotate and Restore** (within 1 hour)
   - Generate new credential at provider
   - Re-establish integration with new credential
   - Update agent integrations as needed
   - Test functionality before marking incident resolved

5. **Monitor** (ongoing, 7 days)
   - Watch for suspicious activity in third-party service
   - Review audit logs for the integration daily
   - Check for lateral movement (other credentials accessed)

### Replay Attack Detected

**Severity**: Medium - Potential attacker with intercepted traffic

**Signs of Detection**:
- Error logs: "Signature timestamp outside replay window"
- Multiple signature verification failures from same source
- Timing patterns suggesting request replay

**Response Steps**:

1. **Determine Legitimacy** (within 10 minutes)
   - Check if agent's system clock is severely skewed (>5 minutes)
   - Verify the timestamp in `x-agent-timestamp` header is UTC
   - Contact agent operator to confirm legitimate requests

2. **Review Recent Activity** (within 15 minutes)
   ```sql
   SELECT * FROM audit_log
   WHERE actor_id = 'agent-uuid'
   AND timestamp > now() - interval '1 hour'
   ORDER BY timestamp DESC;
   ```
   Look for duplicate commands or suspicious patterns.

3. **Revoke Signing Secret** (if malicious, within 20 minutes)
   ```sql
   SELECT revoke_signing_secret('agent-uuid');
   ```
   This forces new HMAC signatures to be generated with a new secret.

4. **Generate New Signing Secret** (within 30 minutes)
   ```sql
   SELECT generate_signing_secret('agent-uuid');
   ```
   Securely distribute the new signing secret to the legitimate agent operator.

5. **Consider Replay Window Adjustment** (if attacks persist)
   - Default: 5 minutes (`REPLAY_WINDOW_MS` in `command-signing.ts`)
   - Can reduce to 2-3 minutes for high-security agents
   - Requires code change and redeployment
   - Document reason for change in security log

### Scheduler Secret Compromise

**Severity**: Critical - Internal system access at risk

**Signs of Compromise**:
- Unauthorized workflow executions
- Unexpected cron job triggers
- Edge function invocations without scheduled trigger

**Response Steps**:

1. **Generate New Secret** (immediately)
   ```bash
   # Generate cryptographically secure 32-byte secret
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Update Supabase Edge Functions** (within 5 minutes)
   - Navigate to Supabase Dashboard > Edge Functions > Secrets
   - Set `SCHEDULER_SECRET` to new value
   - Save and verify

3. **Update PostgreSQL App Setting** (within 10 minutes)
   ```sql
   ALTER DATABASE postgres SET app.scheduler_secret = 'new-secret-here';
   ```

4. **Redeploy Edge Functions** (within 15 minutes)
   ```bash
   cd C:\Users\mejohnc\Documents\Git repositories\MeJohnC.Org
   supabase functions deploy scheduler
   supabase functions deploy execute-workflow
   ```
   Functions read environment variables on cold start, so redeployment ensures new secret is active.

5. **Verify Cron Jobs** (within 30 minutes)
   ```sql
   SELECT * FROM scheduled_workflow_runs
   WHERE next_run_at < now() + interval '1 hour'
   ORDER BY next_run_at;
   ```
   Manually trigger a test workflow to confirm scheduler still works.

6. **Audit Workflow Runs** (within 1 hour)
   ```sql
   SELECT * FROM workflow_runs
   WHERE created_at > now() - interval '24 hours'
   AND trigger_type = 'scheduled'
   ORDER BY created_at DESC;
   ```
   Investigate any unexpected executions.

## Regular Security Tasks

### Monthly Security Review

**Time Required**: 30-45 minutes
**Owner**: Platform Administrator

#### 1. Audit Log Analysis
```sql
-- Top actors and actions (identify anomalies)
SELECT actor_id, action, COUNT(*) as count FROM audit_log
WHERE timestamp > now() - interval '30 days'
GROUP BY actor_id, action
ORDER BY count DESC
LIMIT 50;

-- Failed authentication attempts
SELECT actor_id, details, COUNT(*) FROM audit_log
WHERE action = 'auth_failed'
AND timestamp > now() - interval '30 days'
GROUP BY actor_id, details
ORDER BY count DESC;
```

#### 2. Inactive Agent Review
```sql
-- Agents with no recent activity (potential security risk)
SELECT name, status, last_seen_at, created_at
FROM agents
WHERE status = 'active'
AND (last_seen_at IS NULL OR last_seen_at < now() - interval '30 days')
ORDER BY created_at;
```
**Action**: Suspend or revoke keys for legitimately inactive agents.

#### 3. Rate Limit Effectiveness
```sql
-- Agents hitting rate limits frequently
SELECT actor_id, COUNT(*) as limit_hits FROM audit_log
WHERE action = 'rate_limit_exceeded'
AND timestamp > now() - interval '30 days'
GROUP BY actor_id
ORDER BY limit_hits DESC;
```
**Action**: Adjust rate limits or investigate unusual usage patterns.

#### 4. Credential Expiry Check
```sql
SELECT i.service_name, ic.credential_type, ic.expires_at, ic.created_at
FROM integration_credentials ic
JOIN integrations i ON i.id = ic.integration_id
WHERE ic.expires_at IS NOT NULL
AND ic.expires_at < now() + interval '7 days'
ORDER BY ic.expires_at;
```
**Action**: Proactively rotate credentials before expiry.

### Quarterly Security Maintenance

**Time Required**: 2-3 hours
**Owner**: Platform Administrator
**Schedule**: First week of each quarter

#### 1. Agent API Key Rotation
```sql
-- Generate new keys for all active agents
SELECT id, name, rotate_agent_api_key(id) AS new_key
FROM agents
WHERE status = 'active'
ORDER BY name;
```
**Distribution**: Securely send new keys to agent operators via encrypted channels. Provide 7-day overlap period before revoking old keys.

#### 2. Signing Secret Rotation
```sql
-- Rotate signing secrets for agents using HMAC
SELECT id, name, generate_signing_secret(id) AS new_secret
FROM agents
WHERE status = 'active'
AND signing_secret_encrypted IS NOT NULL
ORDER BY name;
```

#### 3. Scheduler Secret Rotation
Follow "Scheduler Secret Compromise" procedure above as a planned rotation.

#### 4. Audit Log Partition Maintenance
```sql
-- List partitions older than 6 months
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'audit_log_y%'
ORDER BY tablename;

-- Drop old partitions (example)
-- DROP TABLE audit_log_y2025m08;
```
**Action**: Archive to cold storage before dropping, if required for compliance.

#### 5. Capability Audit
```sql
-- Agents with powerful capabilities
SELECT a.name, cd.capability_key, cd.risk_level
FROM agent_skills ask
JOIN agents a ON a.id = ask.agent_id
JOIN capability_definitions cd ON cd.id = ask.capability_id
WHERE cd.risk_level IN ('high', 'critical')
ORDER BY a.name, cd.risk_level;
```
**Action**: Review if agents still need high-risk capabilities. Remove unnecessary permissions.

#### 6. RLS Policy Verification
```sql
-- Verify RLS is enabled on all platform tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'agents', 'workflows', 'workflow_runs', 'integrations',
  'integration_credentials', 'agent_integrations', 'audit_log',
  'capability_definitions', 'agent_skills', 'event_types',
  'event_subscriptions', 'events', 'scheduled_workflow_runs'
)
ORDER BY tablename;
```
**Expected**: All rows should have `rowsecurity = true`.

## Access Control Matrix

| Resource | Admin (is_admin) | Agent (own data) | Agent (other data) | System/Scheduler |
|----------|:----------------:|:----------------:|:------------------:|:----------------:|
| agents | CRUD | Read own row | - | - |
| workflows | CRUD | - | - | - |
| workflow_runs | CRUD | - | - | - |
| integrations | CRUD | Read granted | - | - |
| integration_credentials | CRUD | - | - | Via service role |
| agent_integrations | CRUD | Read own | - | - |
| audit_log | Read | - | - | Insert (via functions) |
| capability_definitions | CRUD | Read | Read | - |
| agent_skills | CRUD | - | - | - |
| event_types | CRUD | Read | Read | - |
| event_subscriptions | CRUD | - | - | - |
| events | Read | - | - | Insert |
| scheduled_workflow_runs | CRUD | - | - | - |

### Key Principles

1. **Least Privilege**: Agents can only access resources they own or have been explicitly granted.

2. **Admin Override**: Users with `is_admin=true` bypass RLS and have full CRUD access to all resources.

3. **Service Role Bypass**: Edge functions use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS entirely. This is intentional for:
   - Credential decryption (requires access to all credentials)
   - Cross-agent operations (scheduler triggering workflows)
   - System operations (audit log insertion, event publishing)

4. **Read-Only Public Data**: Agents can read capability definitions and event types (global catalog data) but cannot modify them.

5. **Immutable Logs**: Audit log allows only INSERT operations. Even admins cannot UPDATE or DELETE entries to maintain audit integrity.

6. **Integration Isolation**: Agents can only read integration credentials that have been granted to them via `agent_integrations` table.

### Service Role Usage Guidelines

The service role key is extremely powerful. Only use it in edge functions for:

- **Credential Operations**: Encrypting/decrypting integration credentials
- **System Events**: Publishing events, logging audit entries
- **Scheduled Operations**: Triggering workflows via scheduler
- **Admin Operations**: When admin user identity is verified

**Never**:
- Expose service role key to client-side code
- Log service role key in error messages
- Use for operations that should respect RLS
- Return raw credentials to API responses (always decrypt on-demand, use, and discard)
