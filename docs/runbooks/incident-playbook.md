# Incident Response Playbook

Operational playbook for responding to incidents affecting MeJohnC.Org. This document provides step-by-step procedures for specific incident scenarios, communication templates, and escalation guidance.

**Related**: See [incident-response.md](./incident-response.md) for general incident response framework and classification.

---

## Table of Contents

1. [Severity Definitions](#severity-definitions)
2. [Detection and Alerting](#detection-and-alerting)
3. [On-Call and Escalation](#on-call-and-escalation)
4. [Communication Templates](#communication-templates)
5. [Incident Playbooks](#incident-playbooks)
   - [Website Down / Netlify Outage](#playbook-website-down--netlify-outage)
   - [Database Unavailable / Supabase Issues](#playbook-database-unavailable--supabase-issues)
   - [Authentication Failures / Clerk Issues](#playbook-authentication-failures--clerk-issues)
   - [High Error Rates](#playbook-high-error-rates)
   - [Security Incidents](#playbook-security-incidents)
6. [Post-Incident Review Process](#post-incident-review-process)
7. [Contact List](#contact-list)

---

## Severity Definitions

### P1 - Critical (Response: 15 minutes)

**Definition**: Complete service outage or data breach affecting all users.

| Criteria | Examples |
|----------|----------|
| Site completely unreachable | DNS failure, Netlify down, total outage |
| Active security breach | Data exfiltration, unauthorized admin access |
| Data loss or corruption | Database failure, backup corruption |
| All users unable to authenticate | Clerk complete outage |

**Required Actions**:
- Immediate page to on-call responder
- War room established within 15 minutes
- Status page updated within 30 minutes
- Updates every 15 minutes until resolved

### P2 - High (Response: 1 hour)

**Definition**: Major feature broken affecting significant user population.

| Criteria | Examples |
|----------|----------|
| Core feature broken for all users | Portfolio not loading, blog broken |
| Authentication degraded | Intermittent login failures |
| Database performance severely degraded | Queries timing out |
| Admin dashboard inaccessible | Cannot manage content |

**Required Actions**:
- Alert on-call responder
- Incident ticket created within 30 minutes
- Updates every 30 minutes until resolved

### P3 - Medium (Response: 4 hours)

**Definition**: Feature degraded or partially broken.

| Criteria | Examples |
|----------|----------|
| Non-critical feature broken | Social links not loading |
| Performance degradation | Slow page loads (>5s) |
| Intermittent errors | Occasional API failures |
| Single component failure | One page broken |

**Required Actions**:
- Document in incident ticket
- Updates hourly during business hours

### P4 - Low (Response: 1 business day)

**Definition**: Minor issue with minimal user impact.

| Criteria | Examples |
|----------|----------|
| UI/UX issues | Styling glitch, alignment issue |
| Non-blocking bugs | Minor feature not working as expected |
| Development environment issues | Local build failures |
| Documentation gaps | Missing or outdated docs |

**Required Actions**:
- Create GitHub issue
- Address during normal business hours

---

## Detection and Alerting

### Monitoring Sources

| Source | What It Monitors | Alert Channel | Response |
|--------|-----------------|---------------|----------|
| Sentry | Application errors, exceptions | Email, Slack | Review within 1 hour |
| Netlify Analytics | Deployment status, traffic | Dashboard | Check daily |
| Supabase Dashboard | Database health, connections | Dashboard | Check daily |
| Uptime Monitor | Site availability | Email, SMS | Immediate for P1 |
| GitHub Actions | CI/CD pipeline status | Email, PR comments | Check on failures |

### Alert Thresholds

```
Error Rate:
  - Warning: > 1% errors in 5 minutes
  - Critical: > 5% errors in 5 minutes

Response Time:
  - Warning: p95 > 3s
  - Critical: p95 > 10s

Availability:
  - Warning: < 99.5% in 1 hour
  - Critical: < 99% in 15 minutes

Database:
  - Warning: Connection pool > 80%
  - Critical: Connection pool > 95%
```

### Manual Health Checks

```bash
# Quick site check
curl -sI https://mejohnc.org | head -5

# Check response time
curl -o /dev/null -s -w 'Total: %{time_total}s\n' https://mejohnc.org

# Check Netlify status
netlify status

# Check GitHub Actions
gh run list --repo mejohnc-ft/MeJohnC.Org --limit 5
```

### Status Pages to Monitor

| Service | Status Page | Check Frequency |
|---------|-------------|-----------------|
| Netlify | https://netlifystatus.com | During incidents |
| Supabase | https://status.supabase.com | During incidents |
| Clerk | https://status.clerk.com | During incidents |
| GitHub | https://githubstatus.com | During incidents |

---

## On-Call and Escalation

### On-Call Rotation

| Week | Primary On-Call | Secondary On-Call | Notes |
|------|-----------------|-------------------|-------|
| 1-2 | [NAME - PRIMARY] | [NAME - SECONDARY] | [PHONE/SLACK] |
| 3-4 | [NAME - PRIMARY] | [NAME - SECONDARY] | [PHONE/SLACK] |

**On-Call Responsibilities**:
- Respond to P1/P2 alerts within SLA
- Acknowledge alerts within 5 minutes
- Coordinate incident response
- Provide status updates
- Document incident timeline

### Escalation Matrix

```
Time Elapsed    P1 Action                      P2 Action
-----------     ---------                      ---------
0 min           Page primary on-call           Alert primary on-call
15 min          Page secondary on-call         -
30 min          Page DevOps lead               Page secondary on-call
1 hour          Page site owner                Page DevOps lead
2 hours         Consider external support      -
```

### Escalation Procedure

1. **Initial Alert**
   - On-call receives alert via configured channel
   - Acknowledge within 5 minutes (update incident status)

2. **No Response from Primary (15 min)**
   ```
   Contact secondary on-call:
   - Phone call (not just text/Slack)
   - If no answer, leave voicemail and text
   - Update incident ticket with escalation
   ```

3. **No Response from Secondary (30 min)**
   ```
   Contact DevOps lead:
   - Phone call
   - Email with URGENT in subject
   - Update incident ticket
   ```

4. **No Response from DevOps Lead (1 hour)**
   ```
   Contact site owner:
   - Phone call
   - Consider triggering emergency contact tree
   ```

---

## Communication Templates

### Internal Templates

#### Incident Declaration (Slack/Teams)

```
:rotating_light: **INCIDENT DECLARED** :rotating_light:

**Severity**: P[X]
**Title**: [Brief description]
**Time Detected**: [YYYY-MM-DD HH:MM UTC]
**Impact**: [What users are experiencing]
**Incident Commander**: [Name]

**Current Status**: Investigating

**Thread**: Please use this thread for all incident communications.

Next update in 15 minutes.
```

#### Incident Update

```
**INCIDENT UPDATE** - [TIMESTAMP UTC]

**Status**: [Investigating | Identified | Monitoring | Resolved]
**Severity**: P[X] [unchanged | escalated from PY | deescalated from PY]

**Update**:
[What we know now that we didn't know before]

**Actions Taken**:
- [Action 1]
- [Action 2]

**Next Steps**:
- [Next action 1]
- [Next action 2]

**Next Update**: [Time] or when status changes
```

#### Incident Resolution

```
:white_check_mark: **INCIDENT RESOLVED** :white_check_mark:

**Title**: [Brief description]
**Severity**: P[X]
**Duration**: [Start time] - [End time] ([X] hours [Y] minutes)
**Impact**: [Summary of user impact]

**Root Cause**: [Brief description]
**Resolution**: [What fixed it]

**Follow-up Actions**:
- [ ] Post-incident review scheduled for [date]
- [ ] Create follow-up tickets for improvements

Post-incident report will be shared within 48 hours.
```

### External Templates

#### Status Page Update - Investigating

```
**Investigating [Service] Issues**

We are currently investigating reports of [issue description].
Users may experience [specific symptoms].

Our team is actively working to identify and resolve the issue.

We will provide updates as more information becomes available.

Posted: [YYYY-MM-DD HH:MM UTC]
```

#### Status Page Update - Identified

```
**[Service] Issue Identified**

We have identified the cause of [issue description].
[Brief non-technical explanation of the issue].

Our team is implementing a fix. [Estimated time if known].

We apologize for any inconvenience and appreciate your patience.

Posted: [YYYY-MM-DD HH:MM UTC]
```

#### Status Page Update - Resolved

```
**[Service] Issue Resolved**

The issue affecting [service/feature] has been resolved.

**Duration**: [Start] - [End]
**Impact**: [What was affected]
**Resolution**: [Brief explanation]

All services are now operating normally.
We apologize for any inconvenience this may have caused.

Posted: [YYYY-MM-DD HH:MM UTC]
```

#### Customer Email Template (Major Incidents)

```
Subject: [RESOLVED/UPDATE] MeJohnC.Org Service Incident - [Date]

Dear User,

We wanted to inform you about a service incident that occurred on [date].

**What Happened**:
[Clear, non-technical explanation]

**Impact**:
[What users may have experienced]

**Resolution**:
[What was done to fix it]

**Prevention**:
[What we're doing to prevent recurrence]

We sincerely apologize for any inconvenience this may have caused.
If you have any questions, please don't hesitate to reach out.

Best regards,
The MeJohnC.Org Team
```

---

## Incident Playbooks

### PLAYBOOK: Website Down / Netlify Outage

**Symptoms**:
- Site returns 5xx errors
- Connection timeout
- DNS not resolving
- "Site not found" or Netlify error page

**Severity**: P1

#### Step 1: Verify the Outage (0-5 minutes)

```bash
# Check from multiple sources
curl -sI https://mejohnc.org | head -5

# Check DNS resolution
nslookup mejohnc.org
# or
dig mejohnc.org

# Check from external monitor (use phone data or different network)
# Visit: https://downforeveryoneorjustme.com/mejohnc.org
```

#### Step 2: Check Netlify Status (5-10 minutes)

1. **Visit Netlify Status Page**: https://netlifystatus.com

2. **If Netlify is reporting issues**:
   - Document in incident ticket
   - Subscribe to updates
   - Prepare customer communication
   - Monitor until resolved

3. **If Netlify shows no issues, continue to Step 3**

#### Step 3: Check Netlify Dashboard

```bash
# Check deployment status
netlify status

# List recent deployments
netlify deploy:list --limit 5
```

1. **Navigate to Netlify Dashboard** > Site > Deploys
2. **Check for failed deploys**
3. **Check for configuration changes**
4. **Review deploy logs for errors**

#### Step 4: Attempt Rollback

If recent deployment caused the issue:

```bash
# List deployments with IDs
netlify deploy:list

# Rollback to previous working deployment
netlify deploy --prod --deploy-id=<PREVIOUS_DEPLOY_ID>

# Verify site is back up
curl -sI https://mejohnc.org
```

#### Step 5: Check DNS Configuration

```bash
# Verify DNS records
dig mejohnc.org A
dig mejohnc.org CNAME

# Check for DNS propagation issues
# Visit: https://dnschecker.org/#A/mejohnc.org
```

1. **Verify DNS records match Netlify configuration**
2. **Check for unauthorized DNS changes**
3. **If DNS issue, contact domain registrar**

#### Step 6: Check CDN/Edge Issues

1. **Review Netlify Edge Function logs**:
   ```bash
   netlify logs:function rate-limit --limit 50
   ```

2. **Check for geographic issues** (may only affect certain regions)

3. **Check for rate limiting or abuse blocking**

#### Step 7: Escalate if Unresolved

- Contact Netlify support if issue persists > 30 minutes
- Create support ticket with:
  - Site name
  - Issue description
  - Timeline of events
  - Steps already taken
  - Error messages/logs

**Recovery Verification**:
- [ ] Site loads from multiple locations
- [ ] All pages accessible
- [ ] No console errors
- [ ] Response time < 3s
- [ ] SSL certificate valid

---

### PLAYBOOK: Database Unavailable / Supabase Issues

**Symptoms**:
- "Failed to fetch" errors
- Data not loading
- Forms not submitting
- Supabase connection errors in console

**Severity**: P2 (P1 if all data access is blocked)

#### Step 1: Verify Database Connectivity (0-5 minutes)

```bash
# Check Supabase status
open https://status.supabase.com

# Test API endpoint
curl -I "$VITE_SUPABASE_URL/rest/v1/"
```

#### Step 2: Check Supabase Dashboard

1. **Navigate to Supabase Dashboard** > Project
2. **Check Database tab** > Health metrics
3. **Check API tab** > Request logs
4. **Check Auth tab** > If auth-related errors

#### Step 3: Verify Environment Variables

```bash
# Check variables are set in Netlify
netlify env:list

# Verify format (should not have trailing slashes or quotes)
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY | head -c 50
```

#### Step 4: Check Database Health

In Supabase SQL Editor:

```sql
-- Check connection count
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
  AND state != 'idle';

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));
```

#### Step 5: Check for Resource Limits

1. **Check if connection pool is exhausted**
   - Dashboard > Database > Connection pool usage

2. **Check if storage limit reached**
   - Dashboard > Database > Storage used

3. **Check if API rate limits hit**
   - Dashboard > API > Logs (look for 429 responses)

#### Step 6: Resolve Common Issues

**Connection Pool Exhausted**:
```sql
-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '1 hour';
```

**Long-Running Query Blocking**:
```sql
-- Identify blocking query
SELECT * FROM pg_locks WHERE NOT granted;

-- Kill blocking query (use with caution)
SELECT pg_cancel_backend(<pid>);
```

**RLS Policy Issue**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'affected_table';

-- Temporarily disable RLS to test (development only!)
-- ALTER TABLE affected_table DISABLE ROW LEVEL SECURITY;
```

#### Step 7: Escalate if Unresolved

- Contact Supabase support for platform issues
- Check Supabase Discord for known issues
- Consider enabling maintenance mode if extended outage

**Recovery Verification**:
- [ ] Database queries returning data
- [ ] No connection errors in console
- [ ] CRUD operations working
- [ ] Real-time subscriptions active (if used)

---

### PLAYBOOK: Authentication Failures / Clerk Issues

**Symptoms**:
- Users cannot sign in
- "Unauthorized" or 401 errors
- Sign-in button not responding
- Redirect loops during auth
- Session not persisting

**Severity**: P2

#### Step 1: Check Clerk Status (0-5 minutes)

1. **Visit Clerk Status Page**: https://status.clerk.com
2. **If Clerk is reporting issues**:
   - Document and monitor
   - Nothing can be done on our end
   - Prepare communication for users

#### Step 2: Verify Clerk Configuration

```bash
# Check environment variable is set
netlify env:list | grep CLERK

# Verify key format (should start with pk_live_ or pk_test_)
echo $VITE_CLERK_PUBLISHABLE_KEY | head -c 20
```

#### Step 3: Check Clerk Dashboard

1. **Navigate to Clerk Dashboard** > Application

2. **Check "Users" tab**:
   - Can you see recent sign-in attempts?
   - Are there blocked users?

3. **Check "Sessions" tab**:
   - Are sessions being created?
   - Any anomalies?

4. **Check "API Keys"**:
   - Is the publishable key active?
   - Has it been rotated recently?

#### Step 4: Verify Domain Configuration

1. **Clerk Dashboard** > Settings > Domains
2. Verify `mejohnc.org` is listed as allowed domain
3. For development: Verify `localhost:5173` is allowed

#### Step 5: Test Authentication Flow

1. Open incognito/private browser window
2. Navigate to site
3. Attempt sign in
4. Check browser console for errors
5. Check Network tab for failed requests

```javascript
// In browser console, check Clerk is loaded
window.Clerk

// Check current auth state
window.Clerk.user
window.Clerk.session
```

#### Step 6: Common Fixes

**Expired/Invalid API Key**:
1. Generate new publishable key in Clerk Dashboard
2. Update in Netlify environment variables
3. Trigger redeploy

**Domain Not Allowed**:
1. Add domain to Clerk Dashboard > Domains
2. Wait 5 minutes for propagation

**Session Cookie Issues**:
1. Check cookie settings in Clerk
2. Verify SameSite/Secure cookie settings

**Rate Limiting**:
1. Check Clerk Dashboard for rate limit warnings
2. Wait for rate limit to reset (usually 1 minute)

#### Step 7: Escalate if Unresolved

- Contact Clerk support
- Check Clerk Discord community
- Review recent Clerk updates/changelog

**Recovery Verification**:
- [ ] Sign in works for new sessions
- [ ] Sign out works properly
- [ ] Protected routes accessible after auth
- [ ] Admin access working for admin users

---

### PLAYBOOK: High Error Rates

**Symptoms**:
- Sentry alerts for elevated error rates
- User reports of errors
- Console full of errors
- Features intermittently failing

**Severity**: P2-P3 depending on impact

#### Step 1: Quantify the Problem (0-10 minutes)

1. **Check Sentry Dashboard**:
   - https://sentry.io > Project > Issues
   - Filter by time: Last hour
   - Sort by frequency

2. **Identify top errors**:
   - What error types?
   - What pages/components?
   - How many users affected?

3. **Calculate error rate**:
   ```
   Error Rate = (Errors in last hour) / (Total requests in last hour) * 100
   ```

#### Step 2: Categorize Errors

| Type | Action |
|------|--------|
| Network/API errors | Check backend services |
| JavaScript exceptions | Check recent code changes |
| 404 errors | Check for missing resources |
| Auth errors | Check Clerk status |
| Database errors | Check Supabase status |

#### Step 3: Identify Recent Changes

```bash
# Recent deployments
netlify deploy:list --limit 10

# Recent commits
git log --oneline -20

# Recent PRs
gh pr list --state merged --limit 10
```

#### Step 4: Root Cause Analysis

**For JavaScript Errors**:
1. Review Sentry stack traces
2. Identify affected component
3. Check recent changes to that file
4. Reproduce locally if possible

**For API Errors**:
1. Check API endpoint status
2. Review request/response in Sentry breadcrumbs
3. Check backend service health

**For Third-Party Errors**:
1. Check service status pages
2. Review API response codes
3. Check for rate limiting

#### Step 5: Implement Fix

**Option A: Rollback (if recent deployment caused issue)**
```bash
netlify deploy --prod --deploy-id=<PREVIOUS_DEPLOY_ID>
```

**Option B: Hotfix**
```bash
# Create hotfix branch
git checkout -b hotfix/error-description
# Make minimal fix
# Create expedited PR
gh pr create --title "HOTFIX: Fix error description" --label urgent
```

**Option C: Feature Flag (if available)**
```javascript
// Disable problematic feature temporarily
if (!featureFlags.problematicFeature) {
  return <FallbackComponent />;
}
```

#### Step 6: Monitor Resolution

1. Watch Sentry error rate decrease
2. Verify fix didn't introduce new errors
3. Check user reports have stopped

**Recovery Verification**:
- [ ] Error rate back to baseline (< 0.1%)
- [ ] No new error types appearing
- [ ] Affected features working correctly
- [ ] No user complaints

---

### PLAYBOOK: Security Incidents

**Types Covered**:
- Data breach
- Unauthorized access
- Credential compromise
- Suspicious activity
- Account takeover

**Severity**: P1 (always)

#### IMMEDIATE ACTIONS (0-15 minutes)

**DO NOT DELAY THESE STEPS**

1. **Contain the Threat**
   ```bash
   # If compromised admin account, disable immediately
   # In Supabase SQL Editor:
   DELETE FROM admin_users WHERE email = 'compromised@email.com';
   ```

2. **Rotate Exposed Credentials**
   ```bash
   # If API keys exposed, rotate immediately:
   # - Supabase: Dashboard > Settings > API > Generate new keys
   # - Clerk: Dashboard > API Keys > Rotate
   # Update Netlify environment variables
   netlify env:set VITE_SUPABASE_ANON_KEY "new_key"
   ```

3. **Block Malicious Access**
   - IP blocking (if attack source identified)
   - Disable compromised accounts
   - Revoke active sessions

4. **Preserve Evidence**
   ```bash
   # Export logs before they rotate
   # Screenshot Supabase logs
   # Export Clerk audit logs
   # Document everything with timestamps
   ```

#### INVESTIGATION (15-60 minutes)

#### Step 1: Establish Timeline

Document with timestamps:
- When did suspicious activity start?
- When was it detected?
- What actions have been taken?

#### Step 2: Determine Scope

```sql
-- Check for unauthorized data access
SELECT * FROM audit_logs
WHERE created_at > 'INCIDENT_START_TIME'
ORDER BY created_at DESC;

-- Check for unusual queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%admin%' OR query LIKE '%password%'
ORDER BY last_call DESC
LIMIT 50;

-- Check admin access
SELECT * FROM admin_users;
```

#### Step 3: Identify Attack Vector

| Vector | Check |
|--------|-------|
| Credential stuffing | Review Clerk auth logs for failed attempts |
| API key exposure | Check GitHub for exposed secrets |
| XSS/Injection | Review Sentry for unusual errors |
| Session hijacking | Check for sessions from unusual IPs |

#### Step 4: Assess Data Impact

- What data was accessed?
- How many users affected?
- Was data exfiltrated?
- What was the potential exposure?

#### REMEDIATION

#### Step 5: Close Attack Vector

Based on attack type:

**Credential Compromise**:
1. Force password reset for affected accounts
2. Rotate all API keys and secrets
3. Review and update access policies

**Code Vulnerability**:
1. Deploy patch immediately
2. Review similar code patterns
3. Add security tests

**Configuration Issue**:
1. Fix misconfiguration
2. Audit all related settings
3. Add configuration monitoring

#### Step 6: Verify Remediation

```bash
# Redeploy with new credentials
netlify build && netlify deploy --prod

# Verify new credentials working
curl -H "Authorization: Bearer $NEW_ANON_KEY" \
  "$VITE_SUPABASE_URL/rest/v1/apps?limit=1"
```

#### NOTIFICATION

#### Step 7: Internal Notification

Notify within 1 hour:
- Site owner
- DevOps lead
- Legal/compliance (if applicable)

#### Step 8: External Notification (if required)

If user data was compromised:
- Legal requirements (GDPR: 72 hours)
- Prepare user notification
- Consider credit monitoring (for sensitive data)

#### Step 9: Post-Incident

1. Complete detailed incident report
2. Schedule security review
3. Update security controls
4. Consider external security audit

**Recovery Verification**:
- [ ] Attack vector closed
- [ ] All credentials rotated
- [ ] No ongoing suspicious activity
- [ ] Monitoring enhanced
- [ ] Stakeholders notified

---

## Post-Incident Review Process

### Timeline

| Task | Deadline |
|------|----------|
| Incident resolved | T+0 |
| Incident ticket closed | T+4 hours |
| Draft incident report | T+24 hours |
| Post-incident meeting | T+48 hours |
| Final report published | T+72 hours |
| Follow-up actions created | T+1 week |
| Action items completed | T+30 days |

### Post-Incident Meeting Agenda

**Duration**: 60 minutes

1. **Timeline Review** (15 min)
   - Walk through incident chronologically
   - Identify key decision points

2. **What Went Well** (10 min)
   - Effective responses
   - Good communication
   - Things to continue doing

3. **What Could Be Improved** (15 min)
   - Delays in response
   - Missing information
   - Process gaps

4. **Root Cause Analysis** (10 min)
   - Use 5 Whys technique
   - Identify systemic issues

5. **Action Items** (10 min)
   - Assign owners
   - Set deadlines
   - Prioritize by impact

### Post-Incident Report Template

```markdown
# Post-Incident Report: [Incident Title]

## Executive Summary

**Incident ID**: [INC-YYYY-MM-DD-XXX]
**Date**: [Date]
**Duration**: [Start] - [End] ([X] hours [Y] minutes)
**Severity**: P[X]
**Author**: [Name]
**Status**: [Complete/Draft]

**Summary**: [2-3 sentence summary of incident and impact]

## Impact

- **Users Affected**: [Number or percentage]
- **Features Affected**: [List]
- **Data Impact**: [None/Read access/Write access/Loss]
- **Revenue Impact**: [If applicable]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | [Incident begins] |
| HH:MM | [Alert triggered] |
| HH:MM | [On-call responds] |
| HH:MM | [Root cause identified] |
| HH:MM | [Fix deployed] |
| HH:MM | [Incident resolved] |

## Root Cause

### What happened
[Detailed technical explanation]

### Why it happened
[Use 5 Whys analysis]
1. Why? [First level]
2. Why? [Second level]
3. Why? [Third level]
4. Why? [Fourth level]
5. Why? [Root cause]

### Contributing factors
- [Factor 1]
- [Factor 2]

## Resolution

### Immediate actions taken
- [Action 1]
- [Action 2]

### How the issue was resolved
[Technical description of fix]

## Lessons Learned

### What went well
- [Item 1]
- [Item 2]

### What could be improved
- [Item 1]
- [Item 2]

### Lucky breaks
- [Things that could have made it worse but didn't]

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
- Deployment: [link]
- Slack thread: [link]

### Metrics
- MTTR (Mean Time To Resolve): [X minutes]
- MTTA (Mean Time To Acknowledge): [X minutes]
- MTTI (Mean Time To Identify): [X minutes]
```

### Follow-Up Process

1. **Create Action Items**
   ```bash
   gh issue create --repo mejohnc-ft/MeJohnC.Org \
     --title "POST-INCIDENT: [Action description]" \
     --label "post-incident" \
     --body "From incident INC-YYYY-MM-DD-XXX"
   ```

2. **Track Completion**
   - Review action items weekly
   - Escalate overdue items
   - Close items with verification

3. **Update Documentation**
   - Update runbooks with lessons learned
   - Add new playbooks if needed
   - Update monitoring/alerting

---

## Contact List

### Primary Contacts

| Role | Name | Email | Phone | Slack | Availability |
|------|------|-------|-------|-------|--------------|
| Site Owner | [NAME] | [EMAIL] | [PHONE] | @[handle] | [HOURS] |
| DevOps Lead | [NAME] | [EMAIL] | [PHONE] | @[handle] | [HOURS] |
| Backend Lead | [NAME] | [EMAIL] | [PHONE] | @[handle] | [HOURS] |
| Frontend Lead | [NAME] | [EMAIL] | [PHONE] | @[handle] | [HOURS] |

### On-Call Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Primary On-Call | [NAME] | [PHONE] | @[handle] |
| Secondary On-Call | [NAME] | [PHONE] | @[handle] |

### External Support

| Service | Support URL | Priority Support |
|---------|-------------|------------------|
| Netlify | https://support.netlify.com | [Ticket priority info] |
| Supabase | https://supabase.com/support | [Support tier] |
| Clerk | https://clerk.com/support | [Support tier] |
| GitHub | https://support.github.com | [Support tier] |

### Escalation Contacts (Emergency Only)

| Situation | Contact | Method |
|-----------|---------|--------|
| P1 > 2 hours unresolved | [NAME] | Phone |
| Security breach | [NAME] | Phone + Email |
| Legal/compliance issue | [NAME] | Phone |
| Media/PR issue | [NAME] | Phone |

---

## Related Documentation

- [incident-response.md](./incident-response.md) - Incident classification and general procedures
- [deployment-runbook.md](./deployment-runbook.md) - Rollback and deployment procedures
- [database-runbook.md](./database-runbook.md) - Database recovery procedures
- [troubleshooting.md](./troubleshooting.md) - Common issue resolution
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Credential rotation procedures

---

*Last Updated: 2025-01-20*
*Version: 1.0*
