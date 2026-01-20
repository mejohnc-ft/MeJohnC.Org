# PII Handling Procedures

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Document Owner:** Data Protection Officer / Site Administrator
**Related Issue:** #87
**Related Documents:** [GDPR Data Handling](./gdpr-data-handling.md), [Privacy Policy](../legal/privacy-policy.md)

---

## Table of Contents

1. [PII Definition and Classification](#pii-definition-and-classification)
2. [PII Inventory](#pii-inventory)
3. [PII Handling Procedures](#pii-handling-procedures)
4. [Access Controls for PII](#access-controls-for-pii)
5. [PII in Logs](#pii-in-logs)
6. [PII in Backups](#pii-in-backups)
7. [Third-Party PII Sharing](#third-party-pii-sharing)
8. [Breach Notification Procedures](#breach-notification-procedures)
9. [Employee Training Requirements](#employee-training-requirements)
10. [PII Handling Checklist for Developers](#pii-handling-checklist-for-developers)

---

## PII Definition and Classification

### What is PII?

**Personally Identifiable Information (PII)** is any data that can be used to identify, contact, or locate a specific individual, either alone or combined with other information.

### Classification Levels

MeJohnC.Org classifies PII into three sensitivity levels:

#### Level 1: Public PII (Low Sensitivity)

Information that may be publicly available or has minimal impact if disclosed.

| Data Type | Examples | Protection Level |
|-----------|----------|------------------|
| Professional title | "Software Engineer" | Basic access controls |
| Company name | "Example Corp" | Basic access controls |
| Public social profiles | LinkedIn URL, GitHub username | Basic access controls |
| City/Region | "San Francisco, CA" | Basic access controls |

**Handling Requirements:**
- Standard database security (RLS, encryption in transit)
- No special masking required in logs
- May be displayed in admin interfaces without additional controls

#### Level 2: Confidential PII (Medium Sensitivity)

Information that could enable contact or identification if disclosed.

| Data Type | Examples | Protection Level |
|-----------|----------|------------------|
| Full name | "John Doe" | Enhanced access controls |
| Email address | "john@example.com" | Enhanced access controls, masking in logs |
| Phone number | "+1-555-123-4567" | Enhanced access controls, masking in logs |
| Physical address | "123 Main St" | Enhanced access controls |
| Profile pictures | User avatar URLs | Enhanced access controls |
| IP addresses | Client IP addresses | Hashing/anonymization in logs |

**Handling Requirements:**
- Encryption at rest and in transit
- Masking in logs and non-production environments
- Access limited to authorized personnel
- Audit logging for all access

#### Level 3: Sensitive PII (High Sensitivity)

Information that could cause significant harm if disclosed.

| Data Type | Examples | Protection Level |
|-----------|----------|------------------|
| Authentication credentials | Passwords, tokens | Never stored in plaintext |
| Session tokens | JWT tokens | Encrypted, short-lived |
| Private notes | CRM notes about individuals | Strict access controls |
| Behavioral data | Detailed activity logs | Anonymization required |
| Financial data | Payment information (if any) | PCI-DSS compliance |

**Handling Requirements:**
- Strong encryption (AES-256)
- Minimal collection (only what's necessary)
- Shortest practical retention period
- Access restricted to service accounts or DPO
- Full audit trail
- Never exposed in logs or error messages

---

## PII Inventory

This section documents all PII collected, processed, and stored by MeJohnC.Org.

### 1. User Profile Data (Clerk)

**Storage Location:** Clerk (third-party)
**Data Controller:** MeJohnC.Org
**Data Processor:** Clerk, Inc.

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| Email address | Level 2 | Account identification, authentication | Contract performance |
| Full name | Level 2 | Profile display | Contract performance |
| Profile picture | Level 2 | User identification | Consent (optional) |
| User ID | Level 1 | System identification | Contract performance |

**Retention:** Until account deletion or 2 years of inactivity

### 2. Authentication Data

**Storage Location:** Clerk (primary), Browser (session)
**Data Processor:** Clerk, Inc.

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| Password hash | Level 3 | Authentication | Contract performance |
| Session tokens (JWT) | Level 3 | Session management | Contract performance |
| MFA secrets | Level 3 | Multi-factor authentication | Contract performance |
| OAuth tokens | Level 3 | Social login | Consent |

**Retention:** Session duration (30 days max for tokens); credentials until account deletion

**Security Measures:**
- Passwords are never stored by MeJohnC.Org (handled by Clerk)
- JWTs are short-lived and signed
- Tokens transmitted only over TLS 1.3
- Refresh tokens rotated on use

### 3. CRM Contact Data (Supabase)

**Storage Location:** Supabase (`contacts` table)
**Data Controller:** MeJohnC.Org

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| First name, Last name | Level 2 | Contact identification | Legitimate interest |
| Email address | Level 2 | Business communication | Legitimate interest |
| Phone number | Level 2 | Business communication | Legitimate interest |
| Company, Job title | Level 1 | Business context | Legitimate interest |
| Website, LinkedIn URL | Level 1 | Professional context | Legitimate interest |
| Twitter, GitHub handles | Level 1 | Social/professional linking | Legitimate interest |
| City, State, Country | Level 1 | Location context | Legitimate interest |
| Timezone | Level 1 | Scheduling | Legitimate interest |
| Avatar URL | Level 2 | Visual identification | Consent |
| Bio, Notes | Level 2 | Relationship context | Legitimate interest |
| Custom fields (JSONB) | Variable | Flexible metadata | Legitimate interest |
| Source tracking | Level 1 | Marketing attribution | Legitimate interest |

**Retention:** Until manually deleted by administrator

### 4. Email Marketing Data (Supabase)

**Storage Location:** Supabase (`email_subscribers` table)
**Data Controller:** MeJohnC.Org

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| Email address | Level 2 | Newsletter delivery | Consent (double opt-in) |
| First name, Last name | Level 2 | Personalization | Consent |
| Subscription status | Level 1 | List management | Contract performance |
| Subscription preferences | Level 1 | Email targeting | Consent |
| Subscribed date | Level 1 | Consent record | Legal compliance |
| Engagement metrics | Level 1 | Campaign analytics | Legitimate interest |
| IP address (at signup) | Level 2 | Fraud prevention, consent proof | Legitimate interest |
| User agent (at signup) | Level 1 | Technical support | Legitimate interest |
| Source/Referrer | Level 1 | Marketing attribution | Legitimate interest |

**Retention:** Until unsubscribe or 2 years of inactivity

### 5. Analytics/Usage Data

**Storage Location:** Google Analytics (third-party), Supabase
**Data Processor:** Google LLC

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| Page views | Level 1 | Usage analytics | Consent |
| Session data | Level 1 | User behavior | Consent |
| Device/Browser info | Level 1 | Technical analytics | Consent |
| IP address (anonymized) | Level 2 | Geographic analytics | Consent |
| User interactions | Level 1 | UX improvement | Consent |
| Web vitals | Level 1 | Performance monitoring | Legitimate interest |

**Retention:** 26 months (Google Analytics default)

**Privacy Controls:**
- Analytics only loaded with user consent
- IP anonymization enabled
- Do Not Track (DNT) signal respected
- No cross-site tracking

### 6. Audit Log Data (Supabase)

**Storage Location:** Supabase (`audit_logs` table)
**Data Controller:** MeJohnC.Org

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| User ID | Level 1 | Action attribution | Legitimate interest (security) |
| User email | Level 2 | Action attribution | Legitimate interest (security) |
| IP address | Level 2 | Security monitoring | Legitimate interest (security) |
| User agent | Level 1 | Security analysis | Legitimate interest (security) |
| Action details | Level 1 | Audit trail | Legal compliance |
| Old/New data (changes) | Variable | Change tracking | Legal compliance |

**Retention:** 1 year (then anonymized)

### 7. NPS Survey Data (Supabase)

**Storage Location:** Supabase (`nps_responses` table)
**Data Controller:** MeJohnC.Org

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| Email (optional) | Level 2 | Response attribution | Consent |
| NPS score | Level 1 | Customer satisfaction | Consent |
| Feedback text | Level 1 | Product improvement | Consent |
| IP address | Level 2 | Fraud prevention | Legitimate interest |
| User agent | Level 1 | Technical context | Legitimate interest |

**Retention:** Indefinite for scores; PII anonymized after 2 years

### 8. Error Tracking Data (Sentry)

**Storage Location:** Sentry (third-party)
**Data Processor:** Functional Software, Inc.

| Data Element | Classification | Purpose | Legal Basis |
|-------------|----------------|---------|-------------|
| User ID | Level 1 | Error context | Legitimate interest |
| Session ID | Level 1 | Error correlation | Legitimate interest |
| IP address | Level 2 | Geographic context | Legitimate interest |
| User agent | Level 1 | Technical context | Legitimate interest |
| Error stack traces | Level 1 | Debugging | Legitimate interest |

**Retention:** 90 days

---

## PII Handling Procedures

### Collection

#### What to Collect

Follow the principle of **data minimization**:

1. **Only collect PII that is necessary** for the stated purpose
2. **Never collect sensitive PII** (Level 3) unless absolutely required
3. **Prefer anonymous or pseudonymous data** when possible
4. **Avoid collecting** government IDs, financial data, health information

**Collection Decision Checklist:**

```markdown
Before collecting PII, verify:
[ ] Is this data necessary for the feature to function?
[ ] Is there a less invasive alternative?
[ ] Have we documented the purpose and legal basis?
[ ] Do we have a clear retention period?
[ ] Is consent required? If so, is our consent mechanism compliant?
```

#### Consent Requirements

| Data Type | Consent Required | Consent Mechanism |
|-----------|------------------|-------------------|
| Account creation | Implied (contract) | Sign-up form + Terms acceptance |
| Analytics cookies | Yes (GDPR) | Cookie consent banner |
| Marketing emails | Yes (explicit) | Double opt-in |
| NPS surveys | Yes (explicit) | Survey introduction |
| CRM data | No (legitimate interest) | Privacy policy disclosure |
| Audit logs | No (legal compliance) | Privacy policy disclosure |

**Consent Collection Standards:**

1. **Clear language**: Explain what data is collected and why
2. **Granular choices**: Allow users to consent to specific purposes
3. **Easy withdrawal**: Provide simple mechanisms to withdraw consent
4. **Record keeping**: Store consent timestamp, source, and scope

### Storage

#### Encryption Requirements

| Storage Location | Encryption at Rest | Encryption in Transit |
|------------------|-------------------|----------------------|
| Supabase | AES-256 | TLS 1.3 |
| Clerk | AES-256 | TLS 1.3 |
| Netlify CDN | N/A (static content) | TLS 1.3 |
| Google Analytics | Google-managed | TLS |
| Sentry | AES-256 | TLS 1.3 |
| Browser LocalStorage | Not encrypted | N/A |

**Storage Guidelines:**

1. **Never store PII in plaintext** in source code, configs, or logs
2. **Use environment variables** for sensitive configuration
3. **Encrypt sensitive fields** beyond database-level encryption when necessary
4. **Avoid storing PII in browser storage** except for session management

#### Access Controls

PII access is controlled through multiple layers:

1. **Database Level (Supabase RLS)**
   ```sql
   -- Only admins can access contacts
   CREATE POLICY "Admin access to contacts"
     ON contacts FOR ALL
     USING (is_admin());
   ```

2. **Application Level (RBAC)**
   - Defined in `src/lib/rbac.ts`
   - Permissions checked via `usePermissions` hook
   - UI elements hidden via `PermissionGate` component

3. **Authentication Level (Clerk)**
   - All admin access requires authentication
   - MFA available for enhanced security

### Processing

#### Data Minimization

1. **Query only needed fields**
   ```typescript
   // Good: Select only required fields
   const { data } = await supabase
     .from('contacts')
     .select('id, first_name, last_name, company')
     .eq('id', contactId);

   // Bad: Select all fields unnecessarily
   const { data } = await supabase
     .from('contacts')
     .select('*')
     .eq('id', contactId);
   ```

2. **Filter data before display**
   - Remove unnecessary PII from API responses
   - Mask sensitive fields in non-essential contexts

3. **Aggregate where possible**
   - Use counts instead of listing individuals
   - Anonymize for analytics and reporting

#### Purpose Limitation

PII must only be processed for the purposes disclosed to the data subject:

| Collected For | Permitted Uses | Prohibited Uses |
|---------------|----------------|-----------------|
| Account management | Authentication, profile display | Marketing (without consent) |
| CRM contacts | Business communication, relationship management | Sale to third parties |
| Email subscription | Newsletter delivery, preference management | Sharing with advertisers |
| Analytics | Usage insights, performance monitoring | Individual tracking, profiling |

### Transmission

#### TLS Requirements

All PII transmission must use TLS 1.2 or higher (preferably TLS 1.3):

| Endpoint | TLS Version | Certificate |
|----------|-------------|-------------|
| mejohnc.org | TLS 1.3 | Netlify-managed |
| *.supabase.co | TLS 1.3 | Supabase-managed |
| clerk.com | TLS 1.3 | Clerk-managed |
| analytics.google.com | TLS 1.3 | Google-managed |

**Transmission Guidelines:**

1. **Never transmit PII over HTTP**
2. **Use secure WebSocket (WSS)** for real-time features
3. **Include security headers**:
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   Content-Security-Policy: upgrade-insecure-requests
   ```
4. **Validate SSL certificates** in all API calls

### Retention

#### Retention Periods by Data Type

| Data Category | Active Retention | Archive Period | Deletion Method |
|---------------|------------------|----------------|-----------------|
| User accounts | Until deletion request | None | Hard delete from Clerk + Supabase |
| CRM contacts | Until manual deletion | None | Hard delete |
| Email subscribers | Until unsubscribe | 2 years inactive | Hard delete |
| Audit logs | 1 year | None | Anonymization |
| NPS responses | 2 years | Indefinite (anonymized) | PII removal |
| Analytics | 26 months | None | Platform-managed |
| Error logs | 90 days | None | Platform-managed |

#### Automated Retention Enforcement

```sql
-- Scheduled cleanup (run daily via pg_cron or external scheduler)

-- 1. Anonymize audit logs older than 1 year
UPDATE audit_logs
SET user_email = '[ANONYMIZED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE created_at < NOW() - INTERVAL '1 year'
  AND user_email IS NOT NULL
  AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]');

-- 2. Anonymize NPS responses older than 2 years
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE responded_at < NOW() - INTERVAL '2 years'
  AND email IS NOT NULL;

-- 3. Mark inactive subscribers
UPDATE email_subscribers
SET status = 'inactive'
WHERE status = 'active'
  AND last_email_opened_at < NOW() - INTERVAL '2 years'
  AND last_email_clicked_at < NOW() - INTERVAL '2 years';
```

### Deletion

#### Secure Deletion Procedures

**For Individual Data Subject Requests:**

1. **Verify identity** before processing deletion request
2. **Export data** for the requester (if requested under GDPR Article 15)
3. **Delete from all systems** following the checklist below
4. **Confirm deletion** within 30 days

**Deletion Checklist:**

```markdown
## Data Deletion Checklist

Requester Email: _______________
Request Date: _______________
Verified By: _______________

### Data Sources
- [ ] Supabase: contacts table
- [ ] Supabase: email_subscribers table
- [ ] Supabase: interactions table (cascade from contacts)
- [ ] Supabase: follow_ups table (cascade from contacts)
- [ ] Supabase: nps_responses (anonymize)
- [ ] Supabase: audit_logs (anonymize)
- [ ] Clerk: User account deletion
- [ ] Backups: Note deletion for exclusion from future restores

### Verification
- [ ] Queried all tables for remaining PII
- [ ] Confirmed no PII remains in active systems
- [ ] Logged deletion in compliance register

### Communication
- [ ] Sent deletion confirmation to requester
- [ ] Documented completion date: _______________
```

**SQL Deletion Script:**

```sql
-- GDPR Erasure - Run in transaction
BEGIN;

-- 1. Delete CRM contacts (cascades to interactions, follow_ups)
DELETE FROM contacts WHERE email = '[user_email]';

-- 2. Delete email subscriber
DELETE FROM email_subscribers WHERE email = '[user_email]';

-- 3. Anonymize NPS responses (keep for statistics)
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE email = '[user_email]';

-- 4. Anonymize audit logs (keep for compliance)
UPDATE audit_logs
SET user_email = '[DELETED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE user_email = '[user_email]';

COMMIT;
```

**Clerk Deletion:**

```bash
# Via Clerk API
curl -X DELETE "https://api.clerk.com/v1/users/{user_id}" \
  -H "Authorization: Bearer ${CLERK_SECRET_KEY}"

# Or via Clerk Dashboard:
# Users > Find user > Delete user account
```

---

## Access Controls for PII

### Role-Based Access

| Role | PII Access Level | Systems |
|------|------------------|---------|
| **Public User** | None (read-only public content) | Frontend only |
| **Authenticated Admin** | Full access to assigned PII | Admin dashboard, Supabase |
| **Super Admin** | Full access to all PII | All systems |
| **Service Account** | Specific API access | Programmatic only |
| **DPO/Compliance** | Audit and export access | All systems (read-only) |

### Access Control Implementation

**Database Level (Supabase RLS):**

```sql
-- is_admin() function verifies Clerk JWT
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to PII tables
CREATE POLICY "Admin access to contacts"
  ON contacts FOR ALL
  USING (is_admin());

CREATE POLICY "Admin access to email_subscribers"
  ON email_subscribers FOR ALL
  USING (is_admin());
```

**Application Level:**

```typescript
// src/lib/rbac.ts defines permissions
const PERMISSIONS = {
  contacts: {
    read: ['admin', 'superadmin'],
    write: ['admin', 'superadmin'],
    delete: ['superadmin'],
  },
  subscribers: {
    read: ['admin', 'superadmin'],
    write: ['admin', 'superadmin'],
    delete: ['admin', 'superadmin'],
  },
  audit_logs: {
    read: ['admin', 'superadmin'],
    write: [], // No direct writes allowed
  },
};
```

### Audit Logging Requirements

All PII access must be logged. The audit log captures:

| Field | Description | Required |
|-------|-------------|----------|
| `timestamp` | When the access occurred | Yes |
| `user_id` | Who accessed the data | Yes |
| `user_email` | Email of accessor | Yes |
| `action` | create/read/update/delete | Yes |
| `table_name` | Which table was accessed | Yes |
| `record_id` | Which record was accessed | Yes |
| `old_data` | Previous state (for updates/deletes) | Yes (non-reads) |
| `new_data` | New state (for creates/updates) | Yes (non-reads) |
| `ip_address` | Client IP | Yes |
| `user_agent` | Browser/client info | Yes |

**Audit Trigger:**

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    user_email,
    ip_address,
    user_agent
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) END,
    auth.uid(),
    auth.jwt() ->> 'email',
    current_setting('request.headers', true)::json ->> 'x-forwarded-for',
    current_setting('request.headers', true)::json ->> 'user-agent'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Principle of Least Privilege

1. **Default deny**: No access unless explicitly granted
2. **Minimal permissions**: Grant only what is needed for the task
3. **Time-limited access**: Use session tokens with expiration
4. **Regular review**: Audit access permissions quarterly

---

## PII in Logs

### Redaction Requirements

PII must be redacted or masked in all application logs:

| PII Type | Masking Method | Example |
|----------|---------------|---------|
| Email | Partial mask | `j***n@example.com` |
| Phone | Last 4 digits | `***-***-4567` |
| IP Address | Hash | `ip:a1b2c3d4` |
| Full Name | Partial mask | `John D.` |
| Password | Never logged | `[REDACTED]` |
| Tokens | Never logged | `[REDACTED]` |
| API Keys | Never logged | `[REDACTED]` |

### Masking Implementation

```typescript
// src/lib/logger.ts - PII masking functions

/**
 * Mask email address for logging
 * john.doe@example.com -> j***e@example.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';

  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 * +1-555-123-4567 -> ***-***-4567
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-***-${digits.slice(-4)}`;
}

/**
 * Hash IP address for correlation without exposing
 */
function hashIp(ip: string): string {
  const hash = ip.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `ip:${Math.abs(hash).toString(16).slice(0, 8)}`;
}

/**
 * Redact sensitive fields from objects
 */
function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = [
    'password', 'token', 'secret', 'apiKey',
    'authorization', 'email', 'phone'
  ]
): T {
  const sanitized = { ...obj };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      if (field === 'email') {
        sanitized[field as keyof T] = maskEmail(String(sanitized[field])) as T[keyof T];
      } else if (field === 'phone') {
        sanitized[field as keyof T] = maskPhone(String(sanitized[field])) as T[keyof T];
      } else {
        sanitized[field as keyof T] = '[REDACTED]' as T[keyof T];
      }
    }
  }

  return sanitized;
}
```

### Log Aggregation Platform Redaction

Configure automatic PII redaction in log aggregation (Axiom/Logtail):

```yaml
# Redaction rules for log aggregation
redaction_rules:
  - name: email
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    replacement: '[EMAIL_REDACTED]'

  - name: phone
    pattern: '(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    replacement: '[PHONE_REDACTED]'

  - name: ip_address
    pattern: '\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
    replacement: '[IP_REDACTED]'

  - name: bearer_token
    pattern: 'Bearer\s+[\w-]+\.[\w-]+\.[\w-]+'
    replacement: 'Bearer [TOKEN_REDACTED]'

  - name: api_key
    pattern: '(api[_-]?key|apikey)["\s:=]+["\']?[\w-]{20,}["\']?'
    replacement: '[API_KEY_REDACTED]'
    flags: 'i'
```

### What NOT to Log

**Never log:**
- Passwords or password hashes
- Authentication tokens (JWT, session tokens, API keys)
- Full credit card numbers
- Social Security Numbers or government IDs
- Health information
- Unmasked email addresses
- Full phone numbers
- Physical addresses

**Always sanitize before logging:**
- User input (may contain PII)
- Database query results
- API responses from third parties
- Error messages (may contain user data)

---

## PII in Backups

### Backup Security Requirements

| Backup Type | Encryption | Access Control | Retention |
|-------------|------------|----------------|-----------|
| Supabase PITR | AES-256 (Supabase-managed) | Supabase admin only | 7 days |
| Manual SQL exports | GPG encryption required | Encrypted file + password manager | 90 days |
| Configuration backups | GPG encryption | Password manager | 1 year |

### Secure Backup Procedures

**Encrypting Manual Backups:**

```bash
#!/bin/bash
# Backup with encryption

# Create backup
supabase db dump --project-ref $PROJECT_REF > backup.sql

# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 backup.sql

# Secure delete plaintext
shred -u backup.sql

# Move to secure storage
mv backup.sql.gpg /secure/backups/$(date +%Y%m%d).sql.gpg
```

### PII in Backup Retention

1. **Backup retention must align with PII retention policies**
   - Do not retain backups longer than the PII retention period
   - Document backup restoration as potential PII recovery

2. **GDPR deletion requests**
   - Note deletion requests in a register
   - Exclude deleted users' data if backup is restored
   - Run deletion scripts after any backup restoration

3. **Backup access logging**
   - Log all backup access
   - Restrict backup access to system administrators

### Backup Testing and PII

When testing backups:

1. **Use separate test environment**
2. **Anonymize data before testing** (if possible)
3. **Delete test data after verification**
4. **Document test procedures and cleanup**

---

## Third-Party PII Sharing

### Data Processors

MeJohnC.Org shares PII with the following third-party processors:

#### 1. Clerk (Authentication)

| Shared Data | Purpose | DPA Status |
|-------------|---------|------------|
| Email address | Account identification | Required |
| Full name | Profile display | Required |
| Profile picture | User identification | Required |

**DPA:** https://clerk.com/legal/dpa
**Data Location:** US
**Sub-processors:** AWS, GCP

#### 2. Supabase (Database)

| Shared Data | Purpose | DPA Status |
|-------------|---------|------------|
| All database content | Data storage | Required |
| CRM contacts | Relationship management | Required |
| Email subscribers | Marketing management | Required |

**DPA:** https://supabase.com/legal/dpa
**Data Location:** US (EU available)
**Sub-processors:** AWS

#### 3. Google Analytics (Analytics)

| Shared Data | Purpose | DPA Status |
|-------------|---------|------------|
| IP address (anonymized) | Geographic analytics | Required |
| Device/browser info | Technical analytics | Required |
| Usage behavior | Site improvement | Required |

**DPA:** https://business.safety.google/adsprocessorterms/
**Data Location:** US
**Privacy Controls:** IP anonymization enabled, consent required

#### 4. Netlify (Hosting)

| Shared Data | Purpose | DPA Status |
|-------------|---------|------------|
| Access logs (IP, user agent) | Security, CDN | Required |
| Edge function data | Serverless execution | Required |

**DPA:** https://www.netlify.com/legal/dpa/
**Data Location:** Global CDN
**Sub-processors:** AWS, GCP

#### 5. Sentry (Error Tracking)

| Shared Data | Purpose | DPA Status |
|-------------|---------|------------|
| Error context | Debugging | Required |
| User ID (anonymized) | Error correlation | Required |
| Browser info | Technical context | Required |

**DPA:** https://sentry.io/legal/dpa/
**Data Location:** US
**Retention:** 90 days

### DPA Management

All third-party processors handling PII must have:

1. **Signed DPA** (Data Processing Agreement)
2. **Standard Contractual Clauses** (for non-EU transfers)
3. **Security certifications** (SOC 2, ISO 27001 preferred)
4. **Annual review** of DPA compliance

**DPA Review Schedule:**

| Provider | Last Review | Next Review | Owner |
|----------|-------------|-------------|-------|
| Supabase | __________ | __________ | DPO |
| Clerk | __________ | __________ | DPO |
| Netlify | __________ | __________ | DPO |
| Google | __________ | __________ | DPO |
| Sentry | __________ | __________ | DPO |

### No PII Selling

MeJohnC.Org does **NOT** sell PII to third parties. This commitment is documented in the Privacy Policy.

---

## Breach Notification Procedures

### Breach Definition

A PII breach is any incident involving:
- Unauthorized access to PII
- Unauthorized disclosure of PII
- Loss of PII (including encrypted data if keys compromised)
- Alteration of PII without authorization

### Breach Severity Classification

| Severity | Description | Examples | Response Time |
|----------|-------------|----------|---------------|
| **Critical** | High risk, unencrypted PII exposed | Credentials leaked, database exposed | Immediate |
| **High** | Likely risk, significant PII affected | Email list exfiltrated | Within 4 hours |
| **Medium** | Possible risk, limited PII affected | Single user record accessed | Within 24 hours |
| **Low** | Minimal risk, encrypted/anonymized data | Encrypted backup lost | Within 72 hours |

### Notification Timeline

| Action | Timeline | Responsible |
|--------|----------|-------------|
| Initial detection | T+0 | Security team/Developer |
| Incident triage | Within 1 hour | DPO + Security |
| Severity assessment | Within 4 hours | DPO |
| Containment | Immediately | Security team |
| Supervisory authority notification | Within 72 hours | DPO |
| Data subject notification | Without undue delay | DPO + Communications |
| Full incident report | Within 30 days | Security team |

### Breach Response Checklist

```markdown
## Data Breach Response Checklist

Incident ID: _______________
Detection Date/Time: _______________
Reported By: _______________

### Phase 1: Detection and Triage (0-1 hour)
- [ ] Document initial observation
- [ ] Classify initial severity
- [ ] Notify DPO and security team
- [ ] Preserve evidence (logs, screenshots)

### Phase 2: Containment (1-4 hours)
- [ ] Identify affected systems
- [ ] Isolate compromised systems
- [ ] Revoke compromised credentials
- [ ] Block attack vectors
- [ ] Assess scope of data affected

### Phase 3: Assessment (4-24 hours)
- [ ] Determine data types affected
- [ ] Estimate number of individuals affected
- [ ] Assess likelihood of harm
- [ ] Finalize severity classification
- [ ] Document root cause

### Phase 4: Notification (Within 72 hours)
- [ ] Prepare supervisory authority notification
- [ ] Submit notification to DPA
- [ ] Prepare data subject notifications
- [ ] Send individual notifications (if required)
- [ ] Update status page (if appropriate)

### Phase 5: Remediation (Ongoing)
- [ ] Implement fixes
- [ ] Update security measures
- [ ] Review and update procedures
- [ ] Conduct post-incident review
- [ ] File final incident report

### Documentation
Root Cause: _______________
Data Affected: _______________
Individuals Affected: _______________
Remediation Steps: _______________
Lessons Learned: _______________
```

### Notification Templates

See [GDPR Data Handling](./gdpr-data-handling.md#data-breach-notification-procedures) for detailed notification templates.

---

## Employee Training Requirements

### Required Training

All personnel with access to PII must complete:

| Training | Frequency | Topics |
|----------|-----------|--------|
| PII Awareness | Annually | What is PII, classification levels, handling basics |
| Data Protection Basics | Annually | GDPR principles, data subject rights, legal bases |
| Secure Development | At onboarding + annually | Secure coding, input validation, encryption |
| Incident Response | Annually | Breach identification, reporting procedures |
| Role-Specific Training | As needed | Access controls, audit procedures |

### Training Topics

#### PII Awareness Training

1. **What is PII?**
   - Definition and examples
   - Classification levels (Public, Confidential, Sensitive)
   - Identifying PII in everyday work

2. **Why PII Protection Matters**
   - Legal requirements (GDPR, CCPA)
   - Business reputation
   - Individual rights

3. **Basic Handling Procedures**
   - Collect only what's needed
   - Store securely
   - Access on need-to-know basis
   - Delete when no longer needed

#### Developer-Specific Training

1. **Secure Coding Practices**
   - Input validation and sanitization
   - Output encoding
   - Parameterized queries

2. **PII in Code**
   - Never hardcode PII
   - Never log PII without masking
   - Use environment variables for configuration

3. **Access Control Implementation**
   - RLS policies
   - RBAC implementation
   - Authentication integration

### Training Documentation

Maintain records of:
- Training completion dates
- Assessment scores
- Acknowledgment signatures
- Refresher training schedules

---

## PII Handling Checklist for Developers

Use this checklist before implementing features that handle PII:

### Pre-Development

```markdown
## Feature: _______________
Developer: _______________
Date: _______________

### Data Collection Review
- [ ] Identified all PII to be collected
- [ ] Classified each field (Level 1/2/3)
- [ ] Verified necessity (data minimization)
- [ ] Documented purpose and legal basis
- [ ] Defined retention period
- [ ] Determined consent requirements

### Design Review
- [ ] PII stored in appropriate location (Supabase/Clerk)
- [ ] Encryption requirements met
- [ ] Access controls designed
- [ ] Audit logging planned
- [ ] Masking strategy for logs defined
```

### During Development

```markdown
### Code Implementation
- [ ] Input validation implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] RLS policies created/updated
- [ ] RBAC permissions defined
- [ ] PII masking in logs implemented
- [ ] Error messages do not leak PII
- [ ] API responses exclude unnecessary PII

### Security Testing
- [ ] Tested RLS policies with different roles
- [ ] Verified audit log capture
- [ ] Checked for PII in console logs
- [ ] Reviewed error handling for PII leaks
```

### Pre-Deployment

```markdown
### Final Checks
- [ ] Privacy policy updated (if new PII types)
- [ ] DPA reviewed (if new third party)
- [ ] Consent mechanism in place (if required)
- [ ] Data export capability works
- [ ] Data deletion capability works
- [ ] Retention automation configured

### Documentation
- [ ] PII inventory updated
- [ ] Technical documentation updated
- [ ] Runbook updated (if applicable)
```

### Quick Reference Card

**DO:**
- Encrypt PII at rest and in transit
- Mask PII in all logs
- Validate and sanitize all input
- Use parameterized queries
- Implement RLS policies
- Log all PII access
- Delete PII when no longer needed

**DO NOT:**
- Store passwords in plaintext
- Log sensitive PII (tokens, passwords)
- Expose PII in error messages
- Copy PII to development environments
- Share PII without authorization
- Keep PII longer than retention period
- Ignore data subject requests

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | System | Initial version (Issue #87) |

---

## Appendix A: Related Documentation

- [GDPR Data Handling](./gdpr-data-handling.md) - GDPR-specific procedures
- [Privacy Policy](../legal/privacy-policy.md) - Public privacy notice
- [Secrets Management](../SECRETS_MANAGEMENT.md) - Secret handling
- [Log Aggregation](../observability/log-aggregation.md) - Logging infrastructure
- [Backup Strategy](../reliability/backup-strategy.md) - Backup procedures
- [Incident Response](../runbooks/incident-response.md) - Incident handling

---

*This document should be reviewed and updated at least annually or whenever significant changes are made to PII processing activities.*
