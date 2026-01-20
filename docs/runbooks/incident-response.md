# Incident Response Runbook

This runbook provides procedures for responding to incidents affecting MeJohnC.Org.

---

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Initial Response](#initial-response)
3. [Communication Protocols](#communication-protocols)
4. [Incident Types and Responses](#incident-types-and-responses)
5. [Investigation Procedures](#investigation-procedures)
6. [Resolution and Recovery](#resolution-and-recovery)
7. [Post-Incident Review](#post-incident-review)
8. [Templates](#templates)
9. [Contact and Escalation](#contact-and-escalation)

---

## Incident Classification

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P1 - Critical** | Complete service outage | 15 minutes | Site down, data breach, security exploit |
| **P2 - High** | Major feature broken | 1 hour | Auth not working, database errors |
| **P3 - Medium** | Feature degraded | 4 hours | Slow performance, minor bugs |
| **P4 - Low** | Minor issue | 1 business day | UI glitches, non-critical bugs |

### Severity Decision Tree

```
Is the site completely down?
├── Yes → P1 (Critical)
└── No → Is a core feature broken?
    ├── Yes → Is it affecting all users?
    │   ├── Yes → P2 (High)
    │   └── No → P3 (Medium)
    └── No → P4 (Low)
```

---

## Initial Response

### Step 1: Acknowledge the Incident (< 5 minutes)

1. **Confirm the issue exists**
   ```bash
   # Check if site is responding
   curl -I https://mejohnc.org

   # Check Netlify status
   netlify status
   ```

2. **Classify severity** using the decision tree above

3. **Create incident ticket**
   ```bash
   gh issue create --repo mejohnc-ft/MeJohnC.Org \
     --title "INCIDENT: [Description]" \
     --label "incident,P1-critical" \
     --body "See incident template"
   ```

### Step 2: Assemble Response Team (< 10 minutes)

| Severity | Team Required |
|----------|---------------|
| P1 | On-call + Site Owner + DevOps |
| P2 | On-call + DevOps |
| P3 | On-call |
| P4 | Next available engineer |

### Step 3: Initial Assessment (< 15 minutes)

1. **Gather information**
   - When did it start?
   - What changed recently?
   - How many users affected?
   - What is the user impact?

2. **Check monitoring dashboards**
   - Sentry for errors
   - Netlify for deployment status
   - Supabase for database health

3. **Document findings** in incident ticket

---

## Communication Protocols

### Internal Communication

| Severity | Channel | Frequency |
|----------|---------|-----------|
| P1 | Slack #incidents + calls | Every 15 minutes |
| P2 | Slack #incidents | Every 30 minutes |
| P3 | Slack #mejohnc-dev | Hourly |
| P4 | GitHub issue | As needed |

### Status Update Template

```
**Incident Update - [TIMESTAMP]**
- Status: [Investigating/Identified/Monitoring/Resolved]
- Impact: [Description of user impact]
- Current Actions: [What we're doing]
- Next Update: [Time]
```

### External Communication (if applicable)

For P1/P2 incidents affecting external users:

1. Post status update to status page (if available)
2. Prepare customer communication (if needed)
3. Notify stakeholders

---

## Incident Types and Responses

### Site Down (P1)

#### Symptoms
- 5xx errors
- DNS not resolving
- Connection timeout

#### Response Steps

1. **Check Netlify Status**
   ```bash
   # View Netlify status page
   open https://netlifystatus.com

   # Check deployment status
   netlify status
   ```

2. **Check recent deployments**
   ```bash
   # View recent deploys
   netlify deploy:list --limit 5

   # Rollback if recent deploy caused issue
   netlify deploy --prod --deploy-id=<previous-good-deploy>
   ```

3. **Check DNS**
   ```bash
   nslookup mejohnc.org
   dig mejohnc.org
   ```

4. **Check CDN/Edge**
   - Review Netlify Edge Functions logs
   - Check for rate limiting issues

### Authentication Broken (P2)

#### Symptoms
- Users cannot sign in
- "Unauthorized" errors
- Clerk errors in console

#### Response Steps

1. **Check Clerk Status**
   ```bash
   open https://status.clerk.com
   ```

2. **Verify API Keys**
   - Check `VITE_CLERK_PUBLISHABLE_KEY` in Netlify
   - Ensure keys haven't expired

3. **Check Clerk Dashboard**
   - Review authentication logs
   - Check for rate limiting
   - Verify domain configuration

4. **Test authentication flow**
   ```bash
   # Open site in incognito
   # Attempt sign in
   # Check browser console for errors
   ```

### Database Errors (P2)

#### Symptoms
- Data not loading
- "Failed to fetch" errors
- Supabase connection errors

#### Response Steps

1. **Check Supabase Status**
   ```bash
   open https://status.supabase.com
   ```

2. **Check database health**
   ```sql
   -- Via Supabase SQL Editor
   SELECT count(*) FROM pg_stat_activity;
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. **Verify connection settings**
   - Check `VITE_SUPABASE_URL` in Netlify
   - Check `VITE_SUPABASE_ANON_KEY` validity

4. **Check RLS policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'apps';
   ```

### Performance Degradation (P3)

#### Symptoms
- Slow page loads
- High latency
- Timeout errors

#### Response Steps

1. **Identify bottleneck**
   ```bash
   # Run Lighthouse audit
   npm run lighthouse

   # Check bundle size
   npm run analyze
   ```

2. **Check database performance**
   ```sql
   -- Slow queries
   SELECT * FROM pg_stat_statements
   ORDER BY total_time DESC
   LIMIT 10;
   ```

3. **Check Netlify analytics**
   - Review response times
   - Check for traffic spikes

4. **Check third-party services**
   - Ghost CMS
   - External APIs

### Security Incident (P1)

#### Symptoms
- Suspicious activity
- Unauthorized access
- Data exposure

#### Response Steps

1. **IMMEDIATELY: Contain the threat**
   - Disable compromised accounts
   - Rotate exposed credentials
   - Block suspicious IPs (if possible)

2. **Preserve evidence**
   - Screenshot logs before clearing
   - Export audit logs
   - Document timeline

3. **Assess impact**
   - What data was accessed?
   - How many users affected?
   - What was the attack vector?

4. **Follow security protocol**
   - See [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) for key rotation
   - Notify stakeholders
   - Consider legal/compliance requirements

---

## Investigation Procedures

### Log Analysis

#### Netlify Function Logs
```bash
# View recent logs
netlify logs:function rate-limit

# Stream logs in real-time
netlify logs --live
```

#### Sentry Error Tracking
1. Go to Sentry dashboard
2. Filter by: Date range, Error type, User
3. Review stack traces and breadcrumbs

#### Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to: Logs > API / Postgres / Auth
3. Filter by timestamp and error level

#### Browser Console
1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

### Common Investigation Queries

```bash
# Check deployment history
gh run list --repo mejohnc-ft/MeJohnC.Org --limit 20

# Check recent commits
git log --oneline -20

# Check recent PRs
gh pr list --state merged --limit 10
```

---

## Resolution and Recovery

### Resolution Checklist

- [ ] Root cause identified
- [ ] Fix implemented and deployed
- [ ] Fix verified in production
- [ ] Monitoring shows normal metrics
- [ ] All stakeholders notified

### Common Resolutions

| Issue | Resolution |
|-------|------------|
| Bad deployment | Rollback to previous version |
| Expired credentials | Rotate keys, update env vars |
| Database issue | Restore from backup or fix data |
| Third-party outage | Wait for service recovery |
| Configuration error | Fix and redeploy |

### Rollback Procedure

See [deployment-runbook.md](./deployment-runbook.md#rollback-procedures) for detailed rollback steps.

Quick rollback:
```bash
# Via Netlify CLI
netlify deploy:list
netlify deploy --prod --deploy-id=<previous-good-deploy>
```

### Recovery Verification

1. **Functional verification**
   - [ ] Site loads
   - [ ] Authentication works
   - [ ] Data displays correctly
   - [ ] Admin functions work

2. **Performance verification**
   - [ ] Response times normal
   - [ ] No elevated error rates
   - [ ] Monitoring metrics stable

3. **User verification**
   - [ ] Sample users can access site
   - [ ] No new complaints

---

## Post-Incident Review

### Conduct Review Meeting

**When**: Within 48 hours of incident resolution

**Attendees**: Incident responders, stakeholders, relevant team members

**Agenda**:
1. Incident timeline review
2. What went well
3. What could be improved
4. Action items

### Post-Incident Report Template

```markdown
# Incident Report: [Title]

## Summary
- **Date**: [Date]
- **Duration**: [Start time] - [End time]
- **Severity**: P[X]
- **Impact**: [User impact description]

## Timeline
- [HH:MM] - Incident detected
- [HH:MM] - Response team assembled
- [HH:MM] - Root cause identified
- [HH:MM] - Fix deployed
- [HH:MM] - Incident resolved

## Root Cause
[Detailed description of what caused the incident]

## Resolution
[What was done to resolve the incident]

## Lessons Learned
### What went well
- [Item 1]
- [Item 2]

### What could be improved
- [Item 1]
- [Item 2]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Action 1] | [Name] | [Date] |
| [Action 2] | [Name] | [Date] |
```

### Follow-Up Actions

1. [ ] Create post-incident report
2. [ ] Create follow-up tickets for improvements
3. [ ] Update runbooks if needed
4. [ ] Share learnings with team
5. [ ] Close incident ticket

---

## Templates

### Incident Ticket Template

```markdown
## Incident Description
[Brief description of the incident]

## Impact
- **Severity**: P[X]
- **Users Affected**: [Number/percentage]
- **Features Affected**: [List]

## Timeline
- **Detected**: [Time]
- **Acknowledged**: [Time]
- **Resolved**: [Time]

## Current Status
[Investigating/Identified/Monitoring/Resolved]

## Actions Taken
- [ ] [Action 1]
- [ ] [Action 2]

## Root Cause
[TBD - to be filled in during/after investigation]

## Related Links
- Sentry: [link]
- Deployment: [link]
- PR: [link]
```

### Communication Template

```markdown
**[INCIDENT] [Title] - [Status]**

**Impact**: [Brief description of user impact]

**Status**: We are [investigating/working on/monitoring] the issue.

**Next Update**: [Time]

**Updates**:
- [Time]: [Update]
```

---

## Contact and Escalation

### On-Call Rotation

| Week | Primary | Secondary |
|------|---------|-----------|
| 1-2 | [NAME] | [NAME] |
| 3-4 | [NAME] | [NAME] |

### Escalation Matrix

| Severity | First Response | 15 min | 30 min | 1 hour |
|----------|---------------|--------|--------|--------|
| P1 | On-call | DevOps Lead | Site Owner | External Support |
| P2 | On-call | DevOps Lead | Site Owner | - |
| P3 | On-call | - | - | - |
| P4 | Next available | - | - | - |

### Primary Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Site Owner | [NAME] | [EMAIL/PHONE] | [HOURS] |
| DevOps Lead | [NAME] | [EMAIL/PHONE] | [HOURS] |
| On-Call Primary | [NAME] | [EMAIL/PHONE] | As scheduled |
| On-Call Secondary | [NAME] | [EMAIL/PHONE] | As scheduled |

### External Support Contacts

| Service | Support Channel | Response Time |
|---------|-----------------|---------------|
| Netlify | support.netlify.com | Varies by plan |
| Supabase | supabase.com/support | Varies by plan |
| Clerk | clerk.com/support | Varies by plan |
| Sentry | sentry.io/support | Varies by plan |

### Emergency Procedures

For P1 incidents outside business hours:

1. Contact on-call via phone (not just Slack)
2. If no response in 15 minutes, contact secondary
3. If no response in 30 minutes, contact site owner
4. Document all contact attempts in incident ticket

---

## Related Documentation

- [deployment-runbook.md](./deployment-runbook.md) - Rollback procedures
- [database-runbook.md](./database-runbook.md) - Database recovery
- [troubleshooting.md](./troubleshooting.md) - Common issues
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Credential rotation
