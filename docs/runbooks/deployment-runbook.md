# Deployment Runbook

This runbook covers deployment procedures for MeJohnC.Org, a React/TypeScript application hosted on Netlify with Supabase backend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Architecture](#deployment-architecture)
3. [Automatic Deployment (CI/CD)](#automatic-deployment-cicd)
4. [Manual Deployment](#manual-deployment)
5. [Environment-Specific Deployments](#environment-specific-deployments)
6. [Pre-Deployment Checklist](#pre-deployment-checklist)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Rollback Procedures](#rollback-procedures)
9. [Hotfix Deployment](#hotfix-deployment)
10. [Contact and Escalation](#contact-and-escalation)

---

## Prerequisites

### Required Access

| Resource | Access Level | How to Obtain |
|----------|--------------|---------------|
| GitHub Repository | Write access | Request from repository owner |
| Netlify Dashboard | Team member | Netlify team invitation |
| Supabase Dashboard | Editor or higher | Supabase project invitation |
| Clerk Dashboard | Admin | Clerk organization invitation |

### Required Tools

```bash
# Node.js 20.x
node --version  # Should output v20.x.x

# npm 10.x
npm --version   # Should output 10.x.x

# Git
git --version   # Should output 2.x.x

# Netlify CLI (optional)
npm install -g netlify-cli
netlify --version

# Supabase CLI (for database migrations)
npm install -g supabase
supabase --version
```

### Environment Variables

Ensure these secrets are configured in deployment targets:

```bash
# Required
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# Optional
VITE_GHOST_URL=https://xxx.ghost.io
VITE_GHOST_CONTENT_API_KEY=xxx
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Deployment Architecture

```
GitHub (main branch)
        |
        v
GitHub Actions CI/CD
   |         |
   v         v
Quality    Tests
   |         |
   +----+----+
        |
        v
      Build
        |
        v
   Netlify CDN
        |
        v
  Production Site
  (mejohnc.org)
```

### Environments

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| Production | `main` | mejohnc.org | Live site |
| Preview | PR branches | *.netlify.app | PR review |
| Development | Local | localhost:5173 | Development |

---

## Automatic Deployment (CI/CD)

### Standard Deployment Flow

Deployments are triggered automatically when code is merged to `main`:

1. **Push to `main` branch** triggers GitHub Actions workflow
2. **Quality checks** run (ESLint, TypeScript)
3. **Unit tests** execute
4. **Build process** creates production bundle
5. **Netlify deployment** publishes to CDN

### Monitoring CI/CD Pipeline

```bash
# View workflow status via GitHub CLI
gh run list --repo mejohnc-ft/MeJohnC.Org --limit 5

# View specific run details
gh run view <run-id> --repo mejohnc-ft/MeJohnC.Org

# Watch a running workflow
gh run watch <run-id> --repo mejohnc-ft/MeJohnC.Org
```

### CI/CD Workflow Location

The CI/CD pipeline is defined in `.github/workflows/ci.yml`

---

## Manual Deployment

### When to Use Manual Deployment

- CI/CD pipeline is broken
- Emergency hotfix needed
- Testing deployment configuration

### Step-by-Step Manual Deployment

#### Step 1: Prepare Environment

```bash
# Clone repository (if not already done)
git clone https://github.com/MeJohnC/MeJohnC.Org.git
cd MeJohnC.Org

# Ensure you're on main branch
git checkout main
git pull origin main

# Install dependencies
npm ci
```

#### Step 2: Run Quality Checks

```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm run test:run
```

#### Step 3: Build Application

```bash
# Set environment variables (use actual values)
export VITE_SUPABASE_URL="https://xxx.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJxxx"
export VITE_CLERK_PUBLISHABLE_KEY="pk_xxx"

# Build
npm run build
```

#### Step 4: Deploy via Netlify CLI

```bash
# Login to Netlify (first time only)
netlify login

# Link to site (first time only)
netlify link

# Deploy to production
netlify deploy --prod --dir=dist
```

#### Step 5: Verify Deployment

```bash
# Check deployment status
netlify status

# Open deployed site
netlify open:site
```

---

## Environment-Specific Deployments

### Production Deployment

Production deployments use these settings from `netlify.toml`:

```toml
[context.production]
  environment = { NODE_ENV = "production" }
```

### Preview Deployment

Preview deployments are created automatically for pull requests:

```bash
# Create PR to trigger preview
gh pr create --title "Feature: xyz" --body "Description"

# Preview URL will be posted as a comment on the PR
```

### Branch Deployment (Staging)

Branch deploys use staging environment:

```toml
[context.branch-deploy]
  environment = { NODE_ENV = "staging" }
```

---

## Pre-Deployment Checklist

### Before Every Deployment

- [ ] All CI checks pass (green status)
- [ ] Code has been reviewed and approved
- [ ] No critical bugs in staging/preview
- [ ] Database migrations applied (if any)
- [ ] Environment variables configured
- [ ] Feature flags set appropriately

### Before Major Releases

- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Rollback plan prepared

---

## Post-Deployment Verification

### Automated Verification

```bash
# Run smoke tests (if available)
npm run test:e2e -- --grep "@smoke"

# Check Lighthouse scores
npm run lighthouse
```

### Manual Verification Checklist

1. **Homepage**
   - [ ] Page loads without errors
   - [ ] Navigation works
   - [ ] Hero section displays correctly

2. **Authentication**
   - [ ] Sign in works
   - [ ] Sign out works
   - [ ] Protected routes redirect correctly

3. **Admin Dashboard**
   - [ ] Dashboard loads
   - [ ] CRUD operations work
   - [ ] Data displays correctly

4. **API/Database**
   - [ ] Data fetches correctly
   - [ ] Mutations work
   - [ ] Real-time updates function

5. **Monitoring**
   - [ ] No new errors in Sentry
   - [ ] Netlify analytics shows traffic
   - [ ] Performance metrics acceptable

### Verification Commands

```bash
# Check site is responding
curl -I https://mejohnc.org

# Check specific endpoints
curl -s https://mejohnc.org/sitemap.xml | head -20

# Check Netlify deployment status
netlify status
```

---

## Rollback Procedures

### Quick Rollback via Netlify

1. **Access Netlify Dashboard**
   - Go to https://app.netlify.com
   - Select the site
   - Navigate to "Deploys" tab

2. **Find Previous Working Deploy**
   - Identify the last known good deployment
   - Click on the deploy row

3. **Publish Previous Deploy**
   - Click "Publish deploy" button
   - Confirm the rollback

### Rollback via CLI

```bash
# List recent deploys
netlify deploy:list

# Rollback to specific deploy
netlify deploy --prod --deploy-id=<previous-deploy-id>
```

### Rollback via Git

```bash
# Revert the problematic commit
git revert <commit-hash>

# Push to trigger new deployment
git push origin main
```

### Post-Rollback Actions

1. [ ] Verify site is working
2. [ ] Notify stakeholders
3. [ ] Create incident report
4. [ ] Investigate root cause
5. [ ] Plan fix and re-deployment

---

## Hotfix Deployment

### Emergency Hotfix Process

#### Step 1: Create Hotfix Branch

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-description
```

#### Step 2: Apply Fix

```bash
# Make minimal changes to fix the issue
# Test locally
npm run dev
npm run test:run
```

#### Step 3: Expedited Review

```bash
# Create PR with urgent label
gh pr create --title "HOTFIX: Critical bug description" \
  --body "Emergency fix for production issue" \
  --label "urgent"
```

#### Step 4: Fast-Track Merge

- Get expedited review (minimum 1 approval)
- Merge immediately after approval
- Monitor deployment closely

#### Step 5: Post-Hotfix

1. [ ] Verify fix in production
2. [ ] Create post-mortem if needed
3. [ ] Update monitoring/alerts
4. [ ] Plan permanent fix if hotfix was temporary

---

## Contact and Escalation

### Primary Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Site Owner | [NAME] | [EMAIL] | [HOURS] |
| DevOps Lead | [NAME] | [EMAIL] | [HOURS] |
| On-Call Engineer | [NAME] | [PHONE] | 24/7 |

### Escalation Path

1. **Level 1**: Development team (Slack: #mejohnc-dev)
2. **Level 2**: DevOps lead ([EMAIL])
3. **Level 3**: Site owner ([EMAIL])

### External Support

| Service | Support URL | Status Page |
|---------|-------------|-------------|
| Netlify | support.netlify.com | netlifystatus.com |
| Supabase | supabase.com/support | status.supabase.com |
| Clerk | clerk.com/support | status.clerk.com |
| GitHub | support.github.com | githubstatus.com |

---

## Appendix

### Useful Commands Reference

```bash
# Build commands
npm run build           # Production build with sitemap
npm run build:sitemap   # Generate sitemap only
npm run analyze         # Build with bundle analysis

# Netlify commands
netlify deploy --prod   # Deploy to production
netlify deploy          # Deploy draft/preview
netlify status          # Check site status
netlify logs            # View function logs

# GitHub CLI
gh run list             # List workflow runs
gh pr list              # List pull requests
gh release list         # List releases
```

### Related Documentation

- [DEVELOPER_ONBOARDING.md](../DEVELOPER_ONBOARDING.md) - Development setup
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Environment variables
- [database-runbook.md](./database-runbook.md) - Database operations
- [incident-response.md](./incident-response.md) - Incident handling
