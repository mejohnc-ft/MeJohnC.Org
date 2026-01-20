# GDPR Data Handling Documentation

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Document Owner:** Data Protection Officer / Site Administrator
**Related Issue:** #85

---

## Table of Contents

1. [GDPR Overview and Applicability](#gdpr-overview-and-applicability)
2. [Data Inventory](#data-inventory)
3. [Data Subject Rights Implementation](#data-subject-rights-implementation)
4. [Technical Implementation](#technical-implementation)
5. [Data Processing Agreements](#data-processing-agreements)
6. [Consent Management](#consent-management)
7. [Data Breach Notification Procedures](#data-breach-notification-procedures)
8. [Record of Processing Activities](#record-of-processing-activities)
9. [GDPR Compliance Checklist](#gdpr-compliance-checklist)

---

## GDPR Overview and Applicability

### What is GDPR?

The General Data Protection Regulation (GDPR) is a European Union regulation on data protection and privacy. It applies to:

- Organizations established in the EU/EEA
- Organizations outside the EU/EEA that offer goods/services to EU residents
- Organizations that monitor the behavior of EU residents

### Applicability to MeJohnC.Org

MeJohnC.Org processes personal data and may serve users in the European Economic Area (EEA). Therefore, GDPR compliance is required when:

- Users from the EEA visit the website
- Email subscribers are located in the EEA
- CRM contacts are EU-based individuals
- Analytics track EU visitor behavior

### Key GDPR Principles

1. **Lawfulness, Fairness, and Transparency** - Process data legally and transparently
2. **Purpose Limitation** - Collect data only for specified, legitimate purposes
3. **Data Minimization** - Collect only necessary data
4. **Accuracy** - Keep personal data accurate and up-to-date
5. **Storage Limitation** - Retain data only as long as necessary
6. **Integrity and Confidentiality** - Ensure appropriate security measures
7. **Accountability** - Demonstrate compliance

---

## Data Inventory

### Personal Data Collected

#### 1. Authentication Data (via Clerk)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| Email address | Account identification, communication | Clerk | Contract performance | Until account deletion or 2 years inactivity |
| Full name | Profile display | Clerk | Contract performance | Until account deletion |
| Profile picture | User identification | Clerk | Consent (optional) | Until account deletion |
| Authentication tokens | Session management | Clerk (JWT) | Contract performance | Session duration (30 days max) |

#### 2. CRM/Contact Data (Supabase - `contacts` table)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| First name, Last name | Contact identification | Supabase | Legitimate interest (business relationships) | Until manually deleted |
| Email address | Communication | Supabase | Legitimate interest | Until manually deleted |
| Phone number | Communication | Supabase | Legitimate interest | Until manually deleted |
| Company, Job title | Business context | Supabase | Legitimate interest | Until manually deleted |
| Website, LinkedIn URL | Professional context | Supabase | Legitimate interest | Until manually deleted |
| Twitter handle, GitHub username | Social/professional linking | Supabase | Legitimate interest | Until manually deleted |
| City, State, Country, Timezone | Location context | Supabase | Legitimate interest | Until manually deleted |
| Avatar URL | Visual identification | Supabase | Consent | Until manually deleted |
| Bio, Notes | Relationship context | Supabase | Legitimate interest | Until manually deleted |
| Custom fields (JSONB) | Flexible metadata | Supabase | Legitimate interest | Until manually deleted |
| Source tracking | Marketing attribution | Supabase | Legitimate interest | Until manually deleted |

#### 3. Marketing/Email Data (Supabase - `email_subscribers` table)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| Email address | Newsletter delivery | Supabase | Consent | Until unsubscribe or 2 years inactivity |
| First name, Last name | Personalization | Supabase | Consent | Until unsubscribe |
| Subscription preferences | Email targeting | Supabase | Consent | Until unsubscribe |
| Engagement metrics | Campaign analytics | Supabase | Legitimate interest | 26 months |
| IP address | Security, geolocation | Supabase | Legitimate interest | 90 days |
| User agent | Technical support | Supabase | Legitimate interest | 90 days |
| Source/Referrer | Marketing attribution | Supabase | Legitimate interest | Until unsubscribe |

#### 4. Analytics Data (Google Analytics)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| Page views | Usage analytics | Google Analytics | Consent | 26 months (GA default) |
| Session data | User behavior | Google Analytics | Consent | 26 months |
| Device/Browser info | Technical analytics | Google Analytics | Consent | 26 months |
| IP address (anonymized) | Geographic analytics | Google Analytics | Consent | 26 months |

#### 5. Audit/Security Data (Supabase - `audit_logs` table)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| User ID | Action attribution | Supabase | Legitimate interest (security) | 1 year |
| User email | Action attribution | Supabase | Legitimate interest | 1 year |
| IP address | Security monitoring | Supabase | Legitimate interest | 1 year |
| User agent | Security analysis | Supabase | Legitimate interest | 1 year |
| Action details | Audit trail | Supabase | Legal compliance | 1 year |

#### 6. NPS Survey Data (Supabase - `nps_responses` table)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| Email (optional) | Response attribution | Supabase | Consent | Indefinite (anonymized after 2 years) |
| NPS score | Customer satisfaction | Supabase | Consent | Indefinite |
| Feedback text | Product improvement | Supabase | Consent | Indefinite (anonymized after 2 years) |
| IP address | Fraud prevention | Supabase | Legitimate interest | 90 days |

#### 7. Interaction/Communication Data (Supabase - `interactions` table)

| Data Element | Purpose | Storage Location | Legal Basis | Retention Period |
|-------------|---------|------------------|-------------|------------------|
| Interaction type | CRM tracking | Supabase | Legitimate interest | Until contact deletion |
| Subject, Content | Communication history | Supabase | Legitimate interest | Until contact deletion |
| Duration, Outcome | Relationship management | Supabase | Legitimate interest | Until contact deletion |
| Related URLs, Attachments | Documentation | Supabase | Legitimate interest | Until contact deletion |

### Data Storage Locations

| Provider | Data Types | Location | Encryption |
|----------|-----------|----------|------------|
| **Supabase** | CRM, Marketing, Audit logs, NPS | US/EU (configurable) | At rest: AES-256, In transit: TLS 1.3 |
| **Clerk** | Authentication, User profiles | US | At rest: AES-256, In transit: TLS 1.3 |
| **Netlify** | Access logs, Edge function data | Global CDN | In transit: TLS 1.3 |
| **Google Analytics** | Usage analytics | US | In transit: TLS |
| **Sentry** (if enabled) | Error reports | US | At rest: AES-256, In transit: TLS |

---

## Data Subject Rights Implementation

### Right to Access (Data Export)

**Article 15 GDPR** - Data subjects have the right to obtain a copy of their personal data.

#### Implementation Requirements

1. **Export Scope**: All personal data associated with the requesting user
2. **Format**: Machine-readable format (JSON recommended)
3. **Timeline**: Within 30 days of request
4. **Verification**: Identity must be verified before export

#### Data Export Procedure

```sql
-- Example: Export all data for a specific email address
-- Run these queries and compile results into JSON

-- 1. Contact data
SELECT * FROM contacts WHERE email = '[user_email]';

-- 2. Interactions
SELECT i.* FROM interactions i
JOIN contacts c ON i.contact_id = c.id
WHERE c.email = '[user_email]';

-- 3. Follow-ups
SELECT f.* FROM follow_ups f
JOIN contacts c ON f.contact_id = c.id
WHERE c.email = '[user_email]';

-- 4. Email subscriber data
SELECT * FROM email_subscribers WHERE email = '[user_email]';

-- 5. Email events
SELECT e.* FROM email_events e
JOIN email_subscribers s ON e.subscriber_id = s.id
WHERE s.email = '[user_email]';

-- 6. NPS responses
SELECT * FROM nps_responses WHERE email = '[user_email]';

-- 7. Audit logs (if user was an admin)
SELECT * FROM audit_logs WHERE user_email = '[user_email]';
```

#### Technical Implementation Checklist

- [ ] Create `/api/gdpr/export` endpoint
- [ ] Implement identity verification flow
- [ ] Build data aggregation service
- [ ] Generate JSON export package
- [ ] Include metadata about processing
- [ ] Log export request in audit trail

### Right to Rectification

**Article 16 GDPR** - Data subjects have the right to correct inaccurate personal data.

#### Implementation Requirements

1. **Self-Service**: Users should be able to update their own data where possible
2. **Admin Interface**: Administrators can update on behalf of users
3. **Propagation**: Changes must propagate to all systems
4. **Logging**: All changes must be logged in audit trail

#### Rectification Procedure

1. User submits rectification request via email or contact form
2. Verify user identity
3. Update data in all relevant systems:
   - Supabase (CRM, Marketing, NPS)
   - Clerk (if authentication data)
4. Log changes in `audit_logs`
5. Confirm completion to user within 30 days

### Right to Erasure (Right to be Forgotten)

**Article 17 GDPR** - Data subjects have the right to request deletion of their personal data.

#### When Erasure Applies

- Data is no longer necessary for original purpose
- Consent is withdrawn
- Data was unlawfully processed
- User objects to processing (and no overriding legitimate grounds)

#### When Erasure May Be Refused

- Legal compliance requirements
- Public interest (archiving, research)
- Legal claims defense

#### Data Deletion Procedure

```sql
-- IMPORTANT: Run in transaction, backup first

BEGIN;

-- 1. Get user's contact ID(s)
SELECT id FROM contacts WHERE email = '[user_email]';

-- 2. Delete interactions (cascade handles this via FK)
DELETE FROM contacts WHERE email = '[user_email]';

-- 3. Delete email subscriber data
DELETE FROM email_subscribers WHERE email = '[user_email]';

-- 4. Anonymize NPS responses (keep for statistics)
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE email = '[user_email]';

-- 5. Anonymize audit logs (keep for compliance)
UPDATE audit_logs
SET user_email = '[DELETED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE user_email = '[user_email]';

-- 6. Delete from Clerk (via API)
-- This must be done separately via Clerk Dashboard or API

COMMIT;
```

#### Clerk User Deletion

```bash
# Via Clerk Dashboard:
# 1. Navigate to Users
# 2. Find user by email
# 3. Delete user account

# Via Clerk API:
curl -X DELETE "https://api.clerk.com/v1/users/{user_id}" \
  -H "Authorization: Bearer ${CLERK_SECRET_KEY}"
```

#### Deletion Checklist

- [ ] Verify identity of requester
- [ ] Check for legal retention requirements
- [ ] Delete from Supabase tables
- [ ] Delete from Clerk
- [ ] Anonymize data that must be retained
- [ ] Document deletion in compliance log
- [ ] Confirm deletion to user within 30 days

### Right to Data Portability

**Article 20 GDPR** - Data subjects have the right to receive their data in a portable format.

#### Implementation Requirements

1. **Format**: Structured, machine-readable (JSON, CSV)
2. **Scope**: Data provided by the user or generated through their use
3. **Direct Transfer**: If requested, transmit directly to another controller

#### Export Format Specification

```json
{
  "export_date": "2025-01-20T12:00:00Z",
  "data_controller": "MeJohnC.Org",
  "data_subject": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "contact_data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "user@example.com",
    "phone": "+1-555-0123",
    "company": "Example Corp",
    "created_at": "2024-06-15T10:30:00Z"
  },
  "email_subscriptions": {
    "status": "active",
    "lists": ["newsletter", "product-updates"],
    "subscribed_at": "2024-06-15T10:30:00Z"
  },
  "nps_responses": [
    {
      "survey": "Q4 2024 Satisfaction",
      "score": 9,
      "feedback": "Great service!",
      "responded_at": "2024-12-01T14:00:00Z"
    }
  ],
  "interaction_history": [
    {
      "type": "email_sent",
      "subject": "Welcome Email",
      "occurred_at": "2024-06-15T10:35:00Z"
    }
  ]
}
```

### Right to Object

**Article 21 GDPR** - Data subjects have the right to object to processing.

#### Processing Activities Subject to Objection

| Activity | Objection Mechanism | Result of Objection |
|----------|-------------------|---------------------|
| Marketing emails | Unsubscribe link | Immediate cessation |
| Analytics tracking | DNT header, consent withdrawal | Immediate cessation |
| Direct marketing | Email request | 30-day processing |
| Profiling | Email request | 30-day processing |

#### Objection Handling Procedure

1. Receive objection via email, unsubscribe link, or contact form
2. Verify legitimacy of request
3. Assess if compelling legitimate grounds exist to continue
4. If no grounds: cease processing immediately
5. If grounds exist: inform data subject within 30 days
6. Log objection and outcome

---

## Technical Implementation

### Data Export Functionality Requirements

#### API Endpoint Specification

```typescript
// POST /api/gdpr/export-request
interface ExportRequest {
  email: string;
  verification_token: string;  // From email verification
  format: 'json' | 'csv';
}

interface ExportResponse {
  request_id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  estimated_completion: string;  // ISO date
  download_url?: string;  // Available when ready
  expires_at?: string;  // Download link expiry
}
```

#### Implementation Steps

1. **Request Initiation**
   - User submits export request
   - System sends verification email
   - User clicks verification link

2. **Data Collection**
   - Query all relevant tables
   - Include Clerk data via API
   - Aggregate into single structure

3. **Export Generation**
   - Generate JSON/CSV file
   - Encrypt with user-provided password (optional)
   - Store temporarily (7 days)

4. **Delivery**
   - Send download link via email
   - Require authentication to download
   - Log successful delivery

### Data Deletion Procedures

#### Automated Deletion (Scheduled Tasks)

```sql
-- Create scheduled job for automatic data cleanup
-- Run daily via Supabase pg_cron or external scheduler

-- 1. Anonymize old audit logs (older than 1 year)
UPDATE audit_logs
SET user_email = '[ANONYMIZED]',
    user_id = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE created_at < NOW() - INTERVAL '1 year'
  AND user_email IS NOT NULL
  AND user_email != '[ANONYMIZED]'
  AND user_email != '[DELETED]';

-- 2. Delete old email events (older than 26 months)
DELETE FROM email_events
WHERE occurred_at < NOW() - INTERVAL '26 months';

-- 3. Clean up inactive subscribers (2+ years inactive)
UPDATE email_subscribers
SET status = 'inactive'
WHERE status = 'active'
  AND last_email_opened_at < NOW() - INTERVAL '2 years'
  AND last_email_clicked_at < NOW() - INTERVAL '2 years';

-- 4. Anonymize old NPS responses (older than 2 years)
UPDATE nps_responses
SET email = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE responded_at < NOW() - INTERVAL '2 years'
  AND email IS NOT NULL;
```

#### Manual Deletion Process

```bash
#!/bin/bash
# GDPR Data Deletion Script
# Usage: ./gdpr-delete.sh user@example.com

USER_EMAIL=$1

if [ -z "$USER_EMAIL" ]; then
  echo "Usage: $0 <email>"
  exit 1
fi

echo "Starting GDPR deletion for: $USER_EMAIL"

# 1. Export data first (for records)
echo "Creating backup export..."
# Run export query and save

# 2. Delete from Supabase
echo "Deleting from Supabase..."
# Run deletion SQL

# 3. Delete from Clerk
echo "Deleting from Clerk..."
# Call Clerk API

# 4. Log deletion
echo "Logging deletion..."
# Add to compliance log

echo "Deletion complete for: $USER_EMAIL"
```

### Anonymization Procedures

#### When to Anonymize vs. Delete

| Data Type | Approach | Reason |
|-----------|----------|--------|
| Audit logs | Anonymize | Legal compliance, security |
| NPS responses | Anonymize | Statistical analysis |
| Email events | Delete | No retention requirement |
| Contacts | Delete | No retention requirement |
| Email subscribers | Delete | No retention requirement |

#### Anonymization Standards

Anonymized data must be:
- **Irreversible**: Cannot be re-identified
- **Unlinked**: Cannot be connected to other data
- **Consistent**: Use same anonymization across exports

```sql
-- Example: Proper anonymization
UPDATE contacts
SET
  first_name = 'ANONYMIZED',
  last_name = 'USER',
  email = CONCAT('anon-', id, '@anonymized.local'),
  phone = NULL,
  linkedin_url = NULL,
  twitter_handle = NULL,
  github_username = NULL,
  website = NULL,
  avatar_url = NULL,
  bio = NULL,
  notes = NULL,
  city = NULL,
  state = NULL,
  timezone = NULL,
  custom_fields = '{}'::jsonb
WHERE email = '[user_email]';
```

---

## Data Processing Agreements

### Required DPAs

All third-party processors must have Data Processing Agreements in place.

#### 1. Supabase DPA

- **Processor**: Supabase Inc.
- **Data Processed**: All database content (CRM, Marketing, Audit logs)
- **DPA Location**: https://supabase.com/legal/dpa
- **Status**: [ ] Signed / [ ] Pending
- **Review Date**: ___________
- **Key Terms**:
  - Sub-processors: AWS
  - Data location: US (default), EU available
  - SCCs: Included

#### 2. Clerk DPA

- **Processor**: Clerk, Inc.
- **Data Processed**: Authentication data, user profiles
- **DPA Location**: https://clerk.com/legal/dpa
- **Status**: [ ] Signed / [ ] Pending
- **Review Date**: ___________
- **Key Terms**:
  - Sub-processors: AWS, GCP
  - Data location: US
  - SCCs: Included

#### 3. Netlify DPA

- **Processor**: Netlify, Inc.
- **Data Processed**: Access logs, edge function data
- **DPA Location**: https://www.netlify.com/legal/dpa/
- **Status**: [ ] Signed / [ ] Pending
- **Review Date**: ___________
- **Key Terms**:
  - Sub-processors: AWS, GCP
  - Data location: Global CDN
  - SCCs: Included

#### 4. Google Analytics DPA

- **Processor**: Google LLC
- **Data Processed**: Website analytics
- **DPA Location**: https://business.safety.google/adsprocessorterms/
- **Status**: [ ] Signed / [ ] Pending
- **Review Date**: ___________
- **Key Terms**:
  - Data location: US
  - SCCs: Required
  - IP Anonymization: Enabled

#### 5. Sentry DPA (if used)

- **Processor**: Functional Software, Inc.
- **Data Processed**: Error reports, stack traces
- **DPA Location**: https://sentry.io/legal/dpa/
- **Status**: [ ] Signed / [ ] Pending / [ ] Not Applicable
- **Review Date**: ___________

### DPA Review Schedule

| Provider | Last Review | Next Review | Owner |
|----------|-------------|-------------|-------|
| Supabase | __________ | __________ | _____ |
| Clerk | __________ | __________ | _____ |
| Netlify | __________ | __________ | _____ |
| Google | __________ | __________ | _____ |
| Sentry | __________ | __________ | _____ |

---

## Consent Management

### Consent Requirements

| Processing Activity | Consent Required | Mechanism |
|--------------------|------------------|-----------|
| Essential cookies | No (legitimate interest) | N/A |
| Analytics cookies | Yes | Consent banner |
| Marketing emails | Yes | Double opt-in |
| NPS surveys | Yes | Survey introduction |
| Error tracking | No (legitimate interest) | Privacy policy |

### Consent Collection Implementation

#### Cookie Consent Banner

The application implements consent management in `src/lib/analytics.ts`:

```typescript
// Consent is stored in localStorage
// Key: 'analytics_consent'
// Values: 'granted' | 'denied' | null

// Consent check before loading analytics
if (!isTrackingAllowed()) {
  return; // Do not load analytics
}

// Respect Do Not Track
if (navigator.doNotTrack === '1') {
  return; // Honor DNT preference
}
```

#### Email Marketing Consent

1. **Double Opt-In Flow**:
   - User submits email on subscription form
   - System sends confirmation email
   - User clicks confirmation link
   - Subscription activated only after confirmation

2. **Consent Records** (stored in `email_subscribers`):
   - `subscribed_at`: Timestamp of consent
   - `source`: How they subscribed
   - `ip_address`: IP at subscription time
   - `user_agent`: Browser at subscription time

#### Consent Withdrawal

| Channel | Mechanism | Processing Time |
|---------|-----------|-----------------|
| Analytics | Consent banner / DNT | Immediate |
| Email | Unsubscribe link | Immediate |
| All data | Email request | 30 days |

### Consent Records Storage

```sql
-- Create consent audit table
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  consent_type TEXT NOT NULL, -- 'analytics', 'marketing', 'all'
  action TEXT NOT NULL, -- 'granted', 'withdrawn'
  ip_address TEXT,
  user_agent TEXT,
  source TEXT, -- 'banner', 'form', 'email_request'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_consent_records_email ON consent_records(email);
CREATE INDEX idx_consent_records_type ON consent_records(consent_type);
```

---

## Data Breach Notification Procedures

### Definition of Personal Data Breach

A breach of security leading to accidental or unlawful:
- Destruction of personal data
- Loss of personal data
- Alteration of personal data
- Unauthorized disclosure of personal data
- Unauthorized access to personal data

### Breach Severity Assessment

| Severity | Description | Examples | Notification Required |
|----------|-------------|----------|----------------------|
| **Low** | No real risk to individuals | Encrypted laptop lost | Internal log only |
| **Medium** | Possible risk to individuals | Database accessed, no exfiltration confirmed | DPA within 72 hours |
| **High** | Likely risk to individuals | Data exfiltrated, includes PII | DPA + individuals without undue delay |
| **Critical** | High risk to individuals | Unencrypted credentials, financial data | DPA + individuals immediately |

### Breach Response Timeline

| Action | Timeline | Responsible Party |
|--------|----------|-------------------|
| Initial detection | T+0 | Security team |
| Internal assessment | Within 4 hours | Security + DPO |
| Severity determination | Within 12 hours | DPO |
| Supervisory authority notification | Within 72 hours | DPO |
| Data subject notification | Without undue delay | DPO + Comms |
| Full incident report | Within 30 days | Security team |

### Notification Templates

#### Supervisory Authority Notification

```
TO: [Local Data Protection Authority]
FROM: [Data Controller]
DATE: [Date]
RE: Personal Data Breach Notification - Article 33 GDPR

1. NATURE OF BREACH
   - Description: [What happened]
   - Date discovered: [Date/time]
   - Date occurred: [Date/time if known]

2. CATEGORIES OF DATA
   - Types: [email, names, etc.]
   - Approximate records: [number]

3. CATEGORIES OF DATA SUBJECTS
   - [Customers, employees, etc.]
   - Approximate individuals: [number]

4. LIKELY CONSEQUENCES
   - [Description of potential harm]

5. MEASURES TAKEN
   - Immediate: [Actions taken]
   - Planned: [Remediation steps]

6. CONTACT DETAILS
   - DPO: [Name, email, phone]
   - Organization: [Address]
```

#### Data Subject Notification

```
Subject: Important Security Notice - Action May Be Required

Dear [Name],

We are writing to inform you of a data security incident that may
affect your personal information.

WHAT HAPPENED
[Clear, plain-language description]

WHAT INFORMATION WAS INVOLVED
[List of data types]

WHAT WE ARE DOING
[Remediation steps]

WHAT YOU CAN DO
[Recommended actions for the individual]

FOR MORE INFORMATION
Contact our Data Protection Officer at [email/phone]

We sincerely apologize for any inconvenience this may cause.

[Signature]
```

### Post-Breach Actions

1. **Immediate** (0-24 hours)
   - Contain the breach
   - Preserve evidence
   - Begin assessment

2. **Short-term** (24-72 hours)
   - Complete assessment
   - Notify supervisory authority
   - Prepare subject notification

3. **Medium-term** (1-4 weeks)
   - Implement additional security measures
   - Complete incident report
   - Review and update procedures

4. **Long-term** (1-6 months)
   - Audit effectiveness of response
   - Update DPIA if needed
   - Staff training review

---

## Record of Processing Activities

### Template (Article 30 GDPR)

#### Processing Activity: User Authentication

| Field | Value |
|-------|-------|
| **Activity Name** | User Authentication |
| **Controller** | MeJohnC.Org |
| **Purpose** | Authenticate admin users to dashboard |
| **Categories of Data Subjects** | Site administrators |
| **Categories of Personal Data** | Email, name, profile picture |
| **Recipients** | Clerk (processor) |
| **International Transfers** | US (Clerk infrastructure) |
| **Retention Period** | Until account deletion or 2 years inactivity |
| **Security Measures** | TLS encryption, JWT tokens, MFA available |

#### Processing Activity: CRM Contact Management

| Field | Value |
|-------|-------|
| **Activity Name** | CRM Contact Management |
| **Controller** | MeJohnC.Org |
| **Purpose** | Manage business relationships and contacts |
| **Categories of Data Subjects** | Business contacts, leads, clients |
| **Categories of Personal Data** | Name, email, phone, company, job title, address, social profiles |
| **Recipients** | Supabase (processor) |
| **International Transfers** | US (Supabase infrastructure) |
| **Retention Period** | Until manually deleted |
| **Security Measures** | Row Level Security, TLS encryption, access controls |

#### Processing Activity: Email Marketing

| Field | Value |
|-------|-------|
| **Activity Name** | Email Marketing |
| **Controller** | MeJohnC.Org |
| **Purpose** | Send newsletters and marketing communications |
| **Categories of Data Subjects** | Newsletter subscribers |
| **Categories of Personal Data** | Email, name, subscription preferences, engagement metrics |
| **Recipients** | Supabase (processor), Email provider (processor) |
| **International Transfers** | US |
| **Retention Period** | Until unsubscribe or 2 years inactivity |
| **Security Measures** | Double opt-in, unsubscribe mechanism, TLS |

#### Processing Activity: Website Analytics

| Field | Value |
|-------|-------|
| **Activity Name** | Website Analytics |
| **Controller** | MeJohnC.Org |
| **Purpose** | Understand website usage and improve user experience |
| **Categories of Data Subjects** | Website visitors |
| **Categories of Personal Data** | IP address (anonymized), device info, browsing behavior |
| **Recipients** | Google Analytics (processor) |
| **International Transfers** | US |
| **Retention Period** | 26 months |
| **Security Measures** | IP anonymization, consent required, DNT respected |

#### Processing Activity: Audit Logging

| Field | Value |
|-------|-------|
| **Activity Name** | Audit Logging |
| **Controller** | MeJohnC.Org |
| **Purpose** | Security monitoring, compliance, troubleshooting |
| **Categories of Data Subjects** | Admin users |
| **Categories of Personal Data** | User ID, email, IP address, user agent, actions |
| **Recipients** | Supabase (processor) |
| **International Transfers** | US |
| **Retention Period** | 1 year (then anonymized) |
| **Security Measures** | RLS, encryption, access controls |

---

## GDPR Compliance Checklist

### Legal Basis and Transparency

- [ ] Privacy policy is up-to-date and accessible
- [ ] Legal basis documented for all processing activities
- [ ] Privacy notices provided at point of data collection
- [ ] Cookie consent banner implemented
- [ ] Do Not Track (DNT) signal respected

### Data Subject Rights

- [ ] Process for handling access requests documented
- [ ] Process for rectification requests documented
- [ ] Process for erasure requests documented
- [ ] Process for data portability documented
- [ ] Process for objection handling documented
- [ ] Identity verification procedure in place
- [ ] Response within 30 days achievable

### Technical Measures

- [ ] Data encrypted at rest (Supabase, Clerk)
- [ ] Data encrypted in transit (TLS/HTTPS)
- [ ] Access controls implemented (RLS, RBAC)
- [ ] Audit logging enabled
- [ ] Data minimization practiced
- [ ] Retention periods enforced (automated cleanup)
- [ ] Backup and recovery procedures tested

### Organizational Measures

- [ ] Data Protection Officer designated (if required)
- [ ] Staff training on GDPR completed
- [ ] Record of Processing Activities maintained
- [ ] Data breach response plan documented
- [ ] Regular compliance audits scheduled

### Third-Party Management

- [ ] Supabase DPA signed
- [ ] Clerk DPA signed
- [ ] Netlify DPA signed
- [ ] Google Analytics DPA signed (if used)
- [ ] Sentry DPA signed (if used)
- [ ] Sub-processor list maintained
- [ ] International transfer mechanisms in place (SCCs)

### Consent Management

- [ ] Analytics consent collected before tracking
- [ ] Email marketing uses double opt-in
- [ ] Consent withdrawal mechanism available
- [ ] Consent records stored with timestamp and source

### Data Breach Preparedness

- [ ] Breach detection mechanisms in place
- [ ] Breach response team identified
- [ ] Notification templates prepared
- [ ] Contact details for supervisory authority available
- [ ] Breach register established

### Documentation

- [ ] Privacy policy document
- [ ] Cookie policy document
- [ ] Data retention policy
- [ ] Data breach procedure
- [ ] Subject access request procedure
- [ ] DPIAs for high-risk processing (if applicable)

---

## Appendix A: SQL Functions for GDPR Operations

```sql
-- Function: Export user data as JSON
CREATE OR REPLACE FUNCTION gdpr_export_user_data(user_email TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'export_date', NOW(),
    'data_controller', 'MeJohnC.Org',
    'user_email', user_email,
    'contacts', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM contacts c WHERE c.email = user_email
    ),
    'email_subscriptions', (
      SELECT COALESCE(row_to_json(e), '{}'::json)
      FROM email_subscribers e WHERE e.email = user_email
    ),
    'nps_responses', (
      SELECT COALESCE(jsonb_agg(row_to_json(n)), '[]'::jsonb)
      FROM nps_responses n WHERE n.email = user_email
    ),
    'interactions', (
      SELECT COALESCE(jsonb_agg(row_to_json(i)), '[]'::jsonb)
      FROM interactions i
      JOIN contacts c ON i.contact_id = c.id
      WHERE c.email = user_email
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete user data (GDPR erasure)
CREATE OR REPLACE FUNCTION gdpr_delete_user_data(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete contacts (cascades to interactions, follow_ups)
  DELETE FROM contacts WHERE email = user_email;

  -- Delete email subscriber
  DELETE FROM email_subscribers WHERE email = user_email;

  -- Anonymize NPS responses
  UPDATE nps_responses
  SET email = NULL, ip_address = NULL, user_agent = NULL
  WHERE email = user_email;

  -- Anonymize audit logs
  UPDATE audit_logs
  SET user_email = '[DELETED]', user_id = NULL, ip_address = NULL, user_agent = NULL
  WHERE user_email = user_email;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Anonymize old data (scheduled cleanup)
CREATE OR REPLACE FUNCTION gdpr_cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
  rows_affected INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Anonymize audit logs older than 1 year
  UPDATE audit_logs
  SET user_email = '[ANONYMIZED]', user_id = NULL, ip_address = NULL, user_agent = NULL
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND user_email IS NOT NULL
    AND user_email NOT IN ('[ANONYMIZED]', '[DELETED]');
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  rows_affected := rows_affected + temp_count;

  -- Delete old email events
  DELETE FROM email_events WHERE occurred_at < NOW() - INTERVAL '26 months';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  rows_affected := rows_affected + temp_count;

  -- Anonymize old NPS responses
  UPDATE nps_responses
  SET email = NULL, ip_address = NULL, user_agent = NULL
  WHERE responded_at < NOW() - INTERVAL '2 years'
    AND email IS NOT NULL;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  rows_affected := rows_affected + temp_count;

  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Appendix B: Contact Information

**Data Controller**
MeJohnC.Org
[Address to be filled]

**Data Protection Officer**
[Name to be filled]
Email: [DPO email to be filled]

**Supervisory Authority**
[Relevant DPA based on controller location]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | System | Initial version |

---

*This document should be reviewed and updated at least annually or whenever significant changes are made to data processing activities.*
