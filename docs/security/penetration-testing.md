# Penetration Testing and Security Audit Guide

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Document Owner:** Security Lead / Site Administrator
**Related Issue:** #61
**Related Documents:** [Audit Logging](./audit-logging.md), [GDPR Data Handling](../compliance/gdpr-data-handling.md)

---

## Table of Contents

1. [Penetration Testing Overview](#penetration-testing-overview)
2. [Scope Definition](#scope-definition)
3. [Testing Methodologies](#testing-methodologies)
4. [Test Categories](#test-categories)
5. [DIY Security Testing](#diy-security-testing)
6. [Professional Pentest Engagement](#professional-pentest-engagement)
7. [Vulnerability Remediation Process](#vulnerability-remediation-process)
8. [Retest Procedures](#retest-procedures)
9. [Security Audit Schedule](#security-audit-schedule)
10. [Bug Bounty Considerations](#bug-bounty-considerations)

---

## Penetration Testing Overview

### Purpose

Penetration testing (pentesting) is a systematic process of probing the MeJohnC.Org application for security vulnerabilities by simulating attacks that a malicious actor might use. The goal is to identify weaknesses before they can be exploited in the wild.

### Objectives

- **Identify Vulnerabilities**: Discover security weaknesses in code, configuration, and architecture
- **Validate Controls**: Verify that existing security controls work as intended
- **Assess Risk**: Understand the potential impact of successful attacks
- **Compliance**: Meet security testing requirements for compliance frameworks
- **Continuous Improvement**: Provide actionable findings to strengthen security posture

### Testing Types

| Type | Description | Frequency |
|------|-------------|-----------|
| **Black Box** | Tester has no prior knowledge of the system | Annual |
| **Gray Box** | Tester has partial knowledge (e.g., API docs, user credentials) | Semi-annual |
| **White Box** | Tester has full access to source code and architecture | Quarterly (internal) |

### Current Architecture Summary

MeJohnC.Org has the following security-relevant components:

- **Frontend**: React 18 SPA with Vite (client-side)
- **Authentication**: Clerk (third-party OAuth/JWT)
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Hosting**: Netlify (static hosting + edge functions)
- **Security Controls**:
  - CSRF protection (`src/lib/csrf.ts`)
  - RBAC system (`src/lib/rbac.ts`)
  - Input validation with Zod (`src/lib/validation.ts`)
  - Audit logging (`src/lib/audit.ts`)

---

## Scope Definition

### In-Scope Systems

The following systems and components are within the scope of penetration testing:

#### Primary Targets

| Component | URL/Location | Test Types |
|-----------|--------------|------------|
| **Public Website** | `https://mejohnc.org` | Web application testing |
| **Admin Dashboard** | `https://mejohnc.org/admin/*` | Authentication, authorization, IDOR |
| **API Endpoints** | Supabase RLS policies | API security, injection, access control |
| **Edge Functions** | `netlify/functions/*` | Input validation, rate limiting |
| **Static Assets** | `/assets/*`, `/images/*` | Information disclosure |

#### Code Repositories

| Repository | Testing Focus |
|------------|---------------|
| `MeJohnC.Org` (main) | Frontend security, client-side vulnerabilities |
| `site-manager-agent` | AI agent security, prompt injection |

#### Specific Testing Areas

1. **Authentication Flows**
   - Login/logout functionality
   - Session management
   - JWT token handling
   - MFA implementation (when enabled)

2. **Authorization Controls**
   - RBAC enforcement (`admin`, `editor`, `author`, `viewer`, `guest`)
   - Route protection
   - API permission checks
   - Supabase RLS policy effectiveness

3. **Data Handling**
   - Input validation on all forms
   - Output encoding
   - File upload handling
   - Data export functionality

4. **Client-Side Security**
   - XSS prevention
   - CSRF protection
   - Sensitive data in localStorage/sessionStorage
   - JavaScript security

### Out-of-Scope (Third Parties)

The following third-party services are **OUT OF SCOPE** and must not be tested without explicit written authorization from the service provider:

#### Clerk (Authentication Provider)

| Component | Reason |
|-----------|--------|
| Clerk dashboard | Third-party infrastructure |
| Clerk API endpoints (`api.clerk.dev`) | Managed service |
| Clerk OAuth flows (Google, GitHub, etc.) | Third-party OAuth providers |
| Clerk user management | Covered by Clerk's security program |

**Contact for Clerk Security**: security@clerk.dev

#### Supabase (Database Provider)

| Component | Reason |
|-----------|--------|
| Supabase dashboard | Third-party infrastructure |
| Supabase Auth API | Managed service (we use Clerk instead) |
| Supabase infrastructure | Covered by Supabase security program |
| PostgreSQL server directly | Only accessible via Supabase APIs |

**Note**: Testing RLS policies via the application is IN SCOPE. Direct database access testing is out of scope.

**Contact for Supabase Security**: security@supabase.io

#### Netlify (Hosting Provider)

| Component | Reason |
|-----------|--------|
| Netlify dashboard | Third-party infrastructure |
| Netlify CDN infrastructure | Managed service |
| Build and deploy systems | Third-party CI/CD |
| DNS management | Managed service |

**Contact for Netlify Security**: security@netlify.com

#### Other Third Parties

| Service | Contact |
|---------|---------|
| GitHub (repository hosting) | security@github.com |
| Sentry (error tracking) | security@sentry.io |
| Ghost CMS (if integrated) | Contact via ghost.org |

### Testing Boundaries

#### Permitted Activities

- Automated vulnerability scanning against in-scope targets
- Manual penetration testing of web application
- API security testing through the application
- Social engineering simulations (with HR approval)
- Source code review
- Configuration review

#### Prohibited Activities

- Denial of Service (DoS) attacks against any system
- Testing third-party services without authorization
- Physical security testing without approval
- Social engineering against real users
- Data destruction or modification in production
- Accessing other users' actual data
- Testing from prohibited jurisdictions

#### Testing Environment

| Environment | Permitted Tests |
|-------------|-----------------|
| Production | Read-only tests, passive scanning only |
| Staging/Preview | Full penetration testing |
| Local Development | Full testing with test data |

**Recommendation**: Always perform active testing against staging/preview deployments, not production.

---

## Testing Methodologies

### OWASP Testing Guide

The OWASP Testing Guide provides a comprehensive framework for web application security testing.

#### OWASP Testing Categories for MeJohnC.Org

| Category | OWASP ID | Applicability |
|----------|----------|---------------|
| Information Gathering | OTG-INFO | High |
| Configuration Management | OTG-CONFIG | High |
| Identity Management | OTG-IDENT | High (via Clerk) |
| Authentication | OTG-AUTHN | High |
| Authorization | OTG-AUTHZ | Critical |
| Session Management | OTG-SESS | High |
| Input Validation | OTG-INPVAL | Critical |
| Error Handling | OTG-ERR | Medium |
| Cryptography | OTG-CRYPST | Medium |
| Business Logic | OTG-BUSLOGIC | High |
| Client-Side | OTG-CLIENT | High |

#### OWASP Top 10 Mapping

| Rank | Vulnerability | MeJohnC.Org Controls |
|------|---------------|---------------------|
| A01:2021 | Broken Access Control | RBAC system, Supabase RLS |
| A02:2021 | Cryptographic Failures | HTTPS, Clerk JWT, Supabase encryption |
| A03:2021 | Injection | Zod validation, parameterized queries |
| A04:2021 | Insecure Design | Architecture review, threat modeling |
| A05:2021 | Security Misconfiguration | Security headers, Netlify config |
| A06:2021 | Vulnerable Components | npm audit, Dependabot |
| A07:2021 | Identity/Auth Failures | Clerk (managed auth) |
| A08:2021 | Software/Data Integrity | SRI headers, CSP |
| A09:2021 | Security Logging Failures | Audit logging, Sentry |
| A10:2021 | SSRF | Limited server-side, edge function validation |

### PTES (Penetration Testing Execution Standard)

PTES provides a standard methodology for conducting penetration tests.

#### Phase 1: Pre-engagement Interactions

```markdown
## Pre-engagement Checklist

- [ ] Define scope and boundaries (see Scope Definition above)
- [ ] Obtain written authorization
- [ ] Establish communication channels
- [ ] Define rules of engagement
- [ ] Set testing timeline
- [ ] Identify emergency contacts
- [ ] Sign NDA if external tester
```

#### Phase 2: Intelligence Gathering

| Activity | Tools | Focus Areas |
|----------|-------|-------------|
| Passive Reconnaissance | OSINT tools, Google dorks | Public information exposure |
| Active Reconnaissance | nmap, dirb | Service enumeration |
| Target Mapping | Burp Suite, OWASP ZAP | Application structure |

#### Phase 3: Threat Modeling

For MeJohnC.Org, primary threat actors include:

| Threat Actor | Motivation | Capability |
|--------------|------------|------------|
| Script Kiddies | Defacement, reputation | Low |
| Competitors | Data theft, disruption | Medium |
| Hacktivists | Ideology, exposure | Medium |
| Insiders | Financial gain, revenge | High (system access) |
| APT | IP theft, persistence | High |

#### Phase 4: Vulnerability Analysis

```markdown
## Vulnerability Analysis Approach

1. Automated Scanning
   - Run OWASP ZAP spider and active scan
   - Execute npm audit for dependency vulnerabilities
   - Check CSP and security headers

2. Manual Testing
   - Review RBAC implementation
   - Test authentication flows
   - Verify input validation
   - Check authorization on all endpoints

3. Code Review
   - Review src/lib/security*.ts
   - Audit database queries
   - Check for hardcoded secrets
```

#### Phase 5: Exploitation

**Note**: Exploitation should only be performed with explicit authorization and in non-production environments.

| Test Type | Safe Approach |
|-----------|---------------|
| Authentication Bypass | Use test accounts, not real users |
| SQL Injection | Use prepared test cases |
| XSS | Use benign payloads (alert boxes) |
| IDOR | Access only test data |

#### Phase 6: Post-Exploitation

For MeJohnC.Org, post-exploitation testing focuses on:

- Privilege escalation from `viewer` to `admin`
- Lateral movement between resources
- Data exfiltration paths
- Persistence mechanisms

#### Phase 7: Reporting

See [Professional Pentest Engagement - Report Expectations](#report-expectations) for report format.

---

## Test Categories

### Authentication Testing

#### Test Cases

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|-----------------|
| AUTH-01 | Valid login | Functional | Session created, JWT issued |
| AUTH-02 | Invalid credentials | Functional | Error message, no session |
| AUTH-03 | Brute force protection | Automated | Rate limiting after 5 attempts |
| AUTH-04 | Session fixation | Manual | New session ID on login |
| AUTH-05 | Session timeout | Timed | Session expires after configured period |
| AUTH-06 | Logout completeness | Functional | Token invalidated, storage cleared |
| AUTH-07 | JWT tampering | Manual | Modified tokens rejected |
| AUTH-08 | Concurrent sessions | Functional | Per security policy |

#### Clerk-Specific Tests

Since authentication is handled by Clerk, test the integration points:

```typescript
// Test areas for Clerk integration
const clerkIntegrationTests = [
  'JWT token passed to Supabase correctly',
  'User metadata (role) properly extracted',
  'Session hooks return correct state',
  'Logout clears all local state',
  'Token refresh works seamlessly',
];
```

### Authorization Testing

#### RBAC Test Matrix

| Resource | Action | admin | editor | author | viewer | guest |
|----------|--------|-------|--------|--------|--------|-------|
| apps | create | ALLOW | ALLOW | ALLOW | DENY | DENY |
| apps | read | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| apps | update | ALLOW | ALLOW | ALLOW | DENY | DENY |
| apps | delete | ALLOW | DENY | DENY | DENY | DENY |
| blog_posts | publish | ALLOW | ALLOW | DENY | DENY | DENY |
| settings | manage | ALLOW | DENY | DENY | DENY | DENY |
| audit_logs | read | ALLOW | DENY | DENY | DENY | DENY |

#### Test Cases

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|-----------------|
| AUTHZ-01 | Access admin route as guest | Manual | Redirect to login |
| AUTHZ-02 | Access admin route as viewer | Manual | 403 or limited view |
| AUTHZ-03 | IDOR on blog posts | Manual | Can only edit own posts (author) |
| AUTHZ-04 | Direct API access | API | RLS enforces permissions |
| AUTHZ-05 | Role escalation | Manual | Cannot modify own role |
| AUTHZ-06 | Horizontal privilege | Manual | Cannot access other users' data |

#### Supabase RLS Test Queries

```sql
-- Test as different roles (use Supabase SQL editor with role switching)

-- Test 1: Viewer cannot insert
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"role": "viewer"}';
INSERT INTO blog_posts (title, content) VALUES ('Test', 'Content');
-- Expected: Denied by RLS

-- Test 2: Admin can access audit logs
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"role": "admin"}';
SELECT * FROM immutable_audit_logs LIMIT 1;
-- Expected: Allowed

-- Test 3: Viewer cannot access audit logs
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"role": "viewer"}';
SELECT * FROM immutable_audit_logs LIMIT 1;
-- Expected: Empty result (RLS)
```

### Input Validation Testing

#### Test Areas

| Input Type | Location | Validation |
|------------|----------|------------|
| Text fields | Forms | Zod schema, max length |
| URLs | Blog posts, apps | URL schema validation |
| Slugs | All content types | Alphanumeric, lowercase |
| File uploads | (if implemented) | File type, size limits |
| Rich text | Blog editor | HTML sanitization |

#### XSS Test Payloads

Test with these payloads in all input fields (use staging environment):

```javascript
// Basic XSS
<script>alert('XSS')</script>

// Event handler
<img src=x onerror=alert('XSS')>

// SVG-based
<svg onload=alert('XSS')>

// Data URI
<a href="data:text/html,<script>alert('XSS')</script>">click</a>

// Encoded
%3Cscript%3Ealert('XSS')%3C/script%3E
```

#### SQL Injection Test Payloads

Note: Supabase uses parameterized queries, but test for edge cases:

```sql
-- Classic SQLi
' OR '1'='1
' UNION SELECT * FROM users--
'; DROP TABLE users;--

-- Numeric injection
1 OR 1=1
1; SELECT * FROM users

-- Time-based blind
' OR SLEEP(5)--
```

### API Security Testing

#### Test Cases

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|-----------------|
| API-01 | Missing authentication | cURL | 401 Unauthorized |
| API-02 | Invalid JWT | cURL | 401 Unauthorized |
| API-03 | Expired JWT | cURL | 401 Unauthorized |
| API-04 | Rate limiting | Automated | 429 after threshold |
| API-05 | CORS headers | Browser | Proper origin validation |
| API-06 | Content-Type validation | cURL | Reject unexpected types |

#### API Test Commands

```bash
# Test unauthenticated access
curl -X GET "https://mejohnc.org/api/admin-endpoint" \
  -H "Content-Type: application/json"
# Expected: 401

# Test with invalid token
curl -X GET "https://mejohnc.org/api/admin-endpoint" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json"
# Expected: 401

# Test CORS
curl -X OPTIONS "https://mejohnc.org/api/endpoint" \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST"
# Expected: No Access-Control-Allow-Origin for malicious origin
```

### Session Management Testing

#### Test Cases

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|-----------------|
| SESS-01 | Session ID randomness | Analysis | Cryptographically random |
| SESS-02 | Session in URL | Review | Never exposed in URL |
| SESS-03 | Session cookie flags | Browser | Secure, HttpOnly, SameSite |
| SESS-04 | Session regeneration | Functional | New ID on privilege change |
| SESS-05 | Concurrent session limit | Functional | Per security policy |
| SESS-06 | Session timeout | Timed | Expires as configured |

#### Cookie Analysis

```javascript
// Check session cookie attributes
document.cookie.split(';').forEach(cookie => {
  console.log(cookie.trim());
});

// In browser DevTools, check:
// - Secure flag (HTTPS only)
// - HttpOnly flag (no JS access)
// - SameSite attribute (Strict or Lax)
// - Expiration time
```

### Client-Side Security Testing

#### Test Areas

| Area | Test Focus |
|------|------------|
| localStorage | Sensitive data exposure |
| sessionStorage | Token storage |
| IndexedDB | Cached data |
| Service Workers | Cache poisoning |
| CSP | Policy effectiveness |
| SRI | Subresource integrity |

#### Browser DevTools Checks

```javascript
// Check for sensitive data in storage
console.log('localStorage:', Object.keys(localStorage));
console.log('sessionStorage:', Object.keys(sessionStorage));

// Check for exposed secrets in window
console.log('Window properties:', Object.keys(window).filter(k =>
  k.toLowerCase().includes('key') ||
  k.toLowerCase().includes('secret') ||
  k.toLowerCase().includes('token')
));

// Check CSP
console.log('CSP:', document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content);
```

#### Security Headers to Verify

```bash
# Check security headers
curl -I https://mejohnc.org | grep -iE "(strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy)"

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# Content-Security-Policy: <appropriate policy>
# X-Frame-Options: DENY (or SAMEORIGIN)
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

---

## DIY Security Testing

### Recommended Tools

#### Free Tools

| Tool | Purpose | Download |
|------|---------|----------|
| **OWASP ZAP** | Web app scanner, proxy | https://www.zaproxy.org/ |
| **Burp Suite Community** | Web proxy, scanner | https://portswigger.net/burp |
| **nmap** | Network scanning | https://nmap.org/ |
| **sqlmap** | SQL injection testing | https://sqlmap.org/ |
| **Nikto** | Web server scanner | https://cirt.net/Nikto2 |
| **npm audit** | Dependency vulnerabilities | Built into npm |
| **eslint-plugin-security** | Code security linting | npm package |

#### Commercial Tools (Optional)

| Tool | Purpose | Notes |
|------|---------|-------|
| **Burp Suite Professional** | Advanced web testing | Recommended for professionals |
| **Snyk** | Dependency/container scanning | Free tier available |
| **SonarQube** | Code quality/security | Self-hosted option |

### Common Tests to Run

#### 1. Automated Scanning with OWASP ZAP

```bash
# Start ZAP in daemon mode
zap.sh -daemon -port 8080

# Spider the application
zap-cli spider https://mejohnc.org

# Run active scan
zap-cli active-scan https://mejohnc.org

# Generate report
zap-cli report -o zap-report.html -f html
```

#### 2. Dependency Vulnerability Scanning

```bash
# Run npm audit
npm audit

# For detailed output
npm audit --json > npm-audit-report.json

# Fix vulnerabilities automatically (review changes)
npm audit fix

# Check for outdated packages
npm outdated
```

#### 3. Security Header Check

```bash
# Use securityheaders.com API or manual check
curl -s https://securityheaders.com/?q=mejohnc.org&followRedirects=on

# Or use Mozilla Observatory
# Visit: https://observatory.mozilla.org/
```

#### 4. SSL/TLS Testing

```bash
# Use SSL Labs
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=mejohnc.org

# Or use testssl.sh
./testssl.sh mejohnc.org
```

#### 5. Source Code Security Scan

```bash
# Install semgrep
pip install semgrep

# Run security rules
semgrep --config=p/security-audit src/

# Or use eslint security plugin
npm install --save-dev eslint-plugin-security
npx eslint --plugin security src/
```

### Developer Security Checklist

Use this checklist before each release:

```markdown
## Pre-Release Security Checklist

### Authentication & Authorization
- [ ] All admin routes require authentication
- [ ] RBAC permissions enforced on all API calls
- [ ] No hardcoded credentials in code
- [ ] JWT tokens properly validated

### Input Validation
- [ ] All user inputs validated with Zod schemas
- [ ] HTML content properly sanitized
- [ ] File uploads (if any) validated and scanned
- [ ] SQL queries use parameterized statements

### Session Management
- [ ] Sessions expire after inactivity
- [ ] Logout clears all session data
- [ ] Session tokens are cryptographically random
- [ ] Cookies have Secure and HttpOnly flags

### Client-Side Security
- [ ] No sensitive data in localStorage
- [ ] CSP headers properly configured
- [ ] No inline scripts (use nonces if needed)
- [ ] External resources use SRI

### Configuration
- [ ] Debug mode disabled in production
- [ ] Error messages don't leak sensitive info
- [ ] Security headers present and correct
- [ ] HTTPS enforced everywhere

### Dependencies
- [ ] npm audit shows no high/critical issues
- [ ] All dependencies up to date
- [ ] No deprecated packages in use
- [ ] Lock file committed and current

### Logging & Monitoring
- [ ] Security events are logged
- [ ] Logs don't contain sensitive data
- [ ] Error tracking configured (Sentry)
- [ ] Rate limiting active on sensitive endpoints

### Documentation
- [ ] Security controls documented
- [ ] Incident response plan current
- [ ] Recovery procedures tested
```

### Quick Security Tests

#### Test Authentication

```javascript
// In browser console (logged out)
fetch('/admin/api/settings')
  .then(r => console.log('Status:', r.status))
  .catch(e => console.log('Error:', e));
// Expected: 401 or redirect
```

#### Test CSRF Protection

```javascript
// Try to make request without CSRF token
fetch('/api/admin/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
})
.then(r => console.log('Status:', r.status));
// Expected: 403 (CSRF token missing)
```

#### Test XSS Protection

```javascript
// Check if React escapes output properly
const testPayload = '<script>alert("xss")</script>';
// Input this in a text field and verify it appears as text, not executed
```

---

## Professional Pentest Engagement

### When to Hire Professionals

Consider engaging professional penetration testers when:

| Scenario | Recommendation |
|----------|----------------|
| **Major Release** | Annual pentest for significant feature releases |
| **Compliance Requirement** | SOC 2, ISO 27001, PCI-DSS require third-party testing |
| **Security Incident** | Post-incident validation of remediation |
| **New Attack Surface** | Adding APIs, integrations, or authentication methods |
| **Acquisition/Investment** | Due diligence for M&A or funding |
| **Customer Requirements** | Enterprise customers may require pentest reports |

### Vendor Selection Criteria

#### Required Qualifications

| Criterion | Minimum Requirement |
|-----------|---------------------|
| **Certifications** | OSCP, CREST, or CEH for testers |
| **Experience** | 3+ years web application testing |
| **Insurance** | E&O and cyber liability coverage |
| **References** | 3+ similar project references |
| **Methodology** | OWASP/PTES aligned approach |
| **Reporting** | Detailed remediation guidance |

#### Evaluation Questions

```markdown
## Vendor Evaluation Checklist

### Company Background
- [ ] Years in business: ______
- [ ] Number of security consultants: ______
- [ ] Industry focus: ______
- [ ] References provided: Yes / No

### Technical Capability
- [ ] Experience with React/SPA applications
- [ ] Experience with Supabase/PostgreSQL
- [ ] Experience with Clerk or similar auth providers
- [ ] Experience with JAMstack/Netlify

### Methodology
- [ ] Testing methodology documented
- [ ] OWASP Top 10 coverage
- [ ] API security testing included
- [ ] Source code review available (white box)

### Operational
- [ ] Ability to test staging environments
- [ ] Flexible scheduling
- [ ] Point of contact assigned
- [ ] Emergency escalation process

### Deliverables
- [ ] Executive summary included
- [ ] Technical findings with severity ratings
- [ ] Remediation recommendations
- [ ] Retest included in scope
- [ ] Findings presentation available
```

### Rules of Engagement

#### Sample Rules of Engagement Document

```markdown
# Penetration Test Rules of Engagement

## Project: MeJohnC.Org Security Assessment
## Date: [DATE]
## Version: 1.0

### 1. Scope

#### In Scope
- Web application at https://mejohnc.org (staging: https://staging.mejohnc.org)
- Admin dashboard at /admin/*
- API endpoints accessed via the application
- Source code repository (white box)

#### Out of Scope
- Third-party services (Clerk, Supabase, Netlify)
- Physical security
- Social engineering of real users
- Denial of service testing

### 2. Testing Windows

| Day | Time (UTC) | Activity |
|-----|------------|----------|
| Mon-Fri | 09:00-17:00 | Active testing |
| Sat-Sun | None | No testing |

### 3. Communication

| Type | Contact | Method |
|------|---------|--------|
| Primary | [Name] | [Email/Phone] |
| Emergency | [Name] | [Phone] |
| Escalation | [Name] | [Email] |

### 4. Authorized Activities
- Vulnerability scanning
- Manual penetration testing
- Authentication testing with provided credentials
- API security testing
- Source code review

### 5. Prohibited Activities
- Denial of service attacks
- Social engineering
- Physical access attempts
- Testing outside defined scope
- Data exfiltration of real user data
- Modification of production data

### 6. Test Credentials
- Provide separate test accounts for each role:
  - admin_test@example.com (admin role)
  - editor_test@example.com (editor role)
  - viewer_test@example.com (viewer role)

### 7. Data Handling
- Test data only; no access to real user data
- Findings classified as confidential
- Data destroyed after project completion
- Report shared only with authorized recipients

### 8. Incident Handling
If tester discovers active compromise:
1. Stop testing immediately
2. Contact emergency contact
3. Document findings
4. Do not attempt remediation

### 9. Signatures

Client: _________________________ Date: _______
Tester: _________________________ Date: _______
```

### Report Expectations

#### Executive Summary

```markdown
## Executive Summary

### Overall Risk Rating: [HIGH/MEDIUM/LOW]

### Key Findings Summary
| Severity | Count |
|----------|-------|
| Critical | X |
| High | X |
| Medium | X |
| Low | X |
| Informational | X |

### Top Risks
1. [Finding 1 - Brief description]
2. [Finding 2 - Brief description]
3. [Finding 3 - Brief description]

### Recommended Priority Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]
```

#### Technical Finding Format

```markdown
## Finding: [VULN-001] - Finding Title

### Severity: [Critical/High/Medium/Low]

### CVSS Score: X.X

### Description
[Detailed description of the vulnerability]

### Affected Component
- URL/Endpoint: [location]
- Parameter: [parameter name]
- Component: [affected code/feature]

### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Evidence
[Screenshots, code snippets, HTTP requests/responses]

### Impact
[What an attacker could do with this vulnerability]

### Remediation
[Specific steps to fix the issue]

### References
- [OWASP reference]
- [CWE reference]
```

#### Report Deliverables Checklist

```markdown
## Expected Pentest Deliverables

### Documentation
- [ ] Executive summary (1-2 pages)
- [ ] Technical findings report (detailed)
- [ ] Risk rating methodology explanation
- [ ] Scope confirmation

### Per Finding
- [ ] Unique identifier
- [ ] Severity rating with justification
- [ ] Detailed description
- [ ] Reproduction steps
- [ ] Evidence (screenshots, payloads)
- [ ] Business impact
- [ ] Remediation guidance
- [ ] References (CWE, OWASP)

### Supporting Materials
- [ ] Testing methodology documentation
- [ ] Tools used list
- [ ] Time log of testing activities
- [ ] Raw scan outputs (optional)

### Follow-up
- [ ] Findings presentation meeting
- [ ] Q&A session with developers
- [ ] Retest of fixed issues
- [ ] Final attestation letter
```

---

## Vulnerability Remediation Process

### Severity Classification

| Severity | CVSS Score | SLA | Examples |
|----------|------------|-----|----------|
| **Critical** | 9.0-10.0 | 24 hours | RCE, auth bypass, data breach |
| **High** | 7.0-8.9 | 7 days | SQLi, stored XSS, privilege escalation |
| **Medium** | 4.0-6.9 | 30 days | Reflected XSS, CSRF, info disclosure |
| **Low** | 0.1-3.9 | 90 days | Minor info leak, best practice |
| **Informational** | 0.0 | As resources allow | Suggestions, hardening |

### Remediation Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Finding    │────▶│   Triage    │────▶│   Assign    │
│  Received   │     │  & Verify   │     │   Owner     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │   Retest    │◀────│  Develop    │
                    │             │     │    Fix      │
                    └──────┬──────┘     └─────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │    Pass     │          │    Fail     │
       │   (Close)   │          │  (Re-fix)   │
       └─────────────┘          └─────────────┘
```

### Remediation Tracking

#### GitHub Issue Template for Vulnerabilities

```markdown
---
name: Security Vulnerability
about: Report a security finding from pentest
title: '[SECURITY] VULN-XXX: Finding Title'
labels: security, pentest-finding
assignees: ''
---

## Finding Details
- **ID**: VULN-XXX
- **Severity**: Critical/High/Medium/Low
- **CVSS Score**: X.X
- **SLA Deadline**: YYYY-MM-DD

## Description
[Copy from pentest report]

## Reproduction Steps
[Copy from pentest report]

## Remediation Guidance
[Copy from pentest report]

## Implementation Plan
- [ ] Root cause identified
- [ ] Fix designed
- [ ] Fix implemented
- [ ] Unit tests added
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Retest requested
- [ ] Deployed to production

## Related Issues
- Pentest Report: [link]
- Related PR: #XXX
```

### Fix Development Guidelines

#### Secure Coding Practices

```typescript
// Example: Input validation fix
// Before (vulnerable)
function updateUser(id: string, data: any) {
  return supabase.from('users').update(data).eq('id', id);
}

// After (secure)
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  // Explicitly list allowed fields - no role, no id
});

function updateUser(id: string, data: unknown) {
  const validated = updateUserSchema.parse(data);
  return supabase.from('users').update(validated).eq('id', id);
}
```

#### Testing Requirements for Security Fixes

```typescript
// Example: Test for authorization fix
describe('Authorization', () => {
  it('should deny viewer from accessing admin settings', async () => {
    const viewerUser = { role: 'viewer' };
    const result = canAccessRoute(viewerUser.role, '/admin/settings');
    expect(result).toBe(false);
  });

  it('should allow admin to access admin settings', async () => {
    const adminUser = { role: 'admin' };
    const result = canAccessRoute(adminUser.role, '/admin/settings');
    expect(result).toBe(true);
  });
});
```

---

## Retest Procedures

### Retest Request Process

1. **Fix Completion**: Developer marks fix as complete in issue
2. **Code Review**: Security-focused code review required
3. **Staging Deployment**: Fix deployed to staging environment
4. **Retest Request**: Submit retest request to tester

#### Retest Request Template

```markdown
## Retest Request

**Finding ID**: VULN-XXX
**Original Severity**: High
**Fix PR**: #123
**Staging URL**: https://staging.mejohnc.org

### Fix Description
[Describe what was changed]

### Test Guidance
[Specific areas to test, any test accounts needed]

### Deployment Status
- [x] Merged to main
- [x] Deployed to staging
- [ ] Deployed to production (pending retest)

### Requested By
[Name, Date]
```

### Retest Execution

| Step | Activity | Owner |
|------|----------|-------|
| 1 | Verify fix in staging | Tester |
| 2 | Attempt original exploit | Tester |
| 3 | Check for regressions | Tester |
| 4 | Document results | Tester |
| 5 | Update finding status | Tester |
| 6 | Approve production deploy | Security Lead |

### Retest Outcomes

| Outcome | Action |
|---------|--------|
| **Pass** | Close finding, approve production deploy |
| **Partial** | Document remaining risk, extend deadline |
| **Fail** | Reopen finding, reassign for re-fix |
| **New Issue** | Create new finding for regression |

---

## Security Audit Schedule

### Annual Security Calendar

| Month | Activity | Type |
|-------|----------|------|
| January | Q4 findings review, annual planning | Internal |
| February | Dependency audit, npm security review | Internal |
| March | External penetration test | External |
| April | Remediation sprint | Internal |
| May | Retest of Q1 findings | External |
| June | Code security review | Internal |
| July | Configuration audit | Internal |
| August | Incident response drill | Internal |
| September | External penetration test | External |
| October | Remediation sprint | Internal |
| November | Retest of Q3 findings | External |
| December | Year-end review, compliance check | Internal |

### Audit Types and Frequency

| Audit Type | Frequency | Owner | Deliverable |
|------------|-----------|-------|-------------|
| Automated Scanning | Weekly | CI/CD | npm audit report |
| Dependency Review | Monthly | Security Lead | Update plan |
| Configuration Audit | Quarterly | Security Lead | Config review doc |
| Internal Code Review | Quarterly | Dev Team | Code review report |
| External Pentest | Semi-annual | External Vendor | Pentest report |
| Compliance Audit | Annual | External Vendor | Compliance certificate |

### Continuous Monitoring

```yaml
# GitHub Actions security workflow
name: Security Checks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

---

## Bug Bounty Considerations

### Bug Bounty Program Readiness

Before launching a bug bounty program, ensure:

| Requirement | Status | Notes |
|-------------|--------|-------|
| Mature security program | Required | Pentest remediation complete |
| Incident response plan | Required | Can handle reports 24/7 |
| Legal review | Required | Terms, safe harbor, rewards |
| Triage capability | Required | Can assess and respond quickly |
| Remediation capacity | Required | Can fix issues promptly |
| Budget | Required | Reward pool allocated |

### Bug Bounty vs. Pentest

| Aspect | Bug Bounty | Pentest |
|--------|-----------|---------|
| **Timing** | Continuous | Point-in-time |
| **Scope** | Defined, public | Negotiated, private |
| **Testers** | Many, unknown | Few, vetted |
| **Cost Model** | Pay per valid bug | Fixed project fee |
| **Comprehensiveness** | Variable | Systematic |
| **Best For** | Mature security programs | Initial assessment |

### Recommended Approach for MeJohnC.Org

Given MeJohnC.Org's current stage:

1. **Phase 1 (Current)**: Internal testing + semi-annual external pentest
2. **Phase 2 (6-12 months)**: Consider private bug bounty (HackerOne private)
3. **Phase 3 (12+ months)**: Evaluate public bug bounty based on growth

### Bug Bounty Scope (Draft)

If/when implementing a bug bounty:

```markdown
## MeJohnC.Org Bug Bounty Scope

### In Scope
- *.mejohnc.org web properties
- Authentication and authorization issues
- Data exposure vulnerabilities
- Injection attacks (XSS, SQLi)
- CSRF vulnerabilities

### Out of Scope
- Third-party services (Clerk, Supabase, Netlify)
- Denial of service
- Social engineering
- Physical security
- Spam or content-related issues
- Vulnerabilities requiring unlikely user interaction

### Rewards (Draft)
| Severity | Reward |
|----------|--------|
| Critical | $500-$1,000 |
| High | $200-$500 |
| Medium | $50-$200 |
| Low | $25-$50 |

### Safe Harbor
We will not pursue legal action against researchers who:
- Act in good faith
- Avoid privacy violations
- Do not disrupt services
- Report issues responsibly
- Follow our disclosure policy
```

### Vulnerability Disclosure Policy

Even without a formal bug bounty, have a disclosure policy:

```markdown
## Vulnerability Disclosure Policy

### Reporting
Report security issues to: security@mejohnc.org

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your contact information

### Our Commitment
- Acknowledge receipt within 48 hours
- Provide status updates every 7 days
- Work with you on disclosure timeline
- Credit you in our acknowledgments (if desired)

### Your Commitment
- Do not access or modify others' data
- Do not disrupt our services
- Allow reasonable time for remediation
- Do not disclose publicly before coordinated

### Recognition
We maintain a security researcher hall of fame at:
https://mejohnc.org/security/acknowledgments
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-20 | Claude Code | Initial version (Issue #61) |

---

## References

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PTES Technical Guidelines](http://www.pentest-standard.org/index.php/PTES_Technical_Guidelines)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST SP 800-115: Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [HackerOne Bug Bounty Best Practices](https://www.hackerone.com/resources)
- [Bugcrowd Vulnerability Disclosure Guidelines](https://www.bugcrowd.com/resource/what-is-responsible-disclosure/)

---

*This document should be reviewed quarterly and updated after each penetration test engagement.*
