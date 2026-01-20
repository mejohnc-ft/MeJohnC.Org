# Disaster Recovery Plan and Runbooks

This document provides comprehensive disaster recovery (DR) procedures for MeJohnC.Org, including recovery objectives, scenario-specific runbooks, and communication plans.

**Related**: See [backup-strategy.md](./backup-strategy.md) for backup procedures and retention policies.

---

## Table of Contents

1. [Disaster Recovery Overview](#disaster-recovery-overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Service Restoration Priority](#service-restoration-priority)
4. [Disaster Scenarios and Response](#disaster-scenarios-and-response)
   - [Complete Site Outage (Netlify)](#scenario-1-complete-site-outage-netlify)
   - [Database Corruption/Loss (Supabase)](#scenario-2-database-corruptionloss-supabase)
   - [Authentication Service Failure (Clerk)](#scenario-3-authentication-service-failure-clerk)
   - [Data Breach/Security Incident](#scenario-4-data-breachsecurity-incident)
   - [DNS/Domain Issues](#scenario-5-dnsdomain-issues)
   - [Code Deployment Failure](#scenario-6-code-deployment-failure)
5. [Failover Strategies](#failover-strategies)
6. [Data Recovery Procedures](#data-recovery-procedures)
7. [DR Testing Schedule](#dr-testing-schedule)
8. [Roles and Responsibilities](#roles-and-responsibilities)
9. [Communication Plan](#communication-plan)
10. [Post-Incident Review Process](#post-incident-review-process)
11. [DR Checklist and Quick Reference](#dr-checklist-and-quick-reference)

---

## Disaster Recovery Overview

### Purpose

This disaster recovery plan ensures MeJohnC.Org can recover from major service disruptions with minimal data loss and downtime. The plan covers all critical infrastructure components and provides step-by-step procedures for restoration.

### Scope

| Component | Provider | DR Responsibility |
|-----------|----------|-------------------|
| Frontend/CDN | Netlify | Netlify (primary), Owner (failover) |
| Database | Supabase (PostgreSQL) | Supabase (PITR), Owner (manual backups) |
| Authentication | Clerk | Clerk (managed) |
| Source Code | GitHub | GitHub + Owner (distributed Git) |
| DNS | Domain Registrar | Owner |
| Secrets/Config | Netlify + Various | Owner |

### Infrastructure Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              DNS Provider               │
                    │         (mejohnc.org records)           │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │           Netlify CDN/Edge              │
                    │    (Static hosting, Edge Functions)     │
                    └─────────────────┬───────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
┌────────▼────────┐        ┌──────────▼──────────┐       ┌────────▼────────┐
│   Supabase      │        │       Clerk         │       │   Ghost CMS     │
│  (PostgreSQL)   │        │  (Authentication)   │       │   (Blog API)    │
│   Database      │        │                     │       │                 │
└─────────────────┘        └─────────────────────┘       └─────────────────┘
         │
         │
┌────────▼────────┐
│   GitHub        │
│  (Source Code)  │
└─────────────────┘
```

### DR Philosophy

1. **Managed Services First**: Leverage provider SLAs and built-in redundancy
2. **Defense in Depth**: Multiple backup layers for critical data
3. **Graceful Degradation**: Site can operate in read-only mode during partial outages
4. **Rapid Recovery**: Prioritize getting public-facing content online first
5. **Documentation**: All procedures tested and documented

---

## Recovery Objectives

### Recovery Time Objective (RTO)

**Definition**: Maximum acceptable time between service disruption and restoration.

| Service | RTO Target | Justification |
|---------|------------|---------------|
| Public Portfolio Site | 4 hours | Static content; low business impact |
| Admin Dashboard | 8 hours | Internal tool; can tolerate longer outage |
| Database (Read) | 4 hours | Supabase PITR restoration time |
| Database (Write) | 8 hours | May require manual verification |
| Authentication | 2 hours | Clerk SLA; critical for admin access |
| Full Site Recovery | 24 hours | Complete disaster recovery scenario |

### Recovery Point Objective (RPO)

**Definition**: Maximum acceptable amount of data loss measured in time.

| Data Type | RPO Target | Backup Method |
|-----------|------------|---------------|
| Portfolio Content | 24 hours | Daily automated backups |
| Blog Posts | 1 hour | Ghost CMS + Supabase PITR |
| CRM Data | 1 hour | Supabase PITR (Pro plan) |
| User Sessions | 0 (stateless) | No persistence required |
| Audit Logs | 7 days | Point-in-time recovery window |
| Configuration | 24 hours | Manual backup after changes |

### RTO/RPO Summary Matrix

```
                       │ 0-1 hr  │ 1-4 hr  │ 4-8 hr  │ 8-24 hr │
───────────────────────┼─────────┼─────────┼─────────┼─────────┤
Public Site            │         │    ◄────│─────────│─────────│ RTO: 4hr
Admin Dashboard        │         │         │    ◄────│─────────│ RTO: 8hr
Authentication         │    ◄────│─────────│─────────│─────────│ RTO: 2hr
Database               │         │    ◄────│─────────│─────────│ RTO: 4hr
Full Recovery          │         │         │         │    ◄────│ RTO: 24hr

RPO: Portfolio = 24hr | CRM = 1hr | Sessions = 0
```

---

## Service Restoration Priority

During a disaster, restore services in this order:

### Priority 1: Critical (Restore First)

| Order | Service | Rationale | Dependency |
|-------|---------|-----------|------------|
| 1 | DNS | All services depend on DNS resolution | None |
| 2 | Netlify CDN | Serves static content to users | DNS |
| 3 | Authentication (Clerk) | Required for admin operations | Netlify |

### Priority 2: High (Restore Second)

| Order | Service | Rationale | Dependency |
|-------|---------|-----------|------------|
| 4 | Database (Read) | Display dynamic content | Netlify |
| 5 | Database (Write) | Enable content management | Database Read |
| 6 | Ghost CMS | Blog content integration | Netlify |

### Priority 3: Medium (Restore Third)

| Order | Service | Rationale | Dependency |
|-------|---------|-----------|------------|
| 7 | Admin Dashboard Full | Complete admin functionality | All P1/P2 |
| 8 | Analytics | Tracking and monitoring | Netlify |
| 9 | Edge Functions | Rate limiting, API routing | Netlify |

### Priority 4: Low (Final Restoration)

| Order | Service | Rationale | Dependency |
|-------|---------|-----------|------------|
| 10 | CI/CD Pipeline | Development workflow | GitHub |
| 11 | Monitoring Alerts | Ongoing observability | All services |
| 12 | Non-critical integrations | Nice-to-have features | Various |

---

## Disaster Scenarios and Response

### Scenario 1: Complete Site Outage (Netlify)

**Severity**: P1 - Critical
**Impact**: Site completely inaccessible to all users
**RTO**: 4 hours

#### Symptoms

- Site returns connection errors or timeouts
- Netlify status shows widespread outage
- Multiple regions affected
- No response from edge locations

#### Immediate Actions (0-15 minutes)

1. **Verify the outage scope**
   ```bash
   # Check site from multiple locations
   curl -sI https://mejohnc.org | head -5

   # Check Netlify status
   open https://netlifystatus.com

   # Check from external monitoring
   open https://downforeveryoneorjustme.com/mejohnc.org
   ```

2. **Declare incident and notify stakeholders**
   - Use communication template (see [Communication Plan](#communication-plan))
   - Create incident ticket in GitHub

3. **Assess whether this is a platform issue or site-specific**

#### Response Procedures

**If Netlify Platform Outage:**

1. Subscribe to Netlify status updates
2. Prepare failover to backup provider
3. Update status page/communication
4. Monitor for recovery

**If Site-Specific Issue:**

1. **Check recent deployments**
   ```bash
   netlify deploy:list --limit 10
   ```

2. **Rollback to last known good deployment**
   ```bash
   # Get deploy ID of last working version
   netlify deploy:list

   # Rollback
   netlify deploy --prod --deploy-id=<PREVIOUS_DEPLOY_ID>
   ```

3. **Check build logs**
   ```bash
   netlify builds
   netlify build:logs <BUILD_ID>
   ```

**If Extended Outage (>2 hours) - Activate Failover:**

1. **Deploy to backup provider**
   ```bash
   # Clone repository
   git clone git@github.com:mejohnc-ft/MeJohnC.Org.git
   cd MeJohnC.Org

   # Deploy to Vercel (backup)
   npx vercel --prod

   # Or deploy to Cloudflare Pages
   npx wrangler pages deploy dist
   ```

2. **Update DNS to point to backup provider**
   - Access domain registrar
   - Update A/CNAME records
   - Note: Allow for DNS propagation (TTL-dependent)

3. **Update environment variables on backup provider**
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_CLERK_PUBLISHABLE_KEY
   - Other required variables

#### Verification Steps

- [ ] Site loads from multiple locations
- [ ] All pages accessible
- [ ] No console errors
- [ ] Response time < 3s
- [ ] SSL certificate valid
- [ ] Authentication working
- [ ] Database connections working

#### Communication Template

```
INCIDENT: MeJohnC.Org Site Outage
Severity: P1 - Critical
Status: [Investigating/Identified/Monitoring/Resolved]

Impact: Website is currently inaccessible. Users cannot view portfolio or access admin functions.

Current Actions: [Description of actions being taken]

Next Update: [Time]

---

Updates:
[HH:MM] - [Update description]
```

---

### Scenario 2: Database Corruption/Loss (Supabase)

**Severity**: P1 - Critical
**Impact**: Data unavailable or corrupted; dynamic content not loading
**RTO**: 8 hours | **RPO**: 1 hour

#### Symptoms

- "Failed to fetch" errors throughout site
- Supabase connection errors in console
- Data displaying as null/undefined
- Database queries timing out
- Supabase dashboard shows errors

#### Immediate Actions (0-15 minutes)

1. **Verify database status**
   ```bash
   # Check Supabase status
   open https://status.supabase.com
   ```

2. **Check database connectivity**
   ```sql
   -- In Supabase SQL Editor
   SELECT 1 as health_check;

   -- Check connection count
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Identify scope of corruption/loss**
   ```sql
   -- Check table row counts
   SELECT relname, n_live_tup
   FROM pg_stat_user_tables
   ORDER BY n_live_tup DESC;

   -- Check for recent changes
   SELECT * FROM audit_logs
   ORDER BY created_at DESC
   LIMIT 20;
   ```

#### Response Procedures

**For Partial Data Corruption:**

1. **Identify affected data**
   ```sql
   -- Example: Find corrupted records
   SELECT * FROM apps WHERE name IS NULL OR slug IS NULL;
   SELECT * FROM blog_posts WHERE content IS NULL;
   ```

2. **Restore affected tables from backup**
   ```bash
   # Backup current state first
   pg_dump $DATABASE_URL -t affected_table > pre_restore_backup.sql

   # Restore from manual backup
   psql $DATABASE_URL -c "TRUNCATE TABLE affected_table CASCADE;"
   gunzip -c backup_YYYYMMDD.sql.gz | psql $DATABASE_URL
   ```

**For Complete Database Loss:**

1. **Initiate Point-in-Time Recovery**
   - Access Supabase Dashboard
   - Navigate to: Settings > Database > Backups
   - Select "Point-in-time Recovery"
   - Choose timestamp just before incident
   - Initiate recovery (creates new instance)

2. **If PITR unavailable, restore from manual backup**
   ```bash
   # Get latest manual backup
   ls -la /path/to/backups/

   # Verify backup integrity
   sha256sum -c checksums.sha256
   gunzip -t backup_file.sql.gz

   # Create new Supabase project if needed
   # Or restore to existing database
   gunzip -c full_backup.sql.gz | psql $DATABASE_URL
   ```

3. **Restore RLS policies and functions**
   ```sql
   -- Verify is_admin function exists
   SELECT proname FROM pg_proc WHERE proname = 'is_admin';

   -- Verify RLS policies
   SELECT * FROM pg_policies WHERE schemaname = 'public';

   -- Re-apply if missing (from schema backup)
   \i schema_backup.sql
   ```

4. **Update application connection strings**
   - If new database instance created:
   - Update VITE_SUPABASE_URL in Netlify
   - Update VITE_SUPABASE_ANON_KEY in Netlify
   - Trigger redeploy

#### Verification Steps

- [ ] Database queries returning data
- [ ] No connection errors in console
- [ ] Row counts match expected values
- [ ] CRUD operations functional
- [ ] RLS policies active
- [ ] Admin authentication working
- [ ] Audit logging functional

#### Communication Template

```
INCIDENT: Database Service Disruption
Severity: P1 - Critical
Status: [Investigating/Identified/Monitoring/Resolved]

Impact: Dynamic content is not loading. Portfolio data and CRM features are unavailable.

Data Status: [No data loss / Potential data loss of X hours / Assessing]

Current Actions: [Description of recovery actions]

Next Update: [Time]
```

---

### Scenario 3: Authentication Service Failure (Clerk)

**Severity**: P2 - High
**Impact**: Users cannot sign in; admin dashboard inaccessible
**RTO**: 2 hours

#### Symptoms

- Sign-in buttons not responding
- "Unauthorized" or 401 errors
- Redirect loops during authentication
- Clerk components not loading
- Session not persisting

#### Immediate Actions (0-15 minutes)

1. **Verify Clerk status**
   ```bash
   open https://status.clerk.com
   ```

2. **Check API key validity**
   ```bash
   # Verify environment variable format
   netlify env:list | grep CLERK
   ```

3. **Test authentication flow**
   - Open incognito browser
   - Navigate to protected route
   - Check browser console for errors
   - Check Network tab for failed requests

#### Response Procedures

**If Clerk Platform Outage:**

1. **Enable read-only mode**
   - Public site remains accessible
   - Admin functions disabled
   - Display maintenance message for admin area

2. **Monitor Clerk status**
   - Subscribe to status updates
   - Prepare communication for stakeholders

3. **Document impact**
   - What admin operations are blocked
   - Estimated resolution time from Clerk

**If Configuration Issue:**

1. **Check Clerk Dashboard**
   - Navigate to: dashboard.clerk.com
   - Verify application settings
   - Check API keys are active
   - Verify domain configuration

2. **Regenerate API key if needed**
   ```bash
   # Generate new key in Clerk Dashboard
   # Update in Netlify
   netlify env:set VITE_CLERK_PUBLISHABLE_KEY "pk_live_new_key"

   # Trigger redeploy
   netlify deploy --prod
   ```

3. **Check domain allowlist**
   - Clerk Dashboard > Settings > Domains
   - Ensure mejohnc.org is listed
   - Ensure localhost:5173 for development

**If Session/Cookie Issues:**

1. **Check cookie settings**
   - Verify SameSite attribute
   - Check Secure flag requirements
   - Review cookie domain scope

2. **Clear and test**
   ```javascript
   // In browser console
   document.cookie.split(";").forEach(function(c) {
     document.cookie = c.replace(/^ +/, "")
       .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
   });
   // Reload and test sign-in
   ```

#### Verification Steps

- [ ] Sign in works for new sessions
- [ ] Sign out works properly
- [ ] Protected routes accessible after auth
- [ ] Admin access working for admin users
- [ ] Session persists across page refreshes
- [ ] No console errors related to Clerk

#### Communication Template

```
INCIDENT: Authentication Service Disruption
Severity: P2 - High
Status: [Investigating/Identified/Monitoring/Resolved]

Impact: Users cannot sign in to admin dashboard. Public portfolio remains accessible.

Workaround: None - authentication is required for admin functions.

Current Actions: [Description]

Next Update: [Time]
```

---

### Scenario 4: Data Breach/Security Incident

**Severity**: P1 - Critical (Always)
**Impact**: Potential data exposure, unauthorized access, or system compromise
**RTO**: Immediate containment; 24 hours full recovery

#### Symptoms

- Unauthorized access detected in audit logs
- Suspicious API calls or database queries
- Credentials found exposed
- Unusual account activity
- External report of vulnerability

#### Immediate Actions (0-15 minutes)

**CRITICAL: Containment takes priority over investigation**

1. **Revoke compromised credentials immediately**
   ```bash
   # Rotate Supabase keys
   # Dashboard > Settings > API > Generate new keys

   # Rotate Clerk keys
   # Dashboard > API Keys > Rotate

   # Update Netlify environment variables
   netlify env:set VITE_SUPABASE_ANON_KEY "new_key"
   netlify env:set VITE_CLERK_PUBLISHABLE_KEY "new_key"
   ```

2. **Disable compromised accounts**
   ```sql
   -- Remove compromised admin
   DELETE FROM admin_users WHERE email = 'compromised@email.com';

   -- Check all admin users
   SELECT * FROM admin_users;
   ```

3. **Preserve evidence before any cleanup**
   - Screenshot all relevant logs
   - Export audit logs
   - Document timeline with timestamps
   - Save network request logs

#### Response Procedures

**Phase 1: Containment (0-1 hour)**

1. **Identify attack vector**
   - Credential stuffing
   - API key exposure
   - XSS/injection vulnerability
   - Session hijacking
   - Social engineering

2. **Block ongoing attack**
   ```sql
   -- Check recent suspicious activity
   SELECT * FROM audit_logs
   WHERE created_at > 'INCIDENT_START_TIME'
   ORDER BY created_at DESC;
   ```

3. **Isolate affected systems**
   - If database compromised: Consider read-only mode
   - If auth compromised: Disable sign-in temporarily

**Phase 2: Investigation (1-4 hours)**

1. **Determine scope**
   ```sql
   -- What data was accessed
   SELECT * FROM audit_logs
   WHERE action IN ('read', 'export', 'download')
     AND created_at > 'INCIDENT_START_TIME';

   -- Check for data modifications
   SELECT * FROM audit_logs
   WHERE action IN ('update', 'delete', 'insert')
     AND created_at > 'INCIDENT_START_TIME';
   ```

2. **Assess data impact**
   - What data was potentially exposed
   - How many users affected
   - Was data exfiltrated
   - What was the attack duration

3. **Identify root cause**
   - Review code for vulnerabilities
   - Check for exposed credentials in Git history
   - Review access logs for anomalies

**Phase 3: Remediation (4-24 hours)**

1. **Close attack vector**
   - Deploy security patches
   - Update vulnerable dependencies
   - Fix configuration issues

2. **Full credential rotation**
   - All API keys
   - Database passwords
   - Service accounts
   - Personal access tokens

3. **Enhanced monitoring**
   - Add additional audit logging
   - Set up anomaly detection
   - Increase alert sensitivity

**Phase 4: Notification (As Required)**

1. **Internal notification**
   - Site owner (immediate)
   - DevOps lead (within 1 hour)
   - Legal/compliance (if applicable)

2. **External notification (if user data exposed)**
   - GDPR requirement: 72 hours to supervisory authority
   - User notification: As soon as practical
   - Consider credit monitoring for sensitive data

#### Verification Steps

- [ ] All credentials rotated
- [ ] Attack vector closed
- [ ] No ongoing suspicious activity
- [ ] Monitoring enhanced
- [ ] Evidence preserved
- [ ] Stakeholders notified
- [ ] Legal/compliance requirements met
- [ ] Post-incident review scheduled

#### Communication Template

```
SECURITY INCIDENT: [Brief Description]
Severity: P1 - Critical
Classification: [Confirmed Breach / Suspected Breach / Vulnerability]
Status: [Contained / Investigating / Remediated]

Impact Assessment:
- Data potentially affected: [Description]
- Users potentially affected: [Number/scope]
- Attack vector: [If known]

Immediate Actions Taken:
- [Action 1]
- [Action 2]

Ongoing Investigation: [Status]

Legal/Compliance: [Actions taken or planned]

Next Update: [Time]

DO NOT share this communication externally without approval.
```

---

### Scenario 5: DNS/Domain Issues

**Severity**: P1 - Critical
**Impact**: Site unreachable; all services inaccessible
**RTO**: 4 hours (longer if registrar-related)

#### Symptoms

- Site not resolving (NXDOMAIN)
- DNS pointing to wrong server
- SSL certificate errors due to DNS
- Subdomain issues
- Email delivery failures

#### Immediate Actions (0-15 minutes)

1. **Verify DNS status**
   ```bash
   # Check current DNS records
   nslookup mejohnc.org
   dig mejohnc.org A
   dig mejohnc.org CNAME

   # Check from multiple DNS servers
   dig @8.8.8.8 mejohnc.org
   dig @1.1.1.1 mejohnc.org

   # Check DNS propagation
   open https://dnschecker.org/#A/mejohnc.org
   ```

2. **Access domain registrar**
   - Log in to registrar account
   - Check domain status (active, expired, locked)
   - Verify DNS records

3. **Check for unauthorized changes**
   - Review recent DNS modifications
   - Check for domain transfer attempts
   - Verify registrar contact info

#### Response Procedures

**If Domain Expired:**

1. **Renew immediately**
   - Log in to registrar
   - Complete renewal process
   - Enable auto-renewal

2. **Wait for propagation**
   - May take 24-48 hours
   - Monitor propagation status

**If DNS Records Incorrect:**

1. **Correct DNS records**
   - Point to Netlify:
     - CNAME: @ -> apex-loadbalancer.netlify.com
     - or A records as specified by Netlify
   - Add verification records if needed

2. **Verify Netlify domain settings**
   - Netlify Dashboard > Domain settings
   - Re-verify custom domain if needed

**If Domain Hijacked:**

1. **Contact registrar immediately**
   - Report unauthorized access
   - Request domain lock
   - Verify identity

2. **Document evidence**
   - Screenshots of unauthorized changes
   - Timeline of events
   - IP addresses if available

3. **Consider legal action if necessary**

**If SSL/Certificate Issues:**

1. **Force certificate renewal**
   - Netlify Dashboard > Domain settings
   - Click "Renew certificate"

2. **Verify DNS is propagated**
   - Certificate provisioning requires correct DNS

#### Verification Steps

- [ ] Domain resolves correctly
- [ ] All DNS records accurate
- [ ] SSL certificate valid
- [ ] All subdomains working
- [ ] Email delivery functioning (if applicable)
- [ ] No unauthorized DNS changes

#### Communication Template

```
INCIDENT: DNS/Domain Service Disruption
Severity: P1 - Critical
Status: [Investigating/Identified/Monitoring/Resolved]

Impact: mejohnc.org is not resolving. Site is completely inaccessible.

Cause: [Expired domain / DNS misconfiguration / Registrar issue / Unknown]

Actions Taken: [Description]

Estimated Resolution: [Time - note DNS propagation may take 24-48 hours]

Next Update: [Time]
```

---

### Scenario 6: Code Deployment Failure

**Severity**: P2 - High (P1 if production broken)
**Impact**: Site broken or not updating; deployment pipeline blocked
**RTO**: 2 hours

#### Symptoms

- Build failures in Netlify
- Site displaying old content after deploy
- JavaScript errors after deployment
- Missing assets or broken links
- Deployment stuck or timing out

#### Immediate Actions (0-15 minutes)

1. **Check deployment status**
   ```bash
   # View recent deployments
   netlify deploy:list --limit 10

   # Check current deployment
   netlify status
   ```

2. **Review build logs**
   ```bash
   # Via CLI
   netlify builds
   netlify build:logs <BUILD_ID>

   # Or via Netlify Dashboard > Deploys > [Deploy] > Deploy log
   ```

3. **Identify if rollback needed**
   - Is the production site broken?
   - If yes, proceed to immediate rollback

#### Response Procedures

**If Production Site Broken - Immediate Rollback:**

```bash
# List deployments with IDs
netlify deploy:list

# Find last working deployment ID
# Rollback immediately
netlify deploy --prod --deploy-id=<LAST_GOOD_DEPLOY_ID>

# Verify site is back
curl -sI https://mejohnc.org
```

**If Build Failure - Diagnose:**

1. **Check common causes**
   - TypeScript errors
   - ESLint failures
   - Missing dependencies
   - Environment variable issues
   - Node version mismatch

2. **Review recent changes**
   ```bash
   # Recent commits
   git log --oneline -20

   # Recent PRs
   gh pr list --state merged --limit 10
   ```

3. **Test locally**
   ```bash
   # Install dependencies
   npm ci

   # Run build locally
   npm run build

   # Run type check
   npm run type-check

   # Run linting
   npm run lint
   ```

**If Environment Variable Issues:**

1. **Verify variables are set**
   ```bash
   netlify env:list
   ```

2. **Check variable names and values**
   - No trailing slashes
   - No quotes in values
   - Correct prefixes (VITE_)

3. **Update if needed**
   ```bash
   netlify env:set VARIABLE_NAME "correct_value"
   ```

**If Dependency Issues:**

1. **Clear npm cache**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

3. **Check for breaking updates**
   ```bash
   npm outdated
   ```

#### Verification Steps

- [ ] Build completes successfully
- [ ] Deploy shows as "Published"
- [ ] Site loads correctly
- [ ] No console errors
- [ ] All routes working
- [ ] Assets loading properly
- [ ] New changes visible on site

#### Communication Template

```
INCIDENT: Deployment Failure
Severity: P2 - High
Status: [Build Failed / Rollback Complete / Investigating / Resolved]

Impact: [Deployment pipeline blocked / Production site showing errors / Site not updating]

Last Working Version: [Deployment ID or commit hash]

Root Cause: [If identified]

Actions Taken:
- [Action 1]
- [Action 2]

Next Steps: [Plan to resolve]

Next Update: [Time]
```

---

## Failover Strategies

### Primary Hosting Failover (Netlify to Backup)

**Trigger**: Netlify outage > 2 hours or complete service failure

**Backup Providers** (in order of preference):
1. Vercel
2. Cloudflare Pages
3. AWS S3 + CloudFront

#### Failover Procedure

1. **Prepare backup deployment**
   ```bash
   git clone git@github.com:mejohnc-ft/MeJohnC.Org.git
   cd MeJohnC.Org
   npm install
   npm run build
   ```

2. **Deploy to Vercel (Option A)**
   ```bash
   npx vercel --prod
   # Follow prompts to configure project
   # Note the assigned URL
   ```

3. **Deploy to Cloudflare Pages (Option B)**
   ```bash
   npx wrangler pages deploy dist
   # Or via Cloudflare Dashboard
   ```

4. **Update DNS**
   - Access domain registrar
   - Update CNAME/A records to point to backup provider
   - Reduce TTL for faster future changes

5. **Configure environment variables on backup provider**

6. **Verify deployment**

### Database Failover (Supabase)

**Trigger**: Supabase regional outage > 4 hours or data corruption

**Options**:
1. Supabase PITR to new instance
2. Manual restore to new Supabase project
3. Emergency: Self-hosted PostgreSQL

#### Procedure for New Supabase Project

1. Create new Supabase project
2. Restore from manual backup
3. Update connection strings in hosting provider
4. Test application functionality
5. Update DNS if needed (for custom domains)

### Authentication Failover (Clerk)

**Trigger**: Clerk complete outage > 4 hours

**Strategy**: Graceful degradation to read-only mode

1. **Disable authentication requirement for public routes**
   - All public portfolio content remains accessible
   - Admin routes show maintenance message

2. **Prepare manual admin access** (emergency only)
   - Direct database access for critical updates
   - Document any changes for later reconciliation

---

## Data Recovery Procedures

### Immediate Data Recovery (< 1 hour data loss)

**Use Supabase Point-in-Time Recovery**

1. Access Supabase Dashboard
2. Navigate to: Settings > Database > Backups
3. Select "Point-in-time Recovery"
4. Choose timestamp 5-10 minutes before incident
5. Initiate recovery
6. Verify data integrity
7. Update application connection strings if new instance

### Standard Data Recovery (1-24 hours data loss)

**Use Latest Manual Backup**

1. Identify latest backup
   ```bash
   ls -la /path/to/backups/daily/
   ```

2. Verify backup integrity
   ```bash
   sha256sum -c checksums.sha256
   gunzip -t backup_YYYYMMDD.sql.gz
   ```

3. Restore to database
   ```bash
   # For partial restore
   psql $DATABASE_URL < table_backup.sql

   # For full restore
   gunzip -c full_backup.sql.gz | psql $DATABASE_URL
   ```

4. Verify data
   ```sql
   SELECT COUNT(*) FROM apps;
   SELECT COUNT(*) FROM blog_posts;
   -- Compare with expected counts
   ```

5. Test application

### Extended Data Recovery (> 24 hours data loss)

**Use Weekly Full Backup + WAL Replay (if available)**

1. Locate weekly backup
2. Restore full backup
3. Apply any available transaction logs
4. Accept data loss for unrecoverable period
5. Document lost data for potential manual recreation

### Data Reconciliation After Recovery

After any recovery, perform these checks:

1. **Verify row counts**
   ```sql
   SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;
   ```

2. **Check data integrity**
   ```sql
   -- Check for orphaned records
   SELECT p.* FROM blog_posts p
   LEFT JOIN apps a ON p.app_id = a.id
   WHERE a.id IS NULL AND p.app_id IS NOT NULL;
   ```

3. **Verify RLS policies**
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

4. **Test critical functions**
   ```sql
   SELECT is_admin(); -- Should return without error
   ```

---

## DR Testing Schedule

### Quarterly Testing Calendar

| Quarter | Month | Week | Test Activity | Duration |
|---------|-------|------|---------------|----------|
| Q1 | January | 3rd | Full restore test | 4 hours |
| Q1 | February | 2nd | PITR recovery drill | 2 hours |
| Q1 | March | 4th | Failover simulation | 2 hours |
| Q2 | April | 3rd | Full restore test | 4 hours |
| Q2 | May | 2nd | Security incident drill | 2 hours |
| Q2 | June | 4th | Communication test | 1 hour |
| Q3 | July | 3rd | Full restore test | 4 hours |
| Q3 | August | 2nd | PITR recovery drill | 2 hours |
| Q3 | September | 4th | DR tabletop exercise | 2 hours |
| Q4 | October | 3rd | Full restore test | 4 hours |
| Q4 | November | 2nd | Annual DR review | 4 hours |
| Q4 | December | 1st | Secrets rotation + backup | 2 hours |

### Test Procedures

#### Full Restore Test

**Objective**: Verify backups can restore a fully functional system

**Procedure**:

1. [ ] Create staging environment
2. [ ] Identify backup to test
3. [ ] Restore database backup
4. [ ] Deploy application code
5. [ ] Configure environment variables
6. [ ] Verify all functionality
7. [ ] Document results
8. [ ] Clean up staging environment

**Success Criteria**:
- Restore completes within RTO
- Data loss within RPO
- All critical functions operational

#### PITR Recovery Drill

**Objective**: Practice point-in-time recovery process

**Procedure**:

1. [ ] Document current database state
2. [ ] Create test data changes
3. [ ] Note timestamp
4. [ ] Initiate PITR to moment before changes
5. [ ] Verify test changes are reverted
6. [ ] Document recovery time
7. [ ] Clean up test instance

#### Failover Simulation

**Objective**: Test backup hosting provider deployment

**Procedure**:

1. [ ] Build application for production
2. [ ] Deploy to backup provider (Vercel/Cloudflare)
3. [ ] Configure DNS (in test mode)
4. [ ] Verify site functionality
5. [ ] Document issues encountered
6. [ ] Remove test deployment

#### DR Tabletop Exercise

**Objective**: Walk through DR scenarios without executing

**Agenda** (2 hours):

1. Scenario presentation (15 min)
2. Response decision walkthrough (30 min)
3. Communication plan review (15 min)
4. Recovery steps discussion (30 min)
5. Gap identification (20 min)
6. Action items (10 min)

---

## Roles and Responsibilities

### DR Team Structure

```
                    ┌──────────────────┐
                    │  Incident        │
                    │  Commander (IC)  │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼───────┐   ┌────────▼────────┐   ┌──────▼──────┐
│ Technical     │   │ Communications  │   │ Operations  │
│ Lead          │   │ Lead            │   │ Lead        │
└───────────────┘   └─────────────────┘   └─────────────┘
```

### Role Definitions

#### Incident Commander (IC)

**Responsibilities**:
- Overall incident coordination
- Decision authority for recovery actions
- Resource allocation
- Escalation decisions
- Final approval for external communications

**Activation**: Any P1 incident or at discretion for P2

#### Technical Lead

**Responsibilities**:
- Direct technical recovery efforts
- Coordinate with service providers
- Execute recovery procedures
- Verify technical restoration
- Document technical timeline

**Skills Required**: Full stack development, infrastructure, database

#### Communications Lead

**Responsibilities**:
- Stakeholder communication
- Status updates (internal and external)
- Customer communication drafting
- Status page updates
- Post-incident communication

#### Operations Lead

**Responsibilities**:
- Monitor service health
- Coordinate with vendors
- Track recovery progress
- Ensure documentation
- Manage checklists

### Contact Matrix

| Role | Primary | Secondary | Contact Method |
|------|---------|-----------|----------------|
| Incident Commander | [NAME] | [NAME] | Phone, Slack |
| Technical Lead | [NAME] | [NAME] | Phone, Slack |
| Communications Lead | [NAME] | [NAME] | Phone, Slack |
| Operations Lead | [NAME] | [NAME] | Phone, Slack |

### Escalation Path

```
Time Elapsed    Action
─────────────   ──────────────────────────────────────
0 min           Primary on-call notified
15 min          Secondary on-call if no response
30 min          Technical lead escalation
1 hour          Incident Commander engaged
2 hours         Consider external support
4 hours         Executive notification (P1 only)
```

---

## Communication Plan

### Internal Communication

#### Notification Channels

| Severity | Primary Channel | Backup Channel | Frequency |
|----------|-----------------|----------------|-----------|
| P1 | Slack + Phone | Email | Every 15 min |
| P2 | Slack | Email | Every 30 min |
| P3 | Slack | - | Hourly |
| P4 | GitHub Issue | - | Daily |

#### Internal Notification Templates

**Initial Notification**
```
:rotating_light: INCIDENT DECLARED

Severity: P[X]
Title: [Brief description]
Time: [YYYY-MM-DD HH:MM UTC]
Impact: [User-facing impact]

Incident Commander: [Name]
Tech Lead: [Name]

Current Status: Investigating

Updates in this thread.
```

**Status Update**
```
INCIDENT UPDATE - [HH:MM UTC]

Status: [Investigating/Identified/Mitigating/Resolved]
Progress: [What has changed since last update]
Actions: [Current activities]
ETA: [If known]

Next update: [Time]
```

**Resolution Notice**
```
:white_check_mark: INCIDENT RESOLVED

Title: [Description]
Duration: [Start] - [End] ([X] minutes)
Impact: [Summary]

Root Cause: [Brief description]
Resolution: [What fixed it]

Post-incident review: [Scheduled date/time]
```

### External Communication

#### When to Communicate Externally

| Scenario | Communicate? | Timing |
|----------|--------------|--------|
| P1 > 30 min | Yes | After initial assessment |
| P2 > 1 hour | Consider | If user-visible impact |
| Data breach | Required | Per legal requirements |
| Scheduled maintenance | Yes | 24+ hours advance |

#### External Communication Templates

**Status Page Update - Investigating**
```
Investigating Issues with [Service]

We are currently investigating reports of [issue description].
Some users may experience [symptom].

Our team is actively working to identify and resolve the issue.
We will provide updates as more information becomes available.

Posted: [YYYY-MM-DD HH:MM UTC]
```

**Status Page Update - Identified**
```
[Service] Issue Identified

We have identified the cause of [issue description].

Our team is implementing a fix. Estimated resolution: [time or TBD].

We apologize for any inconvenience.

Posted: [YYYY-MM-DD HH:MM UTC]
```

**Status Page Update - Resolved**
```
[Service] Issue Resolved

The issue affecting [service/feature] has been resolved.

Duration: [Start] - [End]
Impact: [What was affected]

All services are now operating normally.
We apologize for any inconvenience this may have caused.

Posted: [YYYY-MM-DD HH:MM UTC]
```

---

## Post-Incident Review Process

### Timeline

| Milestone | Deadline |
|-----------|----------|
| Incident resolved | T+0 |
| Incident ticket closed | T+4 hours |
| Initial findings documented | T+24 hours |
| Post-incident review meeting | T+48 hours |
| Final report published | T+72 hours |
| Action items created | T+1 week |
| Action items completed | T+30 days |

### Review Meeting Agenda

**Duration**: 60 minutes

1. **Incident Summary** (5 min)
   - What happened
   - Impact and duration
   - Who was involved

2. **Timeline Walkthrough** (15 min)
   - Chronological review of events
   - Key decision points
   - Response actions taken

3. **Root Cause Analysis** (15 min)
   - 5 Whys analysis
   - Contributing factors
   - Systemic issues identified

4. **What Went Well** (10 min)
   - Effective responses
   - Things that prevented worse outcomes
   - Processes that worked

5. **What Could Be Improved** (10 min)
   - Gaps in response
   - Missing information
   - Process breakdowns

6. **Action Items** (5 min)
   - Prioritized list
   - Owners assigned
   - Deadlines set

### Post-Incident Report Template

```markdown
# Post-Incident Report: [Incident Title]

## Executive Summary

| Field | Value |
|-------|-------|
| Incident ID | INC-YYYY-MM-DD-XXX |
| Date | [Date] |
| Duration | [Start] - [End] ([X] hours [Y] minutes) |
| Severity | P[X] |
| Author | [Name] |
| Status | [Complete/Draft] |

**Summary**: [2-3 sentence summary]

## Impact

- **Users Affected**: [Number/percentage]
- **Features Affected**: [List]
- **Data Impact**: [None/Read access/Write access/Loss]
- **Financial Impact**: [If applicable]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | Incident begins |
| HH:MM | Alert triggered |
| HH:MM | On-call responds |
| HH:MM | Incident declared |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Root Cause Analysis

### What Happened
[Detailed technical explanation]

### Why It Happened (5 Whys)
1. Why? [First level]
2. Why? [Second level]
3. Why? [Third level]
4. Why? [Fourth level]
5. Why? [Root cause]

### Contributing Factors
- [Factor 1]
- [Factor 2]

## Resolution

### Immediate Actions
- [Action 1]
- [Action 2]

### How It Was Resolved
[Technical description of fix]

## Lessons Learned

### What Went Well
- [Item 1]
- [Item 2]

### What Could Be Improved
- [Item 1]
- [Item 2]

### Lucky Breaks
- [Things that could have made it worse]

## Action Items

| Priority | Action | Owner | Due Date | Status |
|----------|--------|-------|----------|--------|
| P1 | [Prevent recurrence] | [Name] | [Date] | Open |
| P2 | [Improve detection] | [Name] | [Date] | Open |
| P3 | [Update documentation] | [Name] | [Date] | Open |

## Appendix

### Related Links
- Incident ticket: [link]
- Sentry issues: [link]
- Deployment logs: [link]
- Communication thread: [link]

### Metrics
- MTTR: [X minutes]
- MTTA: [X minutes]
```

---

## DR Checklist and Quick Reference

### Quick Reference Card

Print this section for quick access during incidents.

```
╔════════════════════════════════════════════════════════════════════╗
║                    DISASTER RECOVERY QUICK REFERENCE                ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  FIRST STEPS (Any Incident):                                       ║
║  1. Verify the problem exists                                       ║
║  2. Determine severity (P1/P2/P3/P4)                               ║
║  3. Notify stakeholders                                             ║
║  4. Create incident ticket                                          ║
║  5. Begin response procedures                                       ║
║                                                                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  STATUS PAGES:                                                      ║
║  • Netlify:   netlifystatus.com                                     ║
║  • Supabase:  status.supabase.com                                   ║
║  • Clerk:     status.clerk.com                                      ║
║  • GitHub:    githubstatus.com                                      ║
║                                                                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  QUICK COMMANDS:                                                    ║
║                                                                     ║
║  Check site:     curl -sI https://mejohnc.org | head -5            ║
║  Netlify status: netlify status                                     ║
║  Recent deploys: netlify deploy:list --limit 5                      ║
║  Rollback:       netlify deploy --prod --deploy-id=<ID>            ║
║                                                                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  RECOVERY TIME OBJECTIVES:                                          ║
║  • Public Site:    4 hours                                          ║
║  • Authentication: 2 hours                                          ║
║  • Database:       4-8 hours                                        ║
║  • Full Recovery:  24 hours                                         ║
║                                                                     ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ESCALATION:                                                        ║
║  15 min:  Secondary on-call                                         ║
║  30 min:  Technical lead                                            ║
║  1 hour:  Incident Commander                                        ║
║  2 hours: External support                                          ║
║                                                                     ║
╚════════════════════════════════════════════════════════════════════╝
```

### Pre-Incident Checklist

Ensure these are always current:

- [ ] Backup procedures documented and tested
- [ ] Recovery procedures documented and tested
- [ ] Contact list updated with current information
- [ ] Credentials documented securely
- [ ] Backup provider account active
- [ ] Monitoring and alerting configured
- [ ] Team trained on DR procedures

### Incident Declaration Checklist

When declaring an incident:

- [ ] Verify the issue is real (not false alarm)
- [ ] Determine severity level
- [ ] Identify initial scope
- [ ] Notify appropriate stakeholders
- [ ] Create incident ticket/channel
- [ ] Begin timeline documentation
- [ ] Assign roles (IC, Tech Lead, etc.)

### During Incident Checklist

Throughout the incident:

- [ ] Provide regular status updates
- [ ] Document all actions taken
- [ ] Preserve evidence before making changes
- [ ] Test fixes before declaring resolved
- [ ] Communicate with stakeholders
- [ ] Track time for RTO reporting

### Post-Incident Checklist

After resolution:

- [ ] Verify all services restored
- [ ] Confirm with stakeholders
- [ ] Close incident channel/ticket
- [ ] Document final timeline
- [ ] Schedule post-incident review
- [ ] Create post-incident report
- [ ] Identify and assign action items
- [ ] Update documentation as needed

---

## Related Documentation

- [backup-strategy.md](./backup-strategy.md) - Backup procedures and retention
- [incident-response.md](../runbooks/incident-response.md) - General incident response
- [incident-playbook.md](../runbooks/incident-playbook.md) - Detailed playbooks
- [database-runbook.md](../runbooks/database-runbook.md) - Database operations
- [deployment-runbook.md](../runbooks/deployment-runbook.md) - Deployment procedures
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Credential management
- [slos-slis.md](../observability/slos-slis.md) - Service level objectives

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-01-20 | 1.0 | Claude Code | Initial document (Issue #76) |

---

*This document should be reviewed quarterly and updated after any significant DR event or infrastructure change.*
