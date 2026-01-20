# Immutable Audit Logging with Legal Hold

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Document Owner:** Security Lead / Site Administrator
**Related Issue:** #60
**Related Documents:** [Data Retention](../compliance/data-retention.md), [GDPR Data Handling](../compliance/gdpr-data-handling.md), [Log Aggregation](../observability/log-aggregation.md)

---

## Table of Contents

1. [Audit Logging Overview](#audit-logging-overview)
2. [What to Log](#what-to-log)
3. [Audit Log Schema and Format](#audit-log-schema-and-format)
4. [Immutability Requirements](#immutability-requirements)
5. [Implementation Options](#implementation-options)
6. [Legal Hold Implementation](#legal-hold-implementation)
7. [Compliance Requirements](#compliance-requirements)
8. [Log Storage and Retention](#log-storage-and-retention)
9. [Access Controls for Audit Logs](#access-controls-for-audit-logs)
10. [Monitoring and Alerting](#monitoring-and-alerting)
11. [Audit Log Review Procedures](#audit-log-review-procedures)
12. [Supabase Implementation Guide](#supabase-implementation-guide)

---

## Audit Logging Overview

### Purpose

Audit logging provides a tamper-evident record of security-relevant events and actions within MeJohnC.Org. This documentation establishes the requirements, implementation patterns, and operational procedures for maintaining an immutable audit trail that supports:

- **Security Investigation**: Forensic analysis of security incidents
- **Compliance**: Meeting regulatory requirements (GDPR, SOC2)
- **Accountability**: Tracking who did what, when, and from where
- **Legal Evidence**: Providing admissible records for legal proceedings
- **Operational Insight**: Understanding system usage patterns

### Scope

This audit logging framework covers:

- All authenticated user actions in the admin dashboard
- Database modifications (create, update, delete operations)
- Authentication and authorization events
- Security-relevant system events
- Administrative configuration changes
- Data access and export operations

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Completeness** | Log all security-relevant events without gaps |
| **Immutability** | Once written, logs cannot be modified or deleted |
| **Integrity** | Cryptographic verification ensures logs are unaltered |
| **Availability** | Logs must be accessible when needed for investigation |
| **Confidentiality** | Protect logs from unauthorized access |
| **Non-repudiation** | Logs provide evidence that cannot be disputed |

### Current Implementation Status

MeJohnC.Org has existing audit infrastructure in `src/lib/audit.ts`:

```typescript
// Existing AuditLog interface
interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
```

This document extends this foundation with immutability guarantees, legal hold capabilities, and comprehensive event coverage.

---

## What to Log

### Event Categories

#### 1. Authentication Events

Log all authentication-related activities to detect unauthorized access attempts and account compromise.

| Event Type | Description | Severity | Data to Capture |
|------------|-------------|----------|-----------------|
| `auth.login.success` | Successful user login | Info | user_id, method, ip, user_agent, session_id |
| `auth.login.failure` | Failed login attempt | Warning | attempted_email, reason, ip, user_agent |
| `auth.logout` | User logout | Info | user_id, session_id, logout_type (manual/timeout) |
| `auth.session.created` | New session established | Info | user_id, session_id, expires_at |
| `auth.session.expired` | Session expiration | Info | user_id, session_id, reason |
| `auth.session.revoked` | Manual session revocation | Warning | user_id, session_id, revoked_by |
| `auth.mfa.enabled` | MFA enabled on account | Info | user_id, mfa_method |
| `auth.mfa.disabled` | MFA disabled on account | Warning | user_id, disabled_by |
| `auth.mfa.challenge` | MFA challenge presented | Info | user_id, challenge_type |
| `auth.mfa.success` | MFA verification passed | Info | user_id, method |
| `auth.mfa.failure` | MFA verification failed | Warning | user_id, method, attempts |
| `auth.password.changed` | Password change | Info | user_id, changed_by |
| `auth.password.reset.requested` | Password reset requested | Info | email, ip |
| `auth.password.reset.completed` | Password reset completed | Info | user_id |
| `auth.lockout` | Account locked due to failures | Critical | user_id, reason, locked_until |
| `auth.unlock` | Account unlocked | Info | user_id, unlocked_by |

**Example Log Entry:**

```json
{
  "event_type": "auth.login.failure",
  "timestamp": "2025-01-20T15:30:45.123Z",
  "severity": "warning",
  "actor": {
    "attempted_email": "admin@example.com",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 ..."
  },
  "details": {
    "reason": "invalid_password",
    "attempts_in_window": 3,
    "lockout_threshold": 5
  }
}
```

#### 2. Authorization Decisions

Log access control decisions to track permission usage and detect privilege abuse.

| Event Type | Description | Severity | Data to Capture |
|------------|-------------|----------|-----------------|
| `authz.access.granted` | Permission check passed | Debug | user_id, resource, action, policy |
| `authz.access.denied` | Permission check failed | Warning | user_id, resource, action, reason |
| `authz.role.assigned` | Role assigned to user | Info | user_id, role, assigned_by |
| `authz.role.revoked` | Role removed from user | Warning | user_id, role, revoked_by |
| `authz.permission.granted` | Permission granted | Info | user_id, permission, granted_by |
| `authz.permission.revoked` | Permission revoked | Warning | user_id, permission, revoked_by |
| `authz.privilege.elevated` | Privilege escalation | Warning | user_id, from_role, to_role, reason |
| `authz.policy.changed` | Access policy modified | Critical | policy_id, changes, changed_by |

**Example Log Entry:**

```json
{
  "event_type": "authz.access.denied",
  "timestamp": "2025-01-20T15:31:00.456Z",
  "severity": "warning",
  "actor": {
    "user_id": "user_2abc123",
    "user_email": "user@example.com"
  },
  "resource": {
    "type": "admin_dashboard",
    "path": "/admin/settings/security"
  },
  "details": {
    "action_attempted": "view",
    "required_role": "super_admin",
    "user_role": "admin",
    "policy": "security_settings_access"
  }
}
```

#### 3. Data Access (CRUD Operations)

Log all data modifications to maintain a complete change history.

| Event Type | Description | Severity | Data to Capture |
|------------|-------------|----------|-----------------|
| `data.create` | Record created | Info | table, record_id, new_data, user_id |
| `data.read` | Sensitive data accessed | Debug | table, record_id, fields_accessed, user_id |
| `data.update` | Record modified | Info | table, record_id, old_data, new_data, user_id |
| `data.delete` | Record deleted | Warning | table, record_id, old_data, user_id |
| `data.bulk_update` | Multiple records modified | Warning | table, record_count, user_id |
| `data.bulk_delete` | Multiple records deleted | Critical | table, record_count, criteria, user_id |
| `data.export` | Data exported | Warning | table, record_count, format, user_id |
| `data.import` | Data imported | Info | table, record_count, source, user_id |
| `data.restore` | Record restored from backup | Warning | table, record_id, version, user_id |

**Example Log Entry (from existing audit system):**

```json
{
  "event_type": "data.update",
  "timestamp": "2025-01-20T15:32:15.789Z",
  "severity": "info",
  "actor": {
    "user_id": "user_2abc123",
    "user_email": "admin@mejohnc.org",
    "ip_address": "192.168.1.100"
  },
  "resource": {
    "table": "blog_posts",
    "record_id": "post_xyz789"
  },
  "details": {
    "action": "update",
    "old_data": {
      "title": "Original Title",
      "status": "draft"
    },
    "new_data": {
      "title": "Updated Title",
      "status": "published"
    },
    "changed_fields": ["title", "status"]
  }
}
```

#### 4. Admin Actions

Log administrative activities that could impact system security or data integrity.

| Event Type | Description | Severity | Data to Capture |
|------------|-------------|----------|-----------------|
| `admin.user.created` | New admin user created | Info | new_user_id, created_by, roles |
| `admin.user.deleted` | Admin user deleted | Critical | deleted_user_id, deleted_by |
| `admin.user.suspended` | Admin user suspended | Warning | user_id, suspended_by, reason |
| `admin.user.reactivated` | Admin user reactivated | Info | user_id, reactivated_by |
| `admin.api_key.created` | API key generated | Warning | key_id (partial), created_by, scope |
| `admin.api_key.revoked` | API key revoked | Warning | key_id (partial), revoked_by |
| `admin.backup.initiated` | Backup started | Info | backup_type, initiated_by |
| `admin.backup.completed` | Backup finished | Info | backup_type, size, location |
| `admin.restore.initiated` | Restore started | Critical | restore_point, initiated_by |
| `admin.maintenance.started` | Maintenance mode enabled | Warning | enabled_by, reason |
| `admin.maintenance.ended` | Maintenance mode disabled | Info | disabled_by |
| `admin.gdpr.export` | GDPR data export | Warning | subject_email_hash, exported_by |
| `admin.gdpr.deletion` | GDPR deletion request | Critical | subject_email_hash, deleted_by |

**Example Log Entry:**

```json
{
  "event_type": "admin.user.created",
  "timestamp": "2025-01-20T15:33:30.012Z",
  "severity": "info",
  "actor": {
    "user_id": "user_2abc123",
    "user_email": "superadmin@mejohnc.org"
  },
  "target": {
    "user_id": "user_2def456",
    "user_email": "newadmin@mejohnc.org"
  },
  "details": {
    "roles_assigned": ["admin"],
    "permissions": ["manage_content", "view_analytics"]
  }
}
```

#### 5. Configuration Changes

Log all configuration modifications that could affect security or system behavior.

| Event Type | Description | Severity | Data to Capture |
|------------|-------------|----------|-----------------|
| `config.security.changed` | Security settings modified | Critical | setting, old_value, new_value, changed_by |
| `config.feature.enabled` | Feature flag enabled | Info | feature, enabled_by |
| `config.feature.disabled` | Feature flag disabled | Info | feature, disabled_by |
| `config.integration.added` | External integration added | Warning | integration_type, added_by |
| `config.integration.removed` | External integration removed | Warning | integration_type, removed_by |
| `config.rls.policy.created` | RLS policy created | Critical | policy_name, table, created_by |
| `config.rls.policy.modified` | RLS policy modified | Critical | policy_name, changes, modified_by |
| `config.rls.policy.deleted` | RLS policy deleted | Critical | policy_name, deleted_by |
| `config.env.changed` | Environment variable changed | Critical | variable_name (not value), changed_by |
| `config.webhook.added` | Webhook configured | Warning | endpoint_domain, events, added_by |
| `config.webhook.removed` | Webhook removed | Info | endpoint_domain, removed_by |

**Example Log Entry:**

```json
{
  "event_type": "config.security.changed",
  "timestamp": "2025-01-20T15:34:45.345Z",
  "severity": "critical",
  "actor": {
    "user_id": "user_2abc123",
    "user_email": "superadmin@mejohnc.org"
  },
  "details": {
    "setting": "session_timeout_minutes",
    "old_value": 60,
    "new_value": 30,
    "reason": "Security hardening"
  }
}
```

#### 6. Security Events

Log security-related events that may indicate threats or anomalies.

| Event Type | Description | Severity | Data to Capture |
|------------|-------------|----------|-----------------|
| `security.rate_limit.triggered` | Rate limit exceeded | Warning | ip, endpoint, requests_count |
| `security.rate_limit.blocked` | Request blocked by rate limit | Warning | ip, endpoint |
| `security.csrf.failure` | CSRF validation failed | Critical | endpoint, ip, user_agent |
| `security.xss.detected` | XSS attempt detected | Critical | input_field, payload_hash, ip |
| `security.sqli.detected` | SQL injection attempt | Critical | input_field, payload_hash, ip |
| `security.suspicious.activity` | Anomalous behavior detected | Warning | user_id, activity_type, details |
| `security.breach.suspected` | Potential security breach | Critical | details, affected_resources |
| `security.certificate.expiring` | TLS certificate expiring | Warning | domain, expires_at |
| `security.audit.accessed` | Audit logs accessed | Info | accessed_by, query_params |
| `security.audit.exported` | Audit logs exported | Warning | exported_by, date_range, format |
| `security.legal_hold.applied` | Legal hold placed on data | Critical | hold_id, scope, applied_by |
| `security.legal_hold.released` | Legal hold released | Critical | hold_id, released_by |

**Example Log Entry:**

```json
{
  "event_type": "security.rate_limit.triggered",
  "timestamp": "2025-01-20T15:35:00.678Z",
  "severity": "warning",
  "source": {
    "ip_address": "192.168.1.100",
    "user_agent": "curl/7.68.0"
  },
  "details": {
    "endpoint": "/api/login",
    "window_seconds": 60,
    "requests_in_window": 15,
    "limit": 10,
    "blocked": true
  }
}
```

### Event Logging Decision Matrix

| Question | If Yes | If No |
|----------|--------|-------|
| Does the action affect security? | Log at appropriate severity | Consider if compliance requires |
| Does the action modify data? | Log with before/after state | Log if sensitive data accessed |
| Is this an admin action? | Always log | Check if authentication event |
| Could this be used in forensics? | Log with full context | Document exclusion reason |
| Is this required for compliance? | Log per regulation requirements | Optional based on policy |

---

## Audit Log Schema and Format

### Extended Schema for Immutable Audit Logs

```sql
-- Core immutable audit log table
CREATE TABLE immutable_audit_logs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number BIGSERIAL UNIQUE NOT NULL,  -- Monotonic sequence for ordering

  -- Event Classification
  event_type TEXT NOT NULL,                    -- Hierarchical event type (e.g., 'auth.login.success')
  event_category TEXT NOT NULL,                -- Category: auth, authz, data, admin, config, security
  severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'critical')),

  -- Timestamp (immutable)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Actor Information
  actor_user_id TEXT,                          -- Clerk user ID
  actor_email TEXT,                            -- Email at time of action
  actor_ip_address TEXT,                       -- Client IP
  actor_user_agent TEXT,                       -- User agent string
  actor_session_id TEXT,                       -- Session identifier

  -- Resource Information
  resource_type TEXT,                          -- Type of resource affected
  resource_id TEXT,                            -- ID of resource
  resource_table TEXT,                         -- Database table (for data events)

  -- Event Details
  action TEXT,                                 -- Specific action (create, read, update, delete, etc.)
  old_data JSONB,                              -- Previous state (for updates/deletes)
  new_data JSONB,                              -- New state (for creates/updates)
  metadata JSONB DEFAULT '{}',                 -- Additional context

  -- Request Context
  correlation_id TEXT,                         -- Request correlation ID
  request_path TEXT,                           -- API endpoint
  request_method TEXT,                         -- HTTP method

  -- Immutability and Verification
  hash TEXT NOT NULL,                          -- SHA-256 hash of log entry
  previous_hash TEXT,                          -- Hash of previous entry (chain)

  -- Legal Hold
  legal_hold BOOLEAN DEFAULT FALSE,
  legal_hold_id TEXT,
  legal_hold_applied_at TIMESTAMPTZ,
  legal_hold_applied_by TEXT,

  -- Indexes for efficient querying
  CONSTRAINT valid_event_category CHECK (
    event_category IN ('auth', 'authz', 'data', 'admin', 'config', 'security')
  )
);

-- Essential indexes for query performance
CREATE INDEX idx_audit_timestamp ON immutable_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_event_type ON immutable_audit_logs(event_type);
CREATE INDEX idx_audit_event_category ON immutable_audit_logs(event_category);
CREATE INDEX idx_audit_actor_user_id ON immutable_audit_logs(actor_user_id);
CREATE INDEX idx_audit_resource ON immutable_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_correlation ON immutable_audit_logs(correlation_id);
CREATE INDEX idx_audit_severity ON immutable_audit_logs(severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX idx_audit_legal_hold ON immutable_audit_logs(legal_hold) WHERE legal_hold = TRUE;
CREATE INDEX idx_audit_sequence ON immutable_audit_logs(sequence_number);
```

### JSON Log Format

Each audit log entry should be structured as follows:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sequence_number": 12345,
  "event_type": "data.update",
  "event_category": "data",
  "severity": "info",
  "timestamp": "2025-01-20T15:30:45.123Z",
  "actor": {
    "user_id": "user_2abc123",
    "email": "admin@mejohnc.org",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "session_id": "sess_xyz789"
  },
  "resource": {
    "type": "blog_post",
    "id": "post_abc456",
    "table": "blog_posts"
  },
  "action": "update",
  "changes": {
    "old_data": {
      "title": "Original Title",
      "status": "draft"
    },
    "new_data": {
      "title": "Updated Title",
      "status": "published"
    },
    "changed_fields": ["title", "status"]
  },
  "context": {
    "correlation_id": "corr_def789",
    "request_path": "/api/blog-posts/post_abc456",
    "request_method": "PATCH"
  },
  "verification": {
    "hash": "a1b2c3d4e5f6...",
    "previous_hash": "9z8y7x6w5v4..."
  },
  "legal_hold": {
    "active": false,
    "hold_id": null
  }
}
```

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier for the log entry |
| `sequence_number` | Integer | Yes | Monotonically increasing sequence for ordering |
| `event_type` | String | Yes | Hierarchical event type (e.g., `auth.login.success`) |
| `event_category` | Enum | Yes | One of: auth, authz, data, admin, config, security |
| `severity` | Enum | Yes | One of: debug, info, warning, critical |
| `timestamp` | ISO 8601 | Yes | UTC timestamp with millisecond precision |
| `actor.user_id` | String | No | User ID (null for anonymous/system events) |
| `actor.email` | String | No | Email at time of action |
| `actor.ip_address` | String | No | Client IP address |
| `actor.user_agent` | String | No | Browser/client user agent |
| `actor.session_id` | String | No | Session identifier |
| `resource.type` | String | No | Type of resource (table name, object type) |
| `resource.id` | String | No | Resource identifier |
| `action` | String | Yes | Specific action performed |
| `old_data` | JSON | No | Previous state (for modifications) |
| `new_data` | JSON | No | New state (for creations/modifications) |
| `metadata` | JSON | No | Additional context-specific data |
| `correlation_id` | String | Recommended | Links related log entries |
| `hash` | String | Yes | SHA-256 hash for integrity verification |
| `previous_hash` | String | No | Hash chain link (null for first entry) |

---

## Immutability Requirements

### Write-Once Storage

Audit logs must be append-only with no ability to modify or delete existing entries.

#### Database-Level Enforcement

```sql
-- Prevent ALL updates on immutable_audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Updates and deletes are not permitted.';
END;
$$ LANGUAGE plpgsql;

-- Trigger to block updates
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON immutable_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Trigger to block deletes (except for legal hold bypass which requires special procedures)
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON immutable_audit_logs
  FOR EACH ROW
  WHEN (OLD.legal_hold = FALSE OR (
    -- Allow deletion only via special admin function with proper authorization
    -- This exception is for data retention compliance, not general deletion
    current_setting('app.audit_delete_authorized', TRUE) IS NULL OR
    current_setting('app.audit_delete_authorized', TRUE) != 'true'
  ))
  EXECUTE FUNCTION prevent_audit_log_modification();

-- RLS policy: append-only access
ALTER TABLE immutable_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow inserts via the audit function
CREATE POLICY "Audit logs are append-only for service role"
  ON immutable_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Read access for authenticated admins
CREATE POLICY "Admins can read audit logs"
  ON immutable_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()::text
      AND admin_users.role IN ('admin', 'super_admin')
    )
  );

-- No update or delete policies (blocked at trigger level)
```

### Cryptographic Verification (Hashing)

Each audit log entry includes a cryptographic hash for integrity verification.

#### Hash Generation Algorithm

```typescript
import { createHash } from 'crypto';

interface AuditLogEntry {
  sequence_number: number;
  event_type: string;
  event_category: string;
  severity: string;
  timestamp: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_ip_address: string | null;
  resource_type: string | null;
  resource_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  correlation_id: string | null;
}

/**
 * Generate SHA-256 hash for an audit log entry
 * Hash includes all immutable fields to detect any tampering
 */
function generateAuditLogHash(
  entry: AuditLogEntry,
  previousHash: string | null
): string {
  // Create deterministic string representation
  const hashInput = JSON.stringify({
    sequence_number: entry.sequence_number,
    event_type: entry.event_type,
    event_category: entry.event_category,
    severity: entry.severity,
    timestamp: entry.timestamp,
    actor_user_id: entry.actor_user_id,
    actor_email: entry.actor_email,
    actor_ip_address: entry.actor_ip_address,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    action: entry.action,
    old_data: entry.old_data,
    new_data: entry.new_data,
    metadata: entry.metadata,
    correlation_id: entry.correlation_id,
    previous_hash: previousHash,
  }, Object.keys); // Sort keys for deterministic output

  return createHash('sha256').update(hashInput).digest('hex');
}
```

#### Database Function for Hash Computation

```sql
-- Function to compute hash for new audit log entries
CREATE OR REPLACE FUNCTION compute_audit_log_hash()
RETURNS TRIGGER AS $$
DECLARE
  previous_record RECORD;
  hash_input TEXT;
BEGIN
  -- Get the previous entry's hash
  SELECT hash INTO previous_record
  FROM immutable_audit_logs
  WHERE sequence_number = (
    SELECT MAX(sequence_number) FROM immutable_audit_logs
  );

  -- Set previous_hash
  NEW.previous_hash := previous_record.hash;

  -- Create deterministic JSON for hashing
  hash_input := jsonb_build_object(
    'sequence_number', NEW.sequence_number,
    'event_type', NEW.event_type,
    'event_category', NEW.event_category,
    'severity', NEW.severity,
    'timestamp', NEW.timestamp,
    'actor_user_id', NEW.actor_user_id,
    'actor_email', NEW.actor_email,
    'actor_ip_address', NEW.actor_ip_address,
    'resource_type', NEW.resource_type,
    'resource_id', NEW.resource_id,
    'action', NEW.action,
    'old_data', NEW.old_data,
    'new_data', NEW.new_data,
    'metadata', NEW.metadata,
    'correlation_id', NEW.correlation_id,
    'previous_hash', NEW.previous_hash
  )::text;

  -- Compute SHA-256 hash
  NEW.hash := encode(sha256(hash_input::bytea), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to compute hash before insert
CREATE TRIGGER compute_hash_before_insert
  BEFORE INSERT ON immutable_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION compute_audit_log_hash();
```

### Tamper Detection

#### Chain Verification Function

```sql
-- Function to verify audit log chain integrity
CREATE OR REPLACE FUNCTION verify_audit_log_integrity(
  start_sequence BIGINT DEFAULT 1,
  end_sequence BIGINT DEFAULT NULL
)
RETURNS TABLE(
  sequence_number BIGINT,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  current_record RECORD;
  computed_hash TEXT;
  expected_previous_hash TEXT;
  hash_input TEXT;
BEGIN
  -- Default to latest if end not specified
  IF end_sequence IS NULL THEN
    SELECT MAX(al.sequence_number) INTO end_sequence FROM immutable_audit_logs al;
  END IF;

  expected_previous_hash := NULL;

  FOR current_record IN
    SELECT * FROM immutable_audit_logs al
    WHERE al.sequence_number >= start_sequence
      AND al.sequence_number <= end_sequence
    ORDER BY al.sequence_number ASC
  LOOP
    -- Check previous hash linkage
    IF current_record.sequence_number > start_sequence THEN
      IF current_record.previous_hash IS DISTINCT FROM expected_previous_hash THEN
        RETURN QUERY SELECT
          current_record.sequence_number,
          FALSE,
          'Previous hash mismatch: chain broken';
        CONTINUE;
      END IF;
    END IF;

    -- Recompute hash
    hash_input := jsonb_build_object(
      'sequence_number', current_record.sequence_number,
      'event_type', current_record.event_type,
      'event_category', current_record.event_category,
      'severity', current_record.severity,
      'timestamp', current_record.timestamp,
      'actor_user_id', current_record.actor_user_id,
      'actor_email', current_record.actor_email,
      'actor_ip_address', current_record.actor_ip_address,
      'resource_type', current_record.resource_type,
      'resource_id', current_record.resource_id,
      'action', current_record.action,
      'old_data', current_record.old_data,
      'new_data', current_record.new_data,
      'metadata', current_record.metadata,
      'correlation_id', current_record.correlation_id,
      'previous_hash', current_record.previous_hash
    )::text;

    computed_hash := encode(sha256(hash_input::bytea), 'hex');

    IF computed_hash != current_record.hash THEN
      RETURN QUERY SELECT
        current_record.sequence_number,
        FALSE,
        'Hash mismatch: entry has been tampered';
    ELSE
      RETURN QUERY SELECT
        current_record.sequence_number,
        TRUE,
        NULL::TEXT;
    END IF;

    expected_previous_hash := current_record.hash;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Scheduled Integrity Check

```sql
-- Scheduled job to verify audit log integrity
SELECT cron.schedule(
  'audit-log-integrity-check',
  '0 4 * * *',  -- Daily at 4 AM UTC
  $$
  DO $$
  DECLARE
    invalid_count INTEGER;
    last_verified BIGINT;
  BEGIN
    -- Get last verified sequence number (stored in a config table)
    SELECT COALESCE(MAX(sequence_number), 0) INTO last_verified
    FROM immutable_audit_logs
    WHERE verified_at IS NOT NULL;

    -- Verify new entries since last check
    SELECT COUNT(*) INTO invalid_count
    FROM verify_audit_log_integrity(last_verified + 1, NULL)
    WHERE is_valid = FALSE;

    IF invalid_count > 0 THEN
      -- Log critical alert
      INSERT INTO immutable_audit_logs (
        event_type, event_category, severity, action, metadata
      ) VALUES (
        'security.audit.integrity_failure',
        'security',
        'critical',
        'integrity_check',
        jsonb_build_object(
          'invalid_entries', invalid_count,
          'check_range_start', last_verified + 1
        )
      );

      -- Trigger alert (via webhook, email, etc.)
      PERFORM pg_notify('audit_integrity_alert',
        json_build_object('invalid_count', invalid_count)::text
      );
    END IF;
  END;
  $$ LANGUAGE plpgsql;
  $$
);
```

---

## Implementation Options

### Option 1: Supabase with RLS (Append-Only Table) - Recommended

**Best for:** MeJohnC.Org's current architecture using Supabase

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
│  (React Frontend + Supabase Edge Functions)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Database                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              immutable_audit_logs                        │   │
│  │  - RLS: INSERT only for service role                    │   │
│  │  - RLS: SELECT for admin role                           │   │
│  │  - Triggers: Block UPDATE/DELETE                        │   │
│  │  - Hash chain for integrity                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Database Triggers (Automatic Logging)            │   │
│  │  - AFTER INSERT/UPDATE/DELETE on monitored tables       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Pros

- Integrated with existing Supabase infrastructure
- Row Level Security provides fine-grained access control
- Database triggers ensure automatic logging
- No additional services or costs
- Real-time subscriptions for monitoring
- Backup included in Supabase managed service

#### Cons

- Database administrator could theoretically bypass triggers
- Relies on Supabase's infrastructure security
- Hash verification is application-level, not hardware-enforced

#### Implementation Effort

- Setup: 2-4 hours
- Integration: 4-8 hours
- Testing: 2-4 hours

### Option 2: External Audit Service

**Best for:** Organizations requiring third-party attestation

#### Options

| Service | Features | Pricing |
|---------|----------|---------|
| **Axiom** | Immutable datasets, SOC2, GDPR | Free tier + $25/mo |
| **Datadog Log Management** | Compliance archives, indexes | $0.10/GB |
| **AWS CloudTrail** | WORM storage, KMS encryption | $2/100K events |
| **Splunk** | Enterprise compliance, SIEM | Contact sales |

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐    ┌─────────────────────────────────────────┐
│ Supabase        │    │ External Audit Service                  │
│ (operational    │    │ (immutable archive)                     │
│  audit logs)    │    │ - Write-once storage                    │
│                 │    │ - Third-party attestation               │
│                 │    │ - Legal hold support                    │
└─────────────────┘    └─────────────────────────────────────────┘
```

#### Pros

- True separation of concerns
- Third-party attestation for compliance
- Often includes built-in SIEM features
- Hardware-level immutability options

#### Cons

- Additional service cost
- Added complexity
- Data transfer latency
- Dependency on external service availability

### Option 3: Cloud Storage with WORM (Write Once Read Many)

**Best for:** Long-term archival and regulatory compliance

#### Options

| Service | WORM Feature | Compliance |
|---------|--------------|------------|
| **AWS S3 Object Lock** | Governance/Compliance modes | SEC 17a-4, CFTC |
| **Azure Blob Immutable** | Time-based/Legal hold | SEC, FINRA |
| **GCP Cloud Storage** | Retention policies | Various |

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Database                               │
│  (Hot storage: recent audit logs, queryable)                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Periodic export (daily/weekly)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloud Storage with WORM                             │
│  (Cold storage: archived logs, compliance retention)            │
│  - S3 Object Lock / Azure Immutable / GCP Retention            │
│  - Cryptographically signed manifests                          │
│  - Legal hold capability                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Pros

- Hardware-enforced immutability
- Regulatory compliance certifications
- Cost-effective for long-term storage
- Supports legal hold at storage level

#### Cons

- Not queryable without extraction
- Export/archive process required
- Query latency for historical data
- Additional infrastructure to manage

### Recommended Approach for MeJohnC.Org

**Primary: Supabase with RLS (Option 1)**

Use Supabase as the primary audit log storage with:
- Database triggers for automatic logging
- RLS for access control
- Hash chains for integrity verification
- Real-time monitoring capabilities

**Secondary: Cloud Storage Archive (Option 3)**

For long-term compliance:
- Weekly export to S3 with Object Lock
- Cryptographically signed manifests
- 7-year retention for compliance

```typescript
// Hybrid approach implementation
interface AuditStorageConfig {
  primary: {
    type: 'supabase';
    table: 'immutable_audit_logs';
    retention: '1 year';  // Hot storage
  };
  archive: {
    type: 's3';
    bucket: 'mejohnc-audit-archive';
    objectLock: 'COMPLIANCE';
    retention: '7 years';  // Cold storage
  };
  exportSchedule: 'weekly';
}
```

---

## Legal Hold Implementation

### Overview

Legal hold (litigation hold) is a process to preserve all relevant information when litigation is reasonably anticipated or pending. Audit logs under legal hold must be preserved regardless of normal retention policies.

### Legal Hold Data Model

```sql
-- Legal hold tracking table
CREATE TABLE legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_name TEXT NOT NULL,
  hold_type TEXT NOT NULL CHECK (hold_type IN ('litigation', 'regulatory', 'investigation', 'audit')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),

  -- Scope
  scope_description TEXT NOT NULL,
  scope_criteria JSONB NOT NULL,  -- Query criteria for affected records

  -- Timeline
  matter_date DATE,                -- Date of incident/matter
  hold_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hold_end_date TIMESTAMPTZ,

  -- Chain of Custody
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_by TEXT,
  released_at TIMESTAMPTZ,
  release_reason TEXT,

  -- Documentation
  legal_counsel TEXT,
  case_reference TEXT,
  notes TEXT,

  -- Audit
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by TEXT
);

-- Legal hold audit trail (also immutable)
CREATE TABLE legal_hold_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id UUID NOT NULL REFERENCES legal_holds(id),
  event_type TEXT NOT NULL,  -- created, modified, released, reviewed, accessed
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  details JSONB,

  -- Immutability
  hash TEXT NOT NULL,
  previous_hash TEXT
);

-- Index for efficient hold lookups
CREATE INDEX idx_legal_holds_status ON legal_holds(status) WHERE status = 'active';
CREATE INDEX idx_legal_holds_dates ON legal_holds(hold_start_date, hold_end_date);
```

### Applying Legal Hold

```sql
-- Function to apply legal hold to audit logs
CREATE OR REPLACE FUNCTION apply_legal_hold(
  p_hold_id UUID,
  p_criteria JSONB,
  p_applied_by TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
  criteria_json JSONB;
BEGIN
  -- Validate hold exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM legal_holds
    WHERE id = p_hold_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Legal hold % not found or not active', p_hold_id;
  END IF;

  -- Build dynamic criteria from JSON
  -- Supports: date_range, event_types, user_ids, resource_types

  -- Apply hold to matching audit logs
  UPDATE immutable_audit_logs
  SET
    legal_hold = TRUE,
    legal_hold_id = p_hold_id,
    legal_hold_applied_at = NOW(),
    legal_hold_applied_by = p_applied_by
  WHERE
    legal_hold = FALSE
    AND (
      (p_criteria->>'date_start' IS NULL OR timestamp >= (p_criteria->>'date_start')::timestamptz)
      AND (p_criteria->>'date_end' IS NULL OR timestamp <= (p_criteria->>'date_end')::timestamptz)
      AND (p_criteria->>'event_types' IS NULL OR event_type = ANY(ARRAY(SELECT jsonb_array_elements_text(p_criteria->'event_types'))))
      AND (p_criteria->>'user_ids' IS NULL OR actor_user_id = ANY(ARRAY(SELECT jsonb_array_elements_text(p_criteria->'user_ids'))))
      AND (p_criteria->>'resource_types' IS NULL OR resource_type = ANY(ARRAY(SELECT jsonb_array_elements_text(p_criteria->'resource_types'))))
    );

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Log the legal hold application
  INSERT INTO legal_hold_events (hold_id, event_type, actor_user_id, actor_email, details)
  VALUES (
    p_hold_id,
    'applied',
    p_applied_by,
    (SELECT user_email FROM admin_users WHERE user_id = p_applied_by),
    jsonb_build_object(
      'criteria', p_criteria,
      'records_affected', affected_count
    )
  );

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Releasing Legal Hold

```sql
-- Function to release legal hold (with proper authorization)
CREATE OR REPLACE FUNCTION release_legal_hold(
  p_hold_id UUID,
  p_released_by TEXT,
  p_release_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  hold_record RECORD;
BEGIN
  -- Get hold details
  SELECT * INTO hold_record
  FROM legal_holds
  WHERE id = p_hold_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal hold % not found or already released', p_hold_id;
  END IF;

  -- Update legal hold status
  UPDATE legal_holds
  SET
    status = 'released',
    released_by = p_released_by,
    released_at = NOW(),
    release_reason = p_release_reason
  WHERE id = p_hold_id;

  -- Remove hold from audit logs
  -- Note: This does NOT delete the logs, just removes the hold flag
  UPDATE immutable_audit_logs
  SET
    legal_hold = FALSE,
    legal_hold_id = NULL
    -- Keep legal_hold_applied_at and legal_hold_applied_by for historical reference
  WHERE legal_hold_id = p_hold_id;

  -- Log the release
  INSERT INTO legal_hold_events (hold_id, event_type, actor_user_id, actor_email, details)
  VALUES (
    p_hold_id,
    'released',
    p_released_by,
    (SELECT user_email FROM admin_users WHERE user_id = p_released_by),
    jsonb_build_object('release_reason', p_release_reason)
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Chain of Custody

Maintain a complete chain of custody for all legal hold operations:

```typescript
interface ChainOfCustodyEntry {
  hold_id: string;
  action: 'created' | 'applied' | 'accessed' | 'exported' | 'reviewed' | 'released';
  timestamp: string;
  actor: {
    user_id: string;
    email: string;
    role: string;
  };
  details: {
    purpose?: string;
    records_affected?: number;
    export_format?: string;
    access_query?: string;
    review_notes?: string;
    release_reason?: string;
  };
  verification: {
    hash: string;
    previous_hash: string;
  };
}
```

### Legal Hold API Endpoints

```typescript
// Supabase Edge Function for legal hold management
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { action, ...params } = await req.json();

  switch (action) {
    case 'create':
      // Create new legal hold
      return createLegalHold(supabase, params);

    case 'apply':
      // Apply hold to matching records
      return applyLegalHold(supabase, params);

    case 'release':
      // Release hold (requires authorization)
      return releaseLegalHold(supabase, params);

    case 'export':
      // Export held records for legal
      return exportHeldRecords(supabase, params);

    case 'list':
      // List active holds
      return listLegalHolds(supabase, params);

    default:
      return new Response(
        JSON.stringify({ error: 'Unknown action' }),
        { status: 400 }
      );
  }
});

async function createLegalHold(supabase, params) {
  const { hold_name, hold_type, scope_description, scope_criteria, created_by, legal_counsel, case_reference } = params;

  const { data, error } = await supabase
    .from('legal_holds')
    .insert({
      hold_name,
      hold_type,
      scope_description,
      scope_criteria,
      created_by,
      legal_counsel,
      case_reference
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Log creation event
  await supabase.rpc('log_legal_hold_event', {
    p_hold_id: data.id,
    p_event_type: 'created',
    p_actor_user_id: created_by,
    p_details: { hold_name, scope_description }
  });

  return new Response(JSON.stringify({ success: true, hold: data }));
}
```

---

## Compliance Requirements

### GDPR (General Data Protection Regulation)

#### Relevant Articles

| Article | Requirement | Audit Log Implementation |
|---------|-------------|--------------------------|
| Article 5(1)(f) | Integrity and confidentiality | Hash chains, access controls |
| Article 17 | Right to erasure | Anonymization (not deletion) of user PII in logs |
| Article 25 | Data protection by design | Privacy-preserving logging |
| Article 30 | Records of processing activities | Audit logs document processing |
| Article 32 | Security of processing | Immutable logs detect breaches |
| Article 33 | Breach notification | Audit logs provide evidence |

#### GDPR-Compliant Logging Practices

```typescript
// GDPR-compliant audit log entry
interface GDPRCompliantAuditLog {
  // Identifiable data (subject to GDPR)
  actor: {
    user_id: string;           // Pseudonymized ID
    email_hash?: string;       // Hash, not actual email (for analytics)
    ip_address?: string;       // Anonymize after 90 days
  };

  // Non-identifiable metadata
  event_type: string;
  timestamp: string;
  action: string;

  // Data changes (may contain PII)
  changes: {
    old_data: Record<string, unknown>;  // Redact sensitive fields
    new_data: Record<string, unknown>;  // Redact sensitive fields
    changed_fields: string[];           // Safe to retain
  };
}

// GDPR anonymization for audit logs older than retention period
async function anonymizeAuditLogsForGDPR(olderThanDays: number = 365) {
  await supabase.rpc('anonymize_old_audit_logs', {
    p_days_old: olderThanDays
  });
}
```

#### Right to Erasure in Audit Logs

Audit logs cannot be deleted, but PII can be anonymized while preserving the audit trail:

```sql
-- Anonymize user data in audit logs (for GDPR erasure requests)
CREATE OR REPLACE FUNCTION anonymize_user_in_audit_logs(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE immutable_audit_logs
  SET
    actor_email = '[GDPR_ERASED]',
    actor_ip_address = NULL,
    actor_user_agent = NULL,
    -- Note: We keep actor_user_id as pseudonymized reference
    -- and add metadata noting the erasure
    metadata = metadata || jsonb_build_object(
      'gdpr_erasure', jsonb_build_object(
        'erased_at', NOW(),
        'original_email_hash', encode(sha256(actor_email::bytea), 'hex')
      )
    )
  WHERE actor_user_id = p_user_id
    AND actor_email != '[GDPR_ERASED]'
    AND legal_hold = FALSE;  -- Cannot anonymize records under legal hold

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Log the GDPR erasure action
  INSERT INTO immutable_audit_logs (
    event_type, event_category, severity, action,
    resource_type, resource_id, metadata
  ) VALUES (
    'admin.gdpr.audit_anonymization',
    'admin',
    'warning',
    'anonymize',
    'user',
    p_user_id,
    jsonb_build_object('records_anonymized', affected_count)
  );

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### SOC 2 (Service Organization Control 2)

#### Trust Service Criteria

| Criteria | Category | Audit Log Requirements |
|----------|----------|------------------------|
| CC6.1 | Logical Access | Log all authentication events |
| CC6.2 | System Operations | Log configuration changes |
| CC6.3 | Change Management | Log code/infrastructure changes |
| CC7.2 | Security Monitoring | Real-time anomaly detection |
| CC7.3 | Security Incident | Log all security events |
| CC7.4 | Vulnerability Management | Log security scan results |

#### SOC 2 Audit Log Controls

```yaml
# SOC 2 Control Mapping
controls:
  CC6.1_LogicalAccess:
    events:
      - auth.login.success
      - auth.login.failure
      - auth.logout
      - auth.session.*
      - auth.mfa.*
    retention: 1 year minimum
    review: Weekly

  CC6.2_SystemOperations:
    events:
      - config.*
      - admin.maintenance.*
      - admin.backup.*
    retention: 1 year minimum
    review: Monthly

  CC6.3_ChangeManagement:
    events:
      - data.create
      - data.update
      - data.delete
      - config.rls.*
    retention: 1 year minimum
    review: Per change

  CC7.2_SecurityMonitoring:
    events:
      - security.*
    retention: 1 year minimum
    review: Real-time + Daily
    alerts: Immediate for critical

  CC7.3_SecurityIncident:
    events:
      - security.breach.*
      - security.suspicious.*
    retention: 3 years minimum (or as required by incident)
    review: Immediate
    legal_hold: Automatic for incidents
```

#### SOC 2 Evidence Generation

```sql
-- Generate SOC 2 evidence report for auditors
CREATE OR REPLACE FUNCTION generate_soc2_audit_report(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_criteria TEXT[]  -- Array of SOC 2 criteria codes
)
RETURNS TABLE(
  criteria TEXT,
  control_description TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  sample_events JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.criteria,
    c.description,
    COUNT(*)::BIGINT as event_count,
    COUNT(DISTINCT al.actor_user_id)::BIGINT as unique_users,
    jsonb_agg(
      jsonb_build_object(
        'id', al.id,
        'timestamp', al.timestamp,
        'event_type', al.event_type,
        'actor', al.actor_email
      ) ORDER BY al.timestamp DESC
    ) FILTER (WHERE al.rn <= 5) as sample_events
  FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY event_category ORDER BY timestamp DESC) as rn
    FROM immutable_audit_logs
    WHERE timestamp BETWEEN p_start_date AND p_end_date
  ) al
  JOIN soc2_criteria_mapping c ON al.event_category = c.event_category
  WHERE c.criteria = ANY(p_criteria)
  GROUP BY c.criteria, c.description;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Compliance Checklist

```markdown
## Audit Logging Compliance Checklist

### GDPR Compliance
- [ ] All processing activities are logged
- [ ] Audit logs include lawful basis for data processing
- [ ] PII in logs can be anonymized upon erasure request
- [ ] Retention periods are documented and enforced
- [ ] Access to audit logs is restricted and logged
- [ ] Data breach events are logged with full context
- [ ] Legal hold prevents erasure of relevant logs

### SOC 2 Compliance
- [ ] All logical access events are logged (CC6.1)
- [ ] System operation changes are logged (CC6.2)
- [ ] Change management events are logged (CC6.3)
- [ ] Security events trigger real-time alerts (CC7.2)
- [ ] Security incidents are fully logged (CC7.3)
- [ ] Audit logs are immutable and tamper-evident
- [ ] Log retention meets minimum requirements (1 year)
- [ ] Regular log reviews are documented
- [ ] Audit evidence can be generated on demand

### General Best Practices
- [ ] Audit logs use append-only storage
- [ ] Hash chains verify log integrity
- [ ] Log timestamps use UTC
- [ ] Correlation IDs link related events
- [ ] Sensitive data is masked/hashed
- [ ] Log access is itself audited
- [ ] Backup and recovery procedures exist
- [ ] Integrity verification runs automatically
```

---

## Log Storage and Retention

### Retention Policy by Event Category

| Category | Hot Storage | Cold Archive | Total Retention | Legal Basis |
|----------|-------------|--------------|-----------------|-------------|
| Authentication | 1 year | 2 years | 3 years | Security investigation |
| Authorization | 1 year | 2 years | 3 years | Access audit |
| Data Changes | 1 year | 6 years | 7 years | Business records, tax |
| Admin Actions | 1 year | 6 years | 7 years | Compliance |
| Configuration | 1 year | 6 years | 7 years | Change management |
| Security Events | 1 year | 6 years | 7 years | Forensics |

### Storage Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hot Storage (Supabase)                        │
│  - Recent logs (< 1 year)                                       │
│  - Fully queryable                                               │
│  - Real-time access                                              │
│  - ~50-100 MB/month estimated                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Weekly export
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Warm Storage (S3 Standard)                     │
│  - 1-2 year old logs                                            │
│  - Queryable via Athena                                         │
│  - Minutes to access                                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Annual archive
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Cold Storage (S3 Glacier/Object Lock)             │
│  - 2-7 year old logs                                            │
│  - WORM compliance                                              │
│  - Hours to retrieve                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Automated Retention Enforcement

```sql
-- Scheduled job to archive old audit logs
SELECT cron.schedule(
  'audit-log-archive',
  '0 3 * * 0',  -- Weekly on Sunday at 3 AM
  $$
  DO $$
  DECLARE
    archive_cutoff TIMESTAMPTZ := NOW() - INTERVAL '1 year';
    records_to_archive INTEGER;
  BEGIN
    -- Count records to archive
    SELECT COUNT(*) INTO records_to_archive
    FROM immutable_audit_logs
    WHERE timestamp < archive_cutoff
      AND archived = FALSE
      AND legal_hold = FALSE;

    IF records_to_archive > 0 THEN
      -- Export to S3 (via edge function)
      PERFORM net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/archive-audit-logs',
        headers := '{"Authorization": "Bearer service_role_key"}'::jsonb,
        body := json_build_object(
          'cutoff_date', archive_cutoff,
          'record_count', records_to_archive
        )::jsonb
      );

      -- Mark as archived (don't delete from hot storage yet)
      UPDATE immutable_audit_logs
      SET archived = TRUE,
          archived_at = NOW()
      WHERE timestamp < archive_cutoff
        AND archived = FALSE
        AND legal_hold = FALSE;
    END IF;
  END;
  $$ LANGUAGE plpgsql;
  $$
);

-- Scheduled job to delete from hot storage (after confirmed archive)
SELECT cron.schedule(
  'audit-log-cleanup',
  '0 4 * * 0',  -- Weekly on Sunday at 4 AM (after archive)
  $$
  DO $$
  DECLARE
    cleanup_cutoff TIMESTAMPTZ := NOW() - INTERVAL '13 months';  -- Keep 13 months in hot
  BEGIN
    -- Only delete records that have been archived
    -- This requires special authorization set by the job
    SET LOCAL app.audit_delete_authorized = 'true';

    DELETE FROM immutable_audit_logs
    WHERE timestamp < cleanup_cutoff
      AND archived = TRUE
      AND legal_hold = FALSE;

    RESET app.audit_delete_authorized;
  END;
  $$ LANGUAGE plpgsql;
  $$
);
```

### Storage Cost Estimation

| Storage Tier | Volume (Est.) | Cost/Month |
|--------------|---------------|------------|
| Supabase (Hot) | 100 MB | Included in plan |
| S3 Standard (Warm) | 500 MB | ~$0.01 |
| S3 Glacier (Cold) | 2 GB | ~$0.01 |
| **Total** | ~2.6 GB | ~$0.02/month |

---

## Access Controls for Audit Logs

### Role-Based Access

| Role | Read Logs | Query History | Export | Legal Hold | Admin |
|------|-----------|---------------|--------|------------|-------|
| Viewer | Limited | No | No | No | No |
| Admin | Yes | Yes | No | No | No |
| Super Admin | Yes | Yes | Yes | View | No |
| Security Officer | Yes | Yes | Yes | Full | Yes |
| Auditor (External) | Time-limited | Time-limited | Time-limited | View | No |

### RLS Policies for Access Control

```sql
-- Base read policy for admin users
CREATE POLICY "Admin read access to audit logs"
  ON immutable_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()::text
      AND admin_users.role IN ('admin', 'super_admin', 'security_officer')
    )
  );

-- Restricted access for viewers (only their own actions)
CREATE POLICY "Viewers can see own audit logs"
  ON immutable_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    actor_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()::text
      AND admin_users.role IN ('admin', 'super_admin', 'security_officer')
    )
  );

-- Time-limited access for external auditors
CREATE POLICY "External auditor time-limited access"
  ON immutable_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auditor_access_grants
      WHERE auditor_access_grants.auditor_user_id = auth.uid()::text
      AND auditor_access_grants.valid_from <= NOW()
      AND auditor_access_grants.valid_until >= NOW()
      AND auditor_access_grants.scope @> jsonb_build_object('table', 'immutable_audit_logs')
    )
    AND timestamp BETWEEN (
      SELECT audit_start_date FROM auditor_access_grants
      WHERE auditor_user_id = auth.uid()::text
    ) AND (
      SELECT audit_end_date FROM auditor_access_grants
      WHERE auditor_user_id = auth.uid()::text
    )
  );
```

### Audit Log Access Logging

Access to audit logs must itself be audited:

```sql
-- Trigger to log audit log access
CREATE OR REPLACE FUNCTION log_audit_log_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log significant access (not every row)
  -- Log once per query session
  IF NOT EXISTS (
    SELECT 1 FROM audit_access_log
    WHERE session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
    AND accessed_at > NOW() - INTERVAL '1 minute'
  ) THEN
    INSERT INTO audit_access_log (
      user_id,
      session_id,
      query_type,
      accessed_at
    ) VALUES (
      auth.uid()::text,
      current_setting('request.jwt.claims', true)::json->>'session_id',
      TG_OP,
      NOW()
    );
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_audit_access
  AFTER SELECT ON immutable_audit_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_audit_log_access();
```

---

## Monitoring and Alerting

### Real-Time Monitoring

```sql
-- Enable real-time subscriptions for critical audit events
-- (Requires Supabase Realtime)

-- Subscribe to critical security events
CREATE PUBLICATION audit_critical_events
  FOR TABLE immutable_audit_logs
  WHERE (severity = 'critical');
```

### Alert Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Auth Failure Spike | >10 failures in 5 min | P1 | Page on-call |
| Unauthorized Access | authz.access.denied spike | P2 | Slack alert |
| Config Change | Any config.* event | P3 | Email notification |
| Bulk Data Operation | bulk_delete or bulk_update | P2 | Slack + log review |
| Integrity Failure | Hash chain broken | P1 | Page + incident |
| Legal Hold Applied | New legal hold | P3 | Email legal team |
| Suspicious Activity | Anomaly detection trigger | P2 | Security review |

### Alert Implementation

```typescript
// Supabase Edge Function for audit alerts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AuditAlert {
  rule_name: string;
  severity: 'P1' | 'P2' | 'P3';
  event_type: string;
  event_count: number;
  time_window: string;
  details: Record<string, unknown>;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Check for auth failure spike
  const authFailures = await supabase
    .from('immutable_audit_logs')
    .select('count', { count: 'exact' })
    .eq('event_type', 'auth.login.failure')
    .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (authFailures.count && authFailures.count > 10) {
    await sendAlert({
      rule_name: 'Auth Failure Spike',
      severity: 'P1',
      event_type: 'auth.login.failure',
      event_count: authFailures.count,
      time_window: '5 minutes',
      details: { threshold: 10 }
    });
  }

  // Check for integrity failures
  const integrityCheck = await supabase.rpc('verify_audit_log_integrity', {
    start_sequence: null,  // Check recent
    end_sequence: null
  });

  const invalidEntries = integrityCheck.data?.filter(e => !e.is_valid);
  if (invalidEntries?.length > 0) {
    await sendAlert({
      rule_name: 'Audit Log Integrity Failure',
      severity: 'P1',
      event_type: 'security.audit.integrity_failure',
      event_count: invalidEntries.length,
      time_window: 'latest check',
      details: { invalid_sequences: invalidEntries.map(e => e.sequence_number) }
    });
  }

  return new Response(JSON.stringify({ success: true }));
});

async function sendAlert(alert: AuditAlert) {
  // Send to Slack
  if (alert.severity === 'P1') {
    await fetch(Deno.env.get('SLACK_WEBHOOK_URL')!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[${alert.severity}] ${alert.rule_name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${alert.rule_name}*\nSeverity: ${alert.severity}\nEvent: ${alert.event_type}\nCount: ${alert.event_count} in ${alert.time_window}`
            }
          }
        ]
      })
    });
  }

  // Log alert to audit log
  await supabase.from('immutable_audit_logs').insert({
    event_type: 'security.alert.triggered',
    event_category: 'security',
    severity: alert.severity === 'P1' ? 'critical' : 'warning',
    action: 'alert',
    metadata: alert
  });
}
```

### Dashboard Queries

```sql
-- Real-time audit dashboard metrics

-- Event volume by category (last 24 hours)
SELECT
  event_category,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_count
FROM immutable_audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_category;

-- Top actors by activity
SELECT
  actor_email,
  COUNT(*) as action_count,
  array_agg(DISTINCT event_type) as event_types
FROM immutable_audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND actor_user_id IS NOT NULL
GROUP BY actor_email
ORDER BY action_count DESC
LIMIT 10;

-- Security events timeline
SELECT
  date_trunc('hour', timestamp) as hour,
  event_type,
  COUNT(*) as count
FROM immutable_audit_logs
WHERE event_category = 'security'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', timestamp), event_type
ORDER BY hour DESC;

-- Legal holds status
SELECT
  hold_name,
  hold_type,
  status,
  hold_start_date,
  (SELECT COUNT(*) FROM immutable_audit_logs WHERE legal_hold_id = legal_holds.id) as records_count
FROM legal_holds
WHERE status = 'active';
```

---

## Audit Log Review Procedures

### Regular Review Schedule

| Review Type | Frequency | Scope | Reviewer | Documentation |
|-------------|-----------|-------|----------|---------------|
| Daily Security Review | Daily | Critical events, auth failures | Security team | Slack summary |
| Weekly Audit Summary | Weekly | All events, trends, anomalies | Admin | Weekly report |
| Monthly Compliance Review | Monthly | SOC 2 controls, GDPR compliance | Security officer | Formal report |
| Quarterly External Audit | Quarterly | Full audit, integrity verification | External auditor | Audit certificate |

### Daily Security Review Checklist

```markdown
## Daily Audit Log Security Review

**Date:** _______________
**Reviewer:** _______________

### Authentication Events
- [ ] Review all failed login attempts
  - Count: ___
  - Patterns: _______________
  - Action taken: _______________

- [ ] Review successful logins from new locations/devices
  - Count: ___
  - Suspicious: _______________

- [ ] Review account lockouts
  - Count: ___
  - Legitimate: Yes / No
  - Action taken: _______________

### Authorization Events
- [ ] Review access denied events
  - Count: ___
  - Patterns: _______________

- [ ] Review privilege escalations
  - Count: ___
  - Authorized: Yes / No

### Security Events
- [ ] Review rate limiting triggers
  - Count: ___
  - Attack indicators: _______________

- [ ] Review suspicious activity flags
  - Count: ___
  - Investigation needed: Yes / No

### Critical Events
- [ ] Any critical severity events?
  - Count: ___
  - Details: _______________
  - Incident created: Yes / No / N/A

### Sign-off
- Reviewer signature: _______________
- Escalations: _______________
```

### Monthly Compliance Review

```sql
-- Generate monthly compliance report

SELECT
  'Total Events' as metric,
  COUNT(*)::text as value
FROM immutable_audit_logs
WHERE timestamp >= date_trunc('month', NOW() - INTERVAL '1 month')
  AND timestamp < date_trunc('month', NOW())

UNION ALL

SELECT
  'Critical Events',
  COUNT(*)::text
FROM immutable_audit_logs
WHERE severity = 'critical'
  AND timestamp >= date_trunc('month', NOW() - INTERVAL '1 month')
  AND timestamp < date_trunc('month', NOW())

UNION ALL

SELECT
  'Unique Users',
  COUNT(DISTINCT actor_user_id)::text
FROM immutable_audit_logs
WHERE actor_user_id IS NOT NULL
  AND timestamp >= date_trunc('month', NOW() - INTERVAL '1 month')
  AND timestamp < date_trunc('month', NOW())

UNION ALL

SELECT
  'Integrity Verified',
  CASE WHEN (
    SELECT COUNT(*) FROM verify_audit_log_integrity() WHERE is_valid = FALSE
  ) = 0 THEN 'PASS' ELSE 'FAIL' END

UNION ALL

SELECT
  'Active Legal Holds',
  COUNT(*)::text
FROM legal_holds
WHERE status = 'active'

UNION ALL

SELECT
  'GDPR Requests Processed',
  COUNT(*)::text
FROM immutable_audit_logs
WHERE event_type LIKE 'admin.gdpr.%'
  AND timestamp >= date_trunc('month', NOW() - INTERVAL '1 month')
  AND timestamp < date_trunc('month', NOW());
```

### Incident Investigation Procedure

```markdown
## Audit Log Investigation Procedure

### 1. Initial Assessment
- [ ] Identify time window of interest
- [ ] Identify affected users/resources
- [ ] Establish correlation ID(s)

### 2. Data Collection
- [ ] Query audit logs for correlation ID
- [ ] Query audit logs for affected users
- [ ] Query audit logs for affected resources
- [ ] Export relevant log entries

### 3. Analysis
- [ ] Establish timeline of events
- [ ] Identify initial compromise/trigger
- [ ] Trace lateral movement
- [ ] Identify data accessed/exfiltrated

### 4. Documentation
- [ ] Create incident timeline
- [ ] Document affected systems/data
- [ ] Calculate impact scope
- [ ] Preserve evidence (apply legal hold if needed)

### 5. Remediation
- [ ] Contain threat
- [ ] Eradicate cause
- [ ] Recover systems
- [ ] Implement preventive measures

### 6. Reporting
- [ ] Internal incident report
- [ ] Regulatory notification (if required)
- [ ] Customer notification (if required)
- [ ] Lessons learned documentation
```

---

## Supabase Implementation Guide

### Step 1: Create Schema

Run the following SQL in Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create immutable audit logs table
CREATE TABLE IF NOT EXISTS immutable_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_number BIGSERIAL UNIQUE NOT NULL,

  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (
    event_category IN ('auth', 'authz', 'data', 'admin', 'config', 'security')
  ),
  severity TEXT NOT NULL CHECK (severity IN ('debug', 'info', 'warning', 'critical')),

  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  actor_user_id TEXT,
  actor_email TEXT,
  actor_ip_address TEXT,
  actor_user_agent TEXT,
  actor_session_id TEXT,

  resource_type TEXT,
  resource_id TEXT,
  resource_table TEXT,

  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}',

  correlation_id TEXT,
  request_path TEXT,
  request_method TEXT,

  hash TEXT NOT NULL,
  previous_hash TEXT,

  legal_hold BOOLEAN DEFAULT FALSE,
  legal_hold_id UUID,
  legal_hold_applied_at TIMESTAMPTZ,
  legal_hold_applied_by TEXT,

  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_audit_timestamp ON immutable_audit_logs(timestamp DESC);
CREATE INDEX idx_audit_event_type ON immutable_audit_logs(event_type);
CREATE INDEX idx_audit_event_category ON immutable_audit_logs(event_category);
CREATE INDEX idx_audit_actor_user_id ON immutable_audit_logs(actor_user_id);
CREATE INDEX idx_audit_resource ON immutable_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_correlation ON immutable_audit_logs(correlation_id);
CREATE INDEX idx_audit_severity ON immutable_audit_logs(severity) WHERE severity IN ('warning', 'critical');
CREATE INDEX idx_audit_legal_hold ON immutable_audit_logs(legal_hold) WHERE legal_hold = TRUE;
CREATE INDEX idx_audit_sequence ON immutable_audit_logs(sequence_number);

-- Create legal holds table
CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_name TEXT NOT NULL,
  hold_type TEXT NOT NULL CHECK (hold_type IN ('litigation', 'regulatory', 'investigation', 'audit')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  scope_description TEXT NOT NULL,
  scope_criteria JSONB NOT NULL,
  matter_date DATE,
  hold_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hold_end_date TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_by TEXT,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  legal_counsel TEXT,
  case_reference TEXT,
  notes TEXT,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by TEXT
);
```

### Step 2: Add Immutability Triggers

```sql
-- Prevent modifications
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Modifications are not permitted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON immutable_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON immutable_audit_logs
  FOR EACH ROW
  WHEN (
    current_setting('app.audit_delete_authorized', TRUE) IS NULL OR
    current_setting('app.audit_delete_authorized', TRUE) != 'true'
  )
  EXECUTE FUNCTION prevent_audit_log_modification();
```

### Step 3: Add Hash Computation

```sql
-- Compute hash on insert
CREATE OR REPLACE FUNCTION compute_audit_log_hash()
RETURNS TRIGGER AS $$
DECLARE
  previous_record RECORD;
  hash_input TEXT;
BEGIN
  SELECT hash INTO previous_record
  FROM immutable_audit_logs
  WHERE sequence_number = (
    SELECT MAX(sequence_number) FROM immutable_audit_logs
    WHERE sequence_number < NEW.sequence_number
  );

  NEW.previous_hash := previous_record.hash;

  hash_input := jsonb_build_object(
    'sequence_number', NEW.sequence_number,
    'event_type', NEW.event_type,
    'event_category', NEW.event_category,
    'severity', NEW.severity,
    'timestamp', NEW.timestamp,
    'actor_user_id', NEW.actor_user_id,
    'actor_email', NEW.actor_email,
    'actor_ip_address', NEW.actor_ip_address,
    'resource_type', NEW.resource_type,
    'resource_id', NEW.resource_id,
    'action', NEW.action,
    'old_data', NEW.old_data,
    'new_data', NEW.new_data,
    'metadata', NEW.metadata,
    'correlation_id', NEW.correlation_id,
    'previous_hash', NEW.previous_hash
  )::text;

  NEW.hash := encode(sha256(hash_input::bytea), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_hash_before_insert
  BEFORE INSERT ON immutable_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION compute_audit_log_hash();
```

### Step 4: Enable RLS

```sql
-- Enable RLS
ALTER TABLE immutable_audit_logs ENABLE ROW LEVEL SECURITY;

-- Insert policy (service role only)
CREATE POLICY "Service role can insert audit logs"
  ON immutable_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- Select policy (admins only)
CREATE POLICY "Admins can read audit logs"
  ON immutable_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()::text
      AND admin_users.role IN ('admin', 'super_admin')
    )
  );
```

### Step 5: Create Logging Function

```sql
-- Main audit logging function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_event_category TEXT,
  p_severity TEXT,
  p_action TEXT,
  p_actor_user_id TEXT DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL,
  p_actor_ip_address TEXT DEFAULT NULL,
  p_actor_user_agent TEXT DEFAULT NULL,
  p_actor_session_id TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_resource_table TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_correlation_id TEXT DEFAULT NULL,
  p_request_path TEXT DEFAULT NULL,
  p_request_method TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO immutable_audit_logs (
    event_type, event_category, severity, action,
    actor_user_id, actor_email, actor_ip_address, actor_user_agent, actor_session_id,
    resource_type, resource_id, resource_table,
    old_data, new_data, metadata,
    correlation_id, request_path, request_method
  ) VALUES (
    p_event_type, p_event_category, p_severity, p_action,
    p_actor_user_id, p_actor_email, p_actor_ip_address, p_actor_user_agent, p_actor_session_id,
    p_resource_type, p_resource_id, p_resource_table,
    p_old_data, p_new_data, p_metadata,
    p_correlation_id, p_request_path, p_request_method
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 6: Add Automatic Table Auditing

```sql
-- Generic trigger for auditing any table
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
  v_user_id TEXT;
  v_user_email TEXT;
BEGIN
  -- Determine action
  v_action := LOWER(TG_OP);

  -- Get user context from JWT claims (set by Supabase)
  v_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
  v_user_email := current_setting('request.jwt.claims', true)::json->>'email';

  -- Set old/new data
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSE  -- UPDATE
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  END IF;

  -- Log the event
  PERFORM log_audit_event(
    p_event_type := 'data.' || v_action,
    p_event_category := 'data',
    p_severity := CASE WHEN TG_OP = 'DELETE' THEN 'warning' ELSE 'info' END,
    p_action := v_action,
    p_actor_user_id := v_user_id,
    p_actor_email := v_user_email,
    p_resource_type := TG_TABLE_NAME,
    p_resource_id := COALESCE(
      (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::text,
      'unknown'
    ),
    p_resource_table := TG_TABLE_NAME,
    p_old_data := v_old_data,
    p_new_data := v_new_data
  );

  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable auditing on specific tables
CREATE TRIGGER audit_blog_posts
  AFTER INSERT OR UPDATE OR DELETE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_apps
  AFTER INSERT OR UPDATE OR DELETE ON apps
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_contacts
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_site_content
  AFTER INSERT OR UPDATE OR DELETE ON site_content
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
```

### Step 7: TypeScript Client Integration

```typescript
// src/lib/immutable-audit.ts
import { supabase } from './supabase';

interface AuditEventParams {
  eventType: string;
  eventCategory: 'auth' | 'authz' | 'data' | 'admin' | 'config' | 'security';
  severity: 'debug' | 'info' | 'warning' | 'critical';
  action: string;
  actor?: {
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
  resource?: {
    type?: string;
    id?: string;
    table?: string;
  };
  changes?: {
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  correlationId?: string;
  request?: {
    path?: string;
    method?: string;
  };
}

export async function logAuditEvent(params: AuditEventParams): Promise<string> {
  const { data, error } = await supabase.rpc('log_audit_event', {
    p_event_type: params.eventType,
    p_event_category: params.eventCategory,
    p_severity: params.severity,
    p_action: params.action,
    p_actor_user_id: params.actor?.userId,
    p_actor_email: params.actor?.email,
    p_actor_ip_address: params.actor?.ipAddress,
    p_actor_user_agent: params.actor?.userAgent,
    p_actor_session_id: params.actor?.sessionId,
    p_resource_type: params.resource?.type,
    p_resource_id: params.resource?.id,
    p_resource_table: params.resource?.table,
    p_old_data: params.changes?.oldData,
    p_new_data: params.changes?.newData,
    p_metadata: params.metadata || {},
    p_correlation_id: params.correlationId,
    p_request_path: params.request?.path,
    p_request_method: params.request?.method,
  });

  if (error) throw error;
  return data;
}

// Convenience functions
export const auditAuth = {
  loginSuccess: (userId: string, email: string, metadata?: Record<string, unknown>) =>
    logAuditEvent({
      eventType: 'auth.login.success',
      eventCategory: 'auth',
      severity: 'info',
      action: 'login',
      actor: { userId, email },
      metadata,
    }),

  loginFailure: (email: string, reason: string, metadata?: Record<string, unknown>) =>
    logAuditEvent({
      eventType: 'auth.login.failure',
      eventCategory: 'auth',
      severity: 'warning',
      action: 'login_attempt',
      metadata: { attempted_email: email, reason, ...metadata },
    }),

  logout: (userId: string, email: string) =>
    logAuditEvent({
      eventType: 'auth.logout',
      eventCategory: 'auth',
      severity: 'info',
      action: 'logout',
      actor: { userId, email },
    }),
};

export const auditAdmin = {
  configChange: (userId: string, setting: string, oldValue: unknown, newValue: unknown) =>
    logAuditEvent({
      eventType: 'config.security.changed',
      eventCategory: 'config',
      severity: 'critical',
      action: 'update',
      actor: { userId },
      metadata: { setting, old_value: oldValue, new_value: newValue },
    }),
};
```

### Step 8: Verify Implementation

```sql
-- Test query: Verify audit logging is working
SELECT
  id,
  sequence_number,
  event_type,
  severity,
  timestamp,
  actor_email,
  action,
  hash IS NOT NULL as has_hash,
  previous_hash IS NOT NULL as has_previous_hash
FROM immutable_audit_logs
ORDER BY sequence_number DESC
LIMIT 10;

-- Test query: Verify integrity chain
SELECT * FROM verify_audit_log_integrity()
WHERE is_valid = FALSE;

-- Test query: Attempt modification (should fail)
UPDATE immutable_audit_logs SET severity = 'debug' WHERE id = (
  SELECT id FROM immutable_audit_logs LIMIT 1
);
-- Expected: ERROR: Audit logs are immutable. Modifications are not permitted.
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | Claude Code | Initial version (Issue #60) |

---

## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [SOC 2 Trust Services Criteria](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/trustservices)
- [GDPR Article 30: Records of Processing Activities](https://gdpr-info.eu/art-30-gdpr/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

*This document should be reviewed quarterly or whenever significant changes are made to the audit logging infrastructure.*
