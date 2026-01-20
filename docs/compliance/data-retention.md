# Data Retention Policy

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Document Owner:** Data Protection Officer / Site Administrator
**Related Issue:** #88
**Related Documents:** [GDPR Data Handling](./gdpr-data-handling.md), [PII Handling](./pii-handling.md), [Backup Strategy](../reliability/backup-strategy.md)

---

## Table of Contents

1. [Data Retention Policy Overview](#data-retention-policy-overview)
2. [Data Categories and Retention Periods](#data-categories-and-retention-periods)
3. [Legal Requirements Driving Retention](#legal-requirements-driving-retention)
4. [Implementation](#implementation)
5. [Data Archival vs Deletion](#data-archival-vs-deletion)
6. [Retention Policy Exceptions](#retention-policy-exceptions)
7. [User-Requested Data Deletion](#user-requested-data-deletion)
8. [Retention Policy Audit Procedures](#retention-policy-audit-procedures)
9. [Policy Review Schedule](#policy-review-schedule)

---

## Data Retention Policy Overview

### Purpose

This Data Retention Policy establishes guidelines for how long MeJohnC.Org retains different categories of data, when data should be deleted or archived, and the procedures for implementing retention requirements. The policy ensures compliance with legal requirements (including GDPR), minimizes data risk, and maintains operational efficiency.

### Scope

This policy applies to all data processed by MeJohnC.Org, including:

- Data stored in Supabase (PostgreSQL database)
- Authentication data managed by Clerk
- Analytics data collected via Google Analytics
- Log data across all platforms (Netlify, Supabase, application logs)
- Backup data and archives
- Third-party service data

### Core Principles

1. **Data Minimization**: Retain data only as long as necessary for the stated purpose
2. **Purpose Limitation**: Data collected for one purpose should not be retained beyond that purpose
3. **Legal Compliance**: Meet all regulatory retention requirements (GDPR, business records)
4. **Transparency**: Clear documentation of retention periods for all data types
5. **Secure Disposal**: Data deletion must be complete and irreversible
6. **Auditability**: Maintain records of retention enforcement and data deletion

### Key Stakeholders

| Role | Responsibility |
|------|---------------|
| Data Protection Officer (DPO) | Policy oversight, compliance monitoring, breach notification |
| Site Administrator | Implementation, technical enforcement, operational compliance |
| Development Team | Implementing automated retention, secure deletion procedures |
| Legal/Compliance | Regulatory guidance, legal hold management |

---

## Data Categories and Retention Periods

### Summary Table

| Data Category | Active Retention | Archive Period | Total Retention | Deletion Method |
|---------------|------------------|----------------|-----------------|-----------------|
| User Account Data | Until deletion request or 2 years inactivity | None | Up to 2 years | Hard delete |
| Authentication Logs | 90 days | None | 90 days | Platform-managed |
| Application Logs | 30 days | None | 30 days | Platform-managed |
| Audit Logs | 1 year | None | 1 year | Anonymization |
| Analytics Data | 26 months | None | 26 months | Platform-managed |
| Transactional Data (CRM) | Until manual deletion | None | Indefinite | Hard delete |
| Backup Data | Per backup type | None | 7-90 days | Secure deletion |
| Error Logs | 90 days | None | 90 days | Platform-managed |

### 1. User Account Data

**Description**: Data collected during user registration and profile management via Clerk.

| Data Element | Retention Period | Storage Location | Legal Basis |
|-------------|-----------------|------------------|-------------|
| Email address | Until account deletion or 2 years inactivity | Clerk | Contract performance |
| Full name | Until account deletion | Clerk | Contract performance |
| Profile picture | Until account deletion | Clerk | Consent (optional) |
| User ID | Until account deletion | Clerk + Supabase | Contract performance |
| Admin role mapping | Until account deletion | Supabase (`admin_users`) | Legitimate interest |

**Retention Triggers**:
- User-requested account deletion: Immediate deletion
- 2 years of inactivity: Account flagged for deletion, 30-day grace period
- Administrative removal: Logged and deleted

**Inactivity Definition**:
- No login within 24 months
- No API requests within 24 months
- No email engagement within 24 months

### 2. Authentication Logs

**Description**: Records of authentication attempts, session management, and security events.

| Data Element | Retention Period | Storage Location | Purpose |
|-------------|-----------------|------------------|---------|
| Sign-in attempts | 90 days | Clerk | Security monitoring |
| Session tokens | Session duration (max 30 days) | Clerk + Browser | Session management |
| Failed login attempts | 90 days | Clerk + Audit logs | Fraud detection |
| MFA events | 90 days | Clerk | Security audit |
| Password change events | 90 days | Clerk | Security audit |

**Retention Rationale**:
- 90 days provides sufficient window for security incident investigation
- Aligns with industry best practices for authentication logging
- Exceeds minimum GDPR requirements for security-related processing

**Enforcement**:
- Clerk manages retention automatically per their data retention policies
- Application-side auth logs follow audit log retention (1 year, then anonymized)

### 3. Application Logs

**Description**: General application logs including request logs, debug information, and operational data.

| Log Type | Retention Period | Storage Location | Purpose |
|----------|-----------------|------------------|---------|
| API request logs | 30 days | Supabase Functions / Netlify | Debugging, performance |
| Edge function logs | 7 days (Netlify native) | Netlify | Debugging |
| Frontend console logs | 30 days (if forwarded) | Log aggregator (Axiom) | Debugging |
| Debug logs (non-prod) | 7 days | Log aggregator | Development |

**Retention Rationale**:
- 30 days sufficient for debugging most issues
- Shorter periods for verbose/debug logs to minimize storage costs
- Aligned with platform default retention periods

**Log Aggregation Retention** (if Axiom/Logtail configured):

| Dataset | Retention | Rationale |
|---------|-----------|-----------|
| `mejohnc-requests` | 30 days | API request analysis |
| `mejohnc-errors` | 90 days | Error investigation |
| `mejohnc-audit` | 365 days | Compliance requirements |
| `mejohnc-debug` | 7 days | Short-term debugging |

### 4. Analytics Data

**Description**: Website usage analytics collected via Google Analytics.

| Data Element | Retention Period | Storage Location | Legal Basis |
|-------------|-----------------|------------------|-------------|
| Page views | 26 months | Google Analytics | Consent |
| Session data | 26 months | Google Analytics | Consent |
| Device/browser info | 26 months | Google Analytics | Consent |
| Geographic data (anonymized IP) | 26 months | Google Analytics | Consent |
| User interactions | 26 months | Google Analytics | Consent |
| Web vitals (LCP, FCP, CLS) | 26 months | Google Analytics / Supabase | Legitimate interest |

**Retention Configuration**:
- Google Analytics default: 26 months (recommended setting)
- IP anonymization: Enabled to reduce PII exposure
- User ID collection: Disabled for public visitors

**Google Analytics Settings**:
1. Navigate to Admin > Data Settings > Data Retention
2. Set "Event data retention" to 26 months
3. Enable "Reset user data on new activity" for accurate user counts

### 5. Transactional Data

**Description**: Business data including CRM contacts, email subscribers, and related records.

#### CRM Data (Supabase)

| Table | Data Elements | Retention Period | Deletion Trigger |
|-------|--------------|------------------|------------------|
| `contacts` | Name, email, phone, company, etc. | Until manual deletion | Admin action or GDPR request |
| `interactions` | Meeting notes, communication logs | Until contact deletion (cascade) | Contact deletion |
| `follow_ups` | Scheduled tasks, reminders | Until contact deletion (cascade) | Contact deletion |

**Retention Rationale**:
- Business relationship data retained for ongoing relationship management
- No automatic expiration - data owned by administrator
- Subject to GDPR right to erasure if contact requests deletion

#### Email Marketing Data (Supabase)

| Table | Data Elements | Retention Period | Deletion Trigger |
|-------|--------------|------------------|------------------|
| `email_subscribers` | Email, name, preferences | Until unsubscribe or 2 years inactivity | Unsubscribe / GDPR request |
| `email_events` | Opens, clicks, bounces | 26 months | Automated cleanup |
| `email_campaigns` | Campaign metadata | Indefinite | Manual deletion |

**Inactivity Handling**:
```sql
-- Mark subscribers as inactive after 2 years without engagement
UPDATE email_subscribers
SET status = 'inactive'
WHERE status = 'active'
  AND last_email_opened_at < NOW() - INTERVAL '2 years'
  AND last_email_clicked_at < NOW() - INTERVAL '2 years';
```

#### NPS Survey Data (Supabase)

| Table | Data Elements | Retention Period | Deletion/Anonymization |
|-------|--------------|------------------|------------------------|
| `nps_responses` | Score, feedback | Indefinite (anonymized after 2 years) | PII removed after 2 years |
| `nps_responses` | Email, IP, user agent | 2 years | Anonymized |

**Anonymization Process**:
```sql
-- Anonymize NPS responses older than 2 years
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE responded_at < NOW() - INTERVAL '2 years'
  AND email IS NOT NULL;
```

### 6. Backup Data

**Description**: Database backups, configuration backups, and disaster recovery copies.

| Backup Type | Frequency | Retention Period | Storage Location | Encryption |
|-------------|-----------|------------------|------------------|------------|
| Supabase PITR | Continuous | 7 days | Supabase (managed) | AES-256 |
| Supabase Daily Snapshots | Daily | Per plan tier | Supabase (managed) | AES-256 |
| Manual Full Backup | Weekly | 90 days | Secure off-site | GPG encrypted |
| Manual Critical Tables | Daily | 30 days | Secure off-site | GPG encrypted |
| Schema-Only Backup | Weekly | 1 year | Git repository | None (no PII) |
| Secrets Export | Quarterly | 1 year | Password manager | Encrypted |

**Backup Retention Rationale**:
- 7-day PITR: Sufficient for most recovery scenarios
- 90-day manual backups: Covers extended investigation needs
- 1-year schema retention: Supports historical reference without PII risk

**Backup Cleanup Procedure**:
```bash
#!/bin/bash
# cleanup-old-backups.sh

BACKUP_DIR="/path/to/backups"

# Remove daily backups older than 30 days
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +30 -delete

# Remove weekly backups older than 90 days
find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +90 -delete

# Log cleanup
echo "$(date): Backup cleanup completed" >> "$BACKUP_DIR/cleanup.log"
```

### 7. Audit Logs

**Description**: Security and compliance audit trail for administrative actions.

| Data Element | Retention Period | Storage Location | Purpose |
|-------------|-----------------|------------------|---------|
| User ID | 1 year (then anonymized) | Supabase (`audit_logs`) | Action attribution |
| User email | 1 year (then anonymized) | Supabase (`audit_logs`) | Action attribution |
| IP address | 1 year (then anonymized) | Supabase (`audit_logs`) | Security forensics |
| User agent | 1 year (then anonymized) | Supabase (`audit_logs`) | Security analysis |
| Action details | Indefinite | Supabase (`audit_logs`) | Compliance record |
| Old/new data changes | Indefinite | Supabase (`audit_logs`) | Change tracking |

**Retention Rationale**:
- 1-year identifiable retention: Sufficient for security investigations
- Indefinite action retention (anonymized): Maintains audit trail without PII risk
- Aligns with GDPR principles of storage limitation while meeting security needs

**Anonymization Process**:
```sql
-- Anonymize audit logs older than 1 year
UPDATE audit_logs
SET user_email = '[ANONYMIZED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE created_at < NOW() - INTERVAL '1 year'
  AND user_email IS NOT NULL
  AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]');
```

---

## Legal Requirements Driving Retention

### GDPR Requirements

The General Data Protection Regulation (GDPR) establishes the principle of **storage limitation** (Article 5(1)(e)):

> Personal data shall be kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed.

#### GDPR-Driven Retention Decisions

| Requirement | Implementation |
|-------------|---------------|
| Storage limitation | Define retention periods for all data categories |
| Purpose limitation | Delete data when original purpose is fulfilled |
| Right to erasure | Process deletion requests within 30 days |
| Transparency | Document retention periods in privacy policy |
| Accountability | Maintain records of processing activities |

#### GDPR Retention Exceptions

GDPR permits longer retention when:
1. **Archiving in public interest**: Not applicable to MeJohnC.Org
2. **Scientific/historical research**: Not applicable
3. **Statistical purposes**: NPS scores retained indefinitely (anonymized)
4. **Legal claims**: Legal hold may extend retention
5. **Legal obligations**: Tax/financial records may require longer retention

### Business Requirements

| Requirement | Data Affected | Retention Period | Rationale |
|-------------|--------------|------------------|-----------|
| Relationship management | CRM contacts | Until deleted | Ongoing business need |
| Marketing compliance | Email consent records | Duration of subscription + 2 years | Prove consent if challenged |
| Performance analysis | Analytics data | 26 months | Year-over-year comparison |
| Security monitoring | Auth logs | 90 days | Incident investigation |
| Audit compliance | Audit logs | 1 year identifiable | Compliance audits |
| Disaster recovery | Backups | Per backup type | Business continuity |

### Tax and Financial Records (If Applicable)

If MeJohnC.Org processes financial transactions:

| Record Type | Retention Period | Jurisdiction |
|-------------|-----------------|--------------|
| Transaction records | 7 years | US (IRS) |
| Tax-related documents | 7 years | US (IRS) |
| Business correspondence | 3-7 years | Varies |

**Note**: As a portfolio/personal site, financial record retention requirements are minimal. Consult tax advisor if monetization is added.

### Legal Hold Considerations

#### What is a Legal Hold?

A legal hold (or litigation hold) is a directive to preserve all data potentially relevant to pending or anticipated litigation, government investigation, or audit.

#### Legal Hold Procedures

1. **Trigger Events**:
   - Receipt of litigation notice
   - Government investigation notification
   - Regulatory audit notification
   - Anticipated legal action

2. **When Legal Hold is Active**:
   - Suspend all automated deletion for affected data
   - Preserve backups that would otherwise be deleted
   - Document all preservation actions
   - Notify relevant personnel

3. **Affected Data Categories**:
   - All user data related to the matter
   - All communication records
   - All audit logs
   - All backups within the relevant period

4. **Legal Hold Implementation**:
   ```sql
   -- Add legal_hold flag to relevant records
   ALTER TABLE contacts ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT FALSE;
   ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT FALSE;
   ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT FALSE;

   -- Modify cleanup jobs to respect legal hold
   UPDATE audit_logs
   SET user_email = '[ANONYMIZED]', user_id = NULL, ip_address = NULL, user_agent = NULL
   WHERE created_at < NOW() - INTERVAL '1 year'
     AND user_email IS NOT NULL
     AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')
     AND legal_hold = FALSE;  -- Respect legal hold
   ```

5. **Legal Hold Tracking**:
   - Maintain a register of active legal holds
   - Document start date, scope, and requesting party
   - Review quarterly for release eligibility
   - Document release approval

---

## Implementation

### Automated Deletion Procedures

#### Daily Cleanup Job

```sql
-- gdpr_cleanup_daily.sql
-- Run daily via pg_cron or external scheduler

-- 1. Delete old email events (older than 26 months)
DELETE FROM email_events
WHERE occurred_at < NOW() - INTERVAL '26 months';

-- 2. Clear old IP addresses from NPS responses (older than 90 days for IP)
UPDATE nps_responses
SET ip_address = NULL, user_agent = NULL
WHERE responded_at < NOW() - INTERVAL '90 days'
  AND ip_address IS NOT NULL;

-- 3. Log cleanup action
INSERT INTO audit_logs (action, table_name, details, created_at)
VALUES (
  'automated_cleanup',
  'multiple',
  jsonb_build_object(
    'job', 'gdpr_cleanup_daily',
    'executed_at', NOW()
  ),
  NOW()
);
```

#### Weekly Cleanup Job

```sql
-- gdpr_cleanup_weekly.sql
-- Run weekly (Sunday at 2 AM)

-- 1. Anonymize audit logs older than 1 year
UPDATE audit_logs
SET user_email = '[ANONYMIZED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE created_at < NOW() - INTERVAL '1 year'
  AND user_email IS NOT NULL
  AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')
  AND (legal_hold IS NULL OR legal_hold = FALSE);

-- 2. Anonymize NPS responses older than 2 years
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE responded_at < NOW() - INTERVAL '2 years'
  AND email IS NOT NULL
  AND (legal_hold IS NULL OR legal_hold = FALSE);

-- 3. Flag inactive email subscribers
UPDATE email_subscribers
SET status = 'inactive'
WHERE status = 'active'
  AND last_email_opened_at < NOW() - INTERVAL '2 years'
  AND last_email_clicked_at < NOW() - INTERVAL '2 years';
```

#### Scheduled Job Configuration (pg_cron)

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'gdpr-daily-cleanup',
  '0 3 * * *',  -- Every day at 3 AM
  $$SELECT gdpr_cleanup_daily()$$
);

-- Schedule weekly cleanup on Sunday at 2 AM UTC
SELECT cron.schedule(
  'gdpr-weekly-cleanup',
  '0 2 * * 0',  -- Every Sunday at 2 AM
  $$SELECT gdpr_cleanup_weekly()$$
);

-- Schedule backup cleanup on Sunday at 4 AM UTC
SELECT cron.schedule(
  'backup-cleanup',
  '0 4 * * 0',  -- Every Sunday at 4 AM
  $$SELECT cleanup_old_backups()$$
);
```

### Retention Enforcement in Supabase

#### Database Function for Retention Enforcement

```sql
-- Function: Enforce retention policies across all tables
CREATE OR REPLACE FUNCTION enforce_retention_policies()
RETURNS TABLE(
  table_name TEXT,
  records_affected INTEGER,
  action_taken TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 1. Anonymize old audit logs
  UPDATE audit_logs
  SET user_email = '[ANONYMIZED]',
      user_id = NULL,
      ip_address = NULL,
      user_agent = NULL
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND user_email IS NOT NULL
    AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')
    AND COALESCE(legal_hold, FALSE) = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'audit_logs';
  records_affected := v_count;
  action_taken := 'anonymized';
  RETURN NEXT;

  -- 2. Delete old email events
  DELETE FROM email_events
  WHERE occurred_at < NOW() - INTERVAL '26 months';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'email_events';
  records_affected := v_count;
  action_taken := 'deleted';
  RETURN NEXT;

  -- 3. Anonymize old NPS responses
  UPDATE nps_responses
  SET email = NULL,
      ip_address = NULL,
      user_agent = NULL
  WHERE responded_at < NOW() - INTERVAL '2 years'
    AND email IS NOT NULL
    AND COALESCE(legal_hold, FALSE) = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'nps_responses';
  records_affected := v_count;
  action_taken := 'anonymized';
  RETURN NEXT;

  -- 4. Mark inactive subscribers
  UPDATE email_subscribers
  SET status = 'inactive'
  WHERE status = 'active'
    AND COALESCE(last_email_opened_at, created_at) < NOW() - INTERVAL '2 years'
    AND COALESCE(last_email_clicked_at, created_at) < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'email_subscribers';
  records_affected := v_count;
  action_taken := 'marked_inactive';
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Retention Status Dashboard Query

```sql
-- Query: Check retention compliance status
SELECT
  'audit_logs' as table_name,
  COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '1 year' AND user_email IS NOT NULL AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')) as overdue_for_anonymization,
  COUNT(*) as total_records,
  MIN(created_at) as oldest_record
FROM audit_logs

UNION ALL

SELECT
  'email_events',
  COUNT(*) FILTER (WHERE occurred_at < NOW() - INTERVAL '26 months'),
  COUNT(*),
  MIN(occurred_at)
FROM email_events

UNION ALL

SELECT
  'nps_responses',
  COUNT(*) FILTER (WHERE responded_at < NOW() - INTERVAL '2 years' AND email IS NOT NULL),
  COUNT(*),
  MIN(responded_at)
FROM nps_responses

UNION ALL

SELECT
  'email_subscribers',
  COUNT(*) FILTER (WHERE status = 'active' AND COALESCE(last_email_opened_at, created_at) < NOW() - INTERVAL '2 years'),
  COUNT(*),
  MIN(created_at)
FROM email_subscribers;
```

### Log Rotation Policies

#### Application Log Rotation

| Log Type | Rotation Frequency | Max File Size | Retention | Compression |
|----------|-------------------|---------------|-----------|-------------|
| Access logs | Daily | 100 MB | 30 days | gzip after 1 day |
| Error logs | Daily | 50 MB | 90 days | gzip after 1 day |
| Debug logs | Daily | 200 MB | 7 days | gzip after 1 day |
| Audit logs | Weekly | 50 MB | 1 year | gzip after 1 week |

#### Log Aggregator Configuration (Axiom)

```yaml
# Axiom dataset retention configuration
datasets:
  mejohnc-requests:
    retention_days: 30
    description: "API request logs"

  mejohnc-errors:
    retention_days: 90
    description: "Application error logs"

  mejohnc-audit:
    retention_days: 365
    description: "Security audit logs"

  mejohnc-debug:
    retention_days: 7
    description: "Debug logs (non-production)"
```

#### Netlify Log Drain Retention

Netlify native logs retain for 7 days. For longer retention:
1. Configure log drain to external aggregator
2. Set retention in aggregator per requirements
3. Monitor log volume to manage costs

### Backup Retention Implementation

#### Backup Retention Script

```bash
#!/bin/bash
# backup-retention.sh
# Run weekly to enforce backup retention policies

BACKUP_DIR="/secure/backups"
LOG_FILE="$BACKUP_DIR/retention.log"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log "Starting backup retention enforcement"

# Daily backups: 30 days retention
DAILY_DELETED=$(find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +30 -delete -print | wc -l)
log "Deleted $DAILY_DELETED daily backup files older than 30 days"

# Weekly backups: 90 days retention
WEEKLY_DELETED=$(find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +90 -delete -print | wc -l)
log "Deleted $WEEKLY_DELETED weekly backup files older than 90 days"

# Schema backups: 365 days retention
SCHEMA_DELETED=$(find "$BACKUP_DIR/schema" -name "*.sql" -mtime +365 -delete -print | wc -l)
log "Deleted $SCHEMA_DELETED schema backup files older than 365 days"

# Verify remaining backups
REMAINING_DAILY=$(find "$BACKUP_DIR/daily" -name "*.tar.gz" | wc -l)
REMAINING_WEEKLY=$(find "$BACKUP_DIR/weekly" -name "*.tar.gz" | wc -l)
log "Remaining backups - Daily: $REMAINING_DAILY, Weekly: $REMAINING_WEEKLY"

log "Backup retention enforcement completed"
```

---

## Data Archival vs Deletion

### When to Archive

**Archive** data when:
- Historical value for analytics or reporting
- Legal or compliance requirements mandate preservation
- Business may need future reference
- Data can be fully anonymized

**Do NOT archive** when:
- Data contains identifiable PII that cannot be anonymized
- User has exercised right to erasure
- Original purpose has been fulfilled with no future need
- Storage costs outweigh potential value

### Archival vs Deletion Decision Matrix

| Data Category | Recommended Action | Rationale |
|--------------|-------------------|-----------|
| User account data | Delete | PII with no ongoing purpose after account closure |
| CRM contacts (active) | Retain | Ongoing business relationship |
| CRM contacts (inactive) | Archive after 3 years | Potential future relationship |
| Email engagement metrics | Archive (aggregate) | Historical trend analysis |
| Individual email events | Delete after 26 months | No ongoing value |
| NPS scores | Archive (anonymized) | Trend analysis |
| NPS PII (email, IP) | Delete after 2 years | PII not needed for analysis |
| Audit logs (actions) | Archive (anonymized) | Compliance trail |
| Audit logs (PII) | Delete after 1 year | No ongoing need |
| Analytics data | Platform-managed | Google manages retention |
| Backups | Delete per schedule | Recovery window passed |

### Archival Implementation

#### Anonymized Archive Tables

```sql
-- Create archive schema
CREATE SCHEMA IF NOT EXISTS archive;

-- Archive anonymized NPS data
CREATE TABLE IF NOT EXISTS archive.nps_historical (
  id UUID PRIMARY KEY,
  score INTEGER NOT NULL,
  feedback TEXT,
  survey_name TEXT,
  responded_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move old NPS data to archive (anonymized)
INSERT INTO archive.nps_historical (id, score, feedback, survey_name, responded_at)
SELECT id, score, feedback, survey_name, responded_at
FROM nps_responses
WHERE responded_at < NOW() - INTERVAL '2 years';

-- Remove PII from source (keep reference)
UPDATE nps_responses
SET email = NULL, ip_address = NULL, user_agent = NULL
WHERE responded_at < NOW() - INTERVAL '2 years';
```

#### Aggregated Archive for Email Metrics

```sql
-- Monthly email engagement aggregates
CREATE TABLE IF NOT EXISTS archive.email_engagement_monthly (
  month DATE PRIMARY KEY,
  total_sends INTEGER,
  total_opens INTEGER,
  total_clicks INTEGER,
  unique_opens INTEGER,
  unique_clicks INTEGER,
  bounce_count INTEGER,
  unsubscribe_count INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate before deleting detailed events
INSERT INTO archive.email_engagement_monthly (month, total_sends, total_opens, total_clicks, unique_opens, unique_clicks, bounce_count, unsubscribe_count)
SELECT
  DATE_TRUNC('month', occurred_at) as month,
  COUNT(*) FILTER (WHERE event_type = 'send'),
  COUNT(*) FILTER (WHERE event_type = 'open'),
  COUNT(*) FILTER (WHERE event_type = 'click'),
  COUNT(DISTINCT subscriber_id) FILTER (WHERE event_type = 'open'),
  COUNT(DISTINCT subscriber_id) FILTER (WHERE event_type = 'click'),
  COUNT(*) FILTER (WHERE event_type = 'bounce'),
  COUNT(*) FILTER (WHERE event_type = 'unsubscribe')
FROM email_events
WHERE occurred_at < NOW() - INTERVAL '26 months'
GROUP BY DATE_TRUNC('month', occurred_at)
ON CONFLICT (month) DO NOTHING;

-- Then delete detailed events
DELETE FROM email_events WHERE occurred_at < NOW() - INTERVAL '26 months';
```

### Secure Deletion Methods

#### Database Record Deletion

```sql
-- Hard delete: Permanently remove records
DELETE FROM contacts WHERE id = 'contact-uuid-here';

-- Cascade delete: Remove related records
DELETE FROM contacts WHERE id = 'contact-uuid-here';
-- Automatically removes: interactions, follow_ups via FK cascade

-- Verify deletion
SELECT COUNT(*) FROM contacts WHERE id = 'contact-uuid-here';
-- Should return 0
```

#### File Deletion

```bash
# Secure file deletion (Linux)
shred -vfz -n 5 sensitive_backup.sql

# Or use secure-delete package
srm -vz sensitive_backup.sql

# For SSDs, verify TRIM is enabled for secure deletion
fstrim -v /path/to/ssd/mount
```

#### Backup Deletion

```bash
# Verify backup is beyond retention period
find /backups -name "backup_*.sql.gz" -mtime +90 -print

# Secure delete old backups
find /backups -name "backup_*.sql.gz" -mtime +90 -exec shred -vfz {} \;

# Or simple delete if disk encryption is used
find /backups -name "backup_*.sql.gz" -mtime +90 -delete
```

---

## Retention Policy Exceptions

### Categories of Exceptions

| Exception Type | Description | Approval Required | Documentation |
|---------------|-------------|-------------------|---------------|
| Legal Hold | Litigation or investigation | Legal counsel | Legal hold register |
| Regulatory Request | Government/regulatory preservation | Compliance officer | Written request copy |
| Business Critical | Essential business records | DPO + Management | Business justification |
| User Request | Extended retention by user request | DPO | Written consent |
| Technical Constraint | Unable to delete (system limitation) | Technical lead | Remediation plan |

### Exception Request Process

1. **Submit Request**:
   - Identify data affected
   - Specify reason for exception
   - Propose alternative retention period
   - Document any risks

2. **Review**:
   - DPO reviews for GDPR compliance
   - Legal reviews for regulatory implications
   - Technical reviews for feasibility

3. **Approval**:
   - DPO approval required for all exceptions
   - Legal approval for legal holds
   - Management approval for business exceptions

4. **Implementation**:
   - Apply exception flag to affected records
   - Document in exception register
   - Set review date

5. **Regular Review**:
   - Review all exceptions quarterly
   - Remove exception when no longer applicable
   - Apply standard retention upon exception removal

### Exception Register Template

| ID | Data Category | Records Affected | Exception Type | Reason | Approved By | Start Date | Review Date | Status |
|----|--------------|------------------|----------------|--------|-------------|------------|-------------|--------|
| EXC-001 | audit_logs | 150 records | Legal Hold | Pending litigation | Legal Counsel | 2025-01-15 | 2025-04-15 | Active |
| EXC-002 | contacts | 25 records | Business Critical | Key accounts | DPO + CEO | 2025-01-20 | 2025-07-20 | Active |

---

## User-Requested Data Deletion

### Right to Erasure (Right to be Forgotten)

Under GDPR Article 17, data subjects have the right to request deletion of their personal data when:

1. Data is no longer necessary for the original purpose
2. Consent is withdrawn (and no other legal basis exists)
3. Data subject objects to processing
4. Data was unlawfully processed
5. Legal obligation requires erasure

### Deletion Request Process

#### Step 1: Request Intake

```markdown
## Data Deletion Request Form

**Requester Information:**
- Name: _______________
- Email: _______________
- Date of Request: _______________

**Verification:**
- [ ] Identity verified via email confirmation
- [ ] Verified as data subject or authorized representative

**Scope of Request:**
- [ ] Complete account deletion
- [ ] Specific data categories: _______________
- [ ] Data held by specific services: _______________
```

#### Step 2: Identity Verification

Before processing any deletion request:

1. Send verification email to the email address on record
2. Require user to click verification link
3. Or verify through authenticated session
4. Document verification method used

#### Step 3: Assess Deletion Scope

```sql
-- Identify all data associated with requester
-- Run these queries to understand scope

-- 1. Contact records
SELECT id, email, first_name, last_name, created_at
FROM contacts
WHERE email = '[requester_email]';

-- 2. Email subscriber records
SELECT id, email, status, subscribed_at
FROM email_subscribers
WHERE email = '[requester_email]';

-- 3. NPS responses
SELECT id, email, score, responded_at
FROM nps_responses
WHERE email = '[requester_email]';

-- 4. Audit logs (will be anonymized, not deleted)
SELECT COUNT(*)
FROM audit_logs
WHERE user_email = '[requester_email]';

-- 5. Admin user records (if applicable)
SELECT *
FROM admin_users
WHERE email = '[requester_email]';
```

#### Step 4: Execute Deletion

```sql
-- GDPR Data Deletion Execution
-- Run within transaction, backup first

BEGIN;

-- 1. Delete contact records (cascades to interactions, follow_ups)
DELETE FROM contacts WHERE email = '[requester_email]';

-- 2. Delete email subscriber records
DELETE FROM email_subscribers WHERE email = '[requester_email]';

-- 3. Anonymize NPS responses (retain for statistics)
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE email = '[requester_email]';

-- 4. Anonymize audit logs (retain for compliance)
UPDATE audit_logs
SET user_email = '[DELETED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE user_email = '[requester_email]';

-- 5. Delete admin user mapping (if applicable)
DELETE FROM admin_users WHERE email = '[requester_email]';

-- Verify deletion
SELECT 'contacts' as table_name, COUNT(*) as remaining FROM contacts WHERE email = '[requester_email]'
UNION ALL
SELECT 'email_subscribers', COUNT(*) FROM email_subscribers WHERE email = '[requester_email]'
UNION ALL
SELECT 'nps_responses (with email)', COUNT(*) FROM nps_responses WHERE email = '[requester_email]';

COMMIT;
```

#### Step 5: Delete from Third-Party Services

**Clerk (Authentication)**:
```bash
# Delete user from Clerk via API
curl -X DELETE "https://api.clerk.com/v1/users/{user_id}" \
  -H "Authorization: Bearer ${CLERK_SECRET_KEY}"

# Or via Clerk Dashboard:
# Users > Find user > Delete user account
```

**Google Analytics**:
- GA4 does not store identifiable PII by default
- If User ID tracking enabled, submit deletion request via GA interface

#### Step 6: Confirm and Document

```markdown
## Deletion Confirmation

**Request ID:** DEL-2025-001
**Requester Email:** [masked]
**Request Date:** 2025-01-20
**Completion Date:** 2025-01-22

**Data Deleted:**
- [x] Contacts table: 1 record deleted
- [x] Email subscribers: 1 record deleted
- [x] NPS responses: 3 records anonymized
- [x] Audit logs: 45 records anonymized
- [x] Clerk account: Deleted
- [x] Admin user mapping: 1 record deleted (if applicable)

**Verification:**
- [x] Queried all tables - no identifiable records remain
- [x] Third-party services notified/deleted

**Processed By:** [Administrator name]
**Confirmation Sent:** 2025-01-22
```

### Response Timeline

| Action | GDPR Requirement | Target |
|--------|------------------|--------|
| Acknowledge request | No specific requirement | 48 hours |
| Verify identity | Required before processing | 5 business days |
| Complete deletion | Within 1 month | 30 calendar days |
| Extension (if complex) | Up to 2 additional months | 90 calendar days total |
| Confirm to requester | Required | Upon completion |

### Exceptions to Deletion

Deletion may be refused or limited when:

1. **Legal obligations**: Data required for tax, regulatory compliance
2. **Legal claims**: Data needed to establish, exercise, or defend legal claims
3. **Public interest**: Archiving for public interest purposes
4. **Freedom of expression**: Journalistic, artistic, or literary purposes

Document any refusal with:
- Legal basis for refusal
- Which data is affected
- Expected retention period
- User's right to appeal

---

## Retention Policy Audit Procedures

### Quarterly Retention Audit

**Frequency**: Quarterly (January, April, July, October)
**Duration**: 2-4 hours
**Owner**: Data Protection Officer

#### Audit Checklist

```markdown
## Quarterly Data Retention Audit

**Audit Period:** Q[X] 20XX
**Auditor:** _______________
**Audit Date:** _______________

### Pre-Audit Preparation
- [ ] Review previous audit findings
- [ ] Check for any pending legal holds
- [ ] Verify automated cleanup jobs are running
- [ ] Gather access to all data stores

### Data Inventory Review
- [ ] Verify data inventory is current
- [ ] Confirm retention periods are documented for all data types
- [ ] Check for any new data categories

### Automated Cleanup Verification
- [ ] Verify pg_cron jobs are scheduled and running
- [ ] Check last execution logs for cleanup jobs
- [ ] Confirm backup retention scripts are running
- [ ] Review log aggregator retention settings

### Retention Compliance Check

#### Audit Logs
- [ ] Records older than 1 year are anonymized
- [ ] No identifiable PII in records > 1 year
- [ ] Legal hold flags are respected
- Query: [run retention status query]
- Result: ___ records overdue, ___ compliant

#### Email Events
- [ ] No records older than 26 months
- [ ] Aggregates created before deletion
- Query: [run retention status query]
- Result: ___ records overdue, ___ compliant

#### NPS Responses
- [ ] PII removed from records > 2 years
- [ ] Scores and feedback retained for analysis
- Query: [run retention status query]
- Result: ___ records overdue, ___ compliant

#### Email Subscribers
- [ ] Inactive subscribers flagged after 2 years
- [ ] Status = 'inactive' for long-dormant accounts
- Query: [run retention status query]
- Result: ___ records overdue, ___ compliant

#### Backups
- [ ] Daily backups: none older than 30 days
- [ ] Weekly backups: none older than 90 days
- [ ] Schema backups: none older than 1 year
- [ ] Secrets exports: current and within 1 year
- Files checked: _______________

### Exception Review
- [ ] All active exceptions documented in register
- [ ] No expired exceptions still active
- [ ] Review dates set for all exceptions

### Deletion Request Review
- [ ] All requests processed within 30 days
- [ ] Confirmation sent for all completed requests
- [ ] Audit trail maintained for all deletions

### Third-Party Compliance
- [ ] Clerk data retention settings verified
- [ ] Google Analytics retention settings verified
- [ ] Log aggregator retention settings verified

### Findings and Remediation

#### Issues Found:
1. _______________
   - Severity: High/Medium/Low
   - Remediation: _______________
   - Due Date: _______________

2. _______________

#### Recommendations:
1. _______________
2. _______________

### Sign-Off
- Auditor: _______________ Date: _______________
- DPO Review: _______________ Date: _______________
```

### Annual Retention Policy Review

**Frequency**: Annually (December)
**Duration**: 4-8 hours
**Owner**: DPO + Legal + Technical Lead

#### Annual Review Scope

1. **Policy Effectiveness**:
   - Were retention periods appropriate?
   - Any data held too long or deleted too soon?
   - User deletion requests handled efficiently?

2. **Legal/Regulatory Changes**:
   - Any new regulations affecting retention?
   - Changes to GDPR guidance?
   - Industry-specific requirements?

3. **Business Changes**:
   - New data categories introduced?
   - Changes to data processing purposes?
   - New third-party processors?

4. **Technical Changes**:
   - New storage systems?
   - Changes to backup procedures?
   - Log aggregation changes?

5. **Process Improvements**:
   - Automation opportunities?
   - Documentation updates needed?
   - Training requirements?

---

## Policy Review Schedule

### Review Calendar

| Review Type | Frequency | Owner | Participants | Duration |
|-------------|-----------|-------|--------------|----------|
| Automated Job Check | Weekly | Site Admin | - | 15 min |
| Retention Compliance Audit | Quarterly | DPO | Technical Lead | 2-4 hours |
| Exception Register Review | Quarterly | DPO | Legal (if holds active) | 1 hour |
| Full Policy Review | Annually | DPO | Legal, Technical, Business | 4-8 hours |
| Post-Incident Review | As needed | DPO | Relevant parties | 1-2 hours |

### Trigger-Based Reviews

Review the policy when:

1. **New data category**: Any new type of data collected or processed
2. **New processor**: New third-party service handling data
3. **Legal change**: Regulatory or legal requirements change
4. **Incident**: Data breach or retention-related incident
5. **Acquisition**: Business acquisition or merger
6. **Significant growth**: User base or data volume significantly increases

### Documentation Updates

After each review:

1. Update this document with any policy changes
2. Update privacy policy if user-facing changes
3. Update GDPR data handling document if applicable
4. Notify relevant personnel of changes
5. Update automation if retention periods change
6. Increment document version number

---

## Appendix A: SQL Functions for Retention Management

```sql
-- Function: Get retention compliance status
CREATE OR REPLACE FUNCTION get_retention_status()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  overdue_records BIGINT,
  oldest_record TIMESTAMPTZ,
  compliance_status TEXT
) AS $$
BEGIN
  -- Audit logs status
  RETURN QUERY
  SELECT
    'audit_logs'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (
      WHERE created_at < NOW() - INTERVAL '1 year'
        AND user_email IS NOT NULL
        AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')
    )::BIGINT,
    MIN(created_at),
    CASE
      WHEN COUNT(*) FILTER (
        WHERE created_at < NOW() - INTERVAL '1 year'
          AND user_email IS NOT NULL
          AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')
      ) = 0 THEN 'COMPLIANT'
      ELSE 'ACTION REQUIRED'
    END
  FROM audit_logs;

  -- Email events status
  RETURN QUERY
  SELECT
    'email_events'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE occurred_at < NOW() - INTERVAL '26 months')::BIGINT,
    MIN(occurred_at),
    CASE
      WHEN COUNT(*) FILTER (WHERE occurred_at < NOW() - INTERVAL '26 months') = 0 THEN 'COMPLIANT'
      ELSE 'ACTION REQUIRED'
    END
  FROM email_events;

  -- NPS responses status
  RETURN QUERY
  SELECT
    'nps_responses'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (
      WHERE responded_at < NOW() - INTERVAL '2 years'
        AND email IS NOT NULL
    )::BIGINT,
    MIN(responded_at),
    CASE
      WHEN COUNT(*) FILTER (
        WHERE responded_at < NOW() - INTERVAL '2 years'
          AND email IS NOT NULL
      ) = 0 THEN 'COMPLIANT'
      ELSE 'ACTION REQUIRED'
    END
  FROM nps_responses;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Execute retention enforcement
CREATE OR REPLACE FUNCTION execute_retention_enforcement()
RETURNS TABLE(
  operation TEXT,
  table_name TEXT,
  records_affected INTEGER,
  status TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Anonymize old audit logs
  UPDATE audit_logs
  SET user_email = '[ANONYMIZED]',
      user_id = NULL,
      ip_address = NULL,
      user_agent = NULL
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND user_email IS NOT NULL
    AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]')
    AND COALESCE(legal_hold, FALSE) = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  operation := 'anonymize';
  table_name := 'audit_logs';
  records_affected := v_count;
  status := 'completed';
  RETURN NEXT;

  -- Delete old email events
  DELETE FROM email_events
  WHERE occurred_at < NOW() - INTERVAL '26 months';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  operation := 'delete';
  table_name := 'email_events';
  records_affected := v_count;
  status := 'completed';
  RETURN NEXT;

  -- Anonymize old NPS responses
  UPDATE nps_responses
  SET email = NULL,
      ip_address = NULL,
      user_agent = NULL
  WHERE responded_at < NOW() - INTERVAL '2 years'
    AND email IS NOT NULL
    AND COALESCE(legal_hold, FALSE) = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  operation := 'anonymize';
  table_name := 'nps_responses';
  records_affected := v_count;
  status := 'completed';
  RETURN NEXT;

  -- Mark inactive subscribers
  UPDATE email_subscribers
  SET status = 'inactive'
  WHERE status = 'active'
    AND COALESCE(last_email_opened_at, created_at) < NOW() - INTERVAL '2 years'
    AND COALESCE(last_email_clicked_at, created_at) < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  operation := 'mark_inactive';
  table_name := 'email_subscribers';
  records_affected := v_count;
  status := 'completed';
  RETURN NEXT;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Appendix B: Related Documentation

- [GDPR Data Handling](./gdpr-data-handling.md) - GDPR-specific procedures and data inventory
- [PII Handling Procedures](./pii-handling.md) - PII classification and handling
- [Privacy Policy](../legal/privacy-policy.md) - Public privacy notice
- [Backup Strategy](../reliability/backup-strategy.md) - Backup and recovery procedures
- [Disaster Recovery](../reliability/disaster-recovery.md) - DR procedures
- [Log Aggregation](../observability/log-aggregation.md) - Logging infrastructure
- [Secrets Management](../SECRETS_MANAGEMENT.md) - Credential and secret handling

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | Claude Code | Initial version (Issue #88) |

---

*This policy should be reviewed annually or whenever significant changes are made to data processing activities. All personnel with access to data should be familiar with this policy.*
