# Staging Environment Guide

This document describes the staging environment setup for MeJohnC.Org, including architecture, configuration, and maintenance procedures.

## Table of Contents

1. [Overview](#overview)
2. [Environment Architecture](#environment-architecture)
3. [Environment Configuration](#environment-configuration)
4. [Staging Setup Guide](#staging-setup-guide)
5. [Data Management](#data-management)
6. [Access Controls](#access-controls)
7. [Staging vs Production Parity](#staging-vs-production-parity)
8. [Deployment Workflow](#deployment-workflow)
9. [Staging Environment Maintenance](#staging-environment-maintenance)
10. [Cost Considerations](#cost-considerations)

---

## Overview

### Purpose

The staging environment serves as a pre-production testing ground that mirrors the production environment as closely as possible. It enables:

- **Integration Testing**: Verify features work together before production deployment
- **User Acceptance Testing (UAT)**: Allow stakeholders to review changes before release
- **Performance Testing**: Identify bottlenecks before they affect users
- **Database Migration Testing**: Validate schema changes safely
- **Third-Party Integration Testing**: Test Clerk, Supabase, and other services with production-like data

### Environment Summary

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| Production | `main` | mejohnc.org | Live site for end users |
| Staging | `staging` | staging.mejohnc.org | Pre-production testing |
| Preview | PR branches | `*.netlify.app` | PR-specific review |
| Development | Local | localhost:5173 | Local development |

---

## Environment Architecture

### Current Infrastructure

```
                    GitHub Repository
                           |
            +--------------+--------------+
            |              |              |
          main         staging        PR branches
            |              |              |
            v              v              v
    +---------------+ +---------------+ +---------------+
    |   Netlify     | |   Netlify     | |   Netlify     |
    |  Production   | |   Staging     | | Deploy Preview|
    +---------------+ +---------------+ +---------------+
            |              |              |
            v              v              v
    +---------------+ +---------------+ +---------------+
    |   Supabase    | |   Supabase    | |   Supabase    |
    |  Production   | |   Staging     | |  Dev/Preview  |
    +---------------+ +---------------+ +---------------+
            |              |              |
            v              v              v
    +---------------+ +---------------+ +---------------+
    |    Clerk      | |    Clerk      | |    Clerk      |
    |  Production   | |   Staging     | |    Test       |
    +---------------+ +---------------+ +---------------+
```

### Netlify Deploy Previews (Existing)

Netlify automatically creates deploy previews for every pull request:

**How It Works:**
- Every PR gets a unique URL: `deploy-preview-<PR#>--mejohnc.netlify.app`
- Preview builds use `NODE_ENV=preview` (configured in `netlify.toml`)
- Preview URLs are posted as comments on PRs automatically
- Each preview is isolated and can be shared for review

**Current Configuration (`netlify.toml`):**
```toml
[context.deploy-preview]
  environment = { NODE_ENV = "preview" }
```

**Use Cases:**
- Quick visual review of UI changes
- Testing feature branches before merge
- Sharing work-in-progress with stakeholders

**Limitations:**
- Uses shared development backend (or production if not configured)
- Not suitable for data-sensitive testing
- No persistent state between deployments

### Dedicated Staging Branch/Site

The staging environment uses a dedicated `staging` branch with its own Netlify site:

**Branch Strategy:**
- `staging` branch mirrors `main` with features ready for final testing
- Merges from feature branches go to `staging` first, then to `main`
- Protected branch with same rules as `main`

**Netlify Staging Site:**
- Separate Netlify site: `mejohnc-staging` (to be created)
- Custom domain: `staging.mejohnc.org`
- Independent environment variables
- Separate build and deploy settings

**Configuration:**
```toml
[context.branch-deploy]
  environment = { NODE_ENV = "staging" }
```

### Staging Supabase Project

A dedicated Supabase project for staging ensures data isolation:

**Project Details:**
- Project name: `mejohnc-staging`
- Region: Same as production (for latency parity)
- Plan: Free tier (sufficient for staging workloads)

**Features:**
- Isolated PostgreSQL database
- Separate Row Level Security (RLS) policies
- Independent Edge Functions deployment
- Own set of API keys and service roles

**Benefits:**
- Safe to run destructive tests
- Can reset data without affecting production
- Test database migrations before production deployment

### Staging Clerk Application

A separate Clerk application for staging authentication:

**Application Details:**
- Application name: `MeJohnC Staging`
- Environment: Development mode (free tier)
- Domain: `staging.mejohnc.org`

**Configuration:**
- Separate publishable and secret keys
- Test user accounts for QA
- Can test OAuth flows without affecting production users

---

## Environment Configuration

### Environment Variables by Environment

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_*` | `pk_test_*` (staging) | `pk_live_*` |
| `VITE_SUPABASE_URL` | Dev project URL | Staging project URL | Prod project URL |
| `VITE_SUPABASE_ANON_KEY` | Dev anon key | Staging anon key | Prod anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev service key | Staging service key | Prod service key |
| `VITE_GHOST_URL` | Dev Ghost | Staging Ghost | Prod Ghost |
| `VITE_GHOST_CONTENT_API_KEY` | Dev API key | Staging API key | Prod API key |
| `VITE_SENTRY_DSN` | Dev DSN | Staging DSN | Prod DSN |

### Setting Environment Variables

**For Local Development (`.env` file):**
```bash
# .env (git-ignored)
NODE_ENV=development
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
```

**For Netlify Staging Site:**
```bash
# Via Netlify CLI
netlify env:set VITE_CLERK_PUBLISHABLE_KEY "pk_test_staging_xxx" --context production
netlify env:set VITE_SUPABASE_URL "https://staging-xxx.supabase.co" --context production
netlify env:set VITE_SUPABASE_ANON_KEY "eyJstaging_xxx" --context production

# Or via Netlify Dashboard:
# Site Settings > Environment Variables > Add variable
# Set scope to "All deploy contexts" or specific contexts
```

**For GitHub Actions (if used for staging deploys):**
```yaml
# .github/workflows/staging.yml
env:
  VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
  VITE_CLERK_PUBLISHABLE_KEY: ${{ secrets.STAGING_CLERK_KEY }}
```

### Feature Flags for Staging

The feature flag system (`src/lib/feature-flags.ts`) supports environment-based enabling:

**Environment-Restricted Flags:**
```typescript
// Example: Flag enabled only in development and staging
'ui.new-dashboard': {
  name: 'ui.new-dashboard',
  description: 'New admin dashboard design',
  enabled: false,
  rolloutPercentage: 10,
  environments: ['development', 'staging'],  // Not in production
}
```

**Staging-Specific Feature Testing:**
```typescript
// Flags useful for staging testing
'testing.synthetic-data': {
  name: 'testing.synthetic-data',
  description: 'Show synthetic test data indicators',
  enabled: false,
  environments: ['staging'],
}

'testing.performance-markers': {
  name: 'testing.performance-markers',
  description: 'Enable performance timing markers',
  enabled: false,
  environments: ['development', 'staging'],
}
```

**Using Flags in Components:**
```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

function MyComponent() {
  const showNewDashboard = isFeatureEnabled('ui.new-dashboard', {
    environment: import.meta.env.MODE,
    userId: user?.id,
  });

  return showNewDashboard ? <NewDashboard /> : <LegacyDashboard />;
}
```

### Data Seeding for Staging

Staging requires realistic test data. Use database seeding scripts:

**Seed Script Location:** `scripts/seed-staging.ts`

**Seed Data Categories:**
1. **User Accounts**: Test users with various roles (admin, editor, viewer)
2. **Sample Content**: Blog posts, projects, apps for testing
3. **Configuration**: Feature flags, settings
4. **Relationships**: Realistic data relationships for testing queries

**Example Seed Script:**
```typescript
// scripts/seed-staging.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.STAGING_SUPABASE_URL!,
  process.env.STAGING_SERVICE_ROLE_KEY!
);

async function seedStagingData() {
  console.log('Seeding staging database...');

  // Seed apps
  const apps = [
    { name: 'Test App 1', slug: 'test-app-1', status: 'active' },
    { name: 'Test App 2', slug: 'test-app-2', status: 'draft' },
    { name: 'Test App 3', slug: 'test-app-3', status: 'archived' },
  ];

  const { error: appsError } = await supabase
    .from('apps')
    .upsert(apps, { onConflict: 'slug' });

  if (appsError) console.error('Apps seed error:', appsError);

  // Seed projects
  const projects = [
    { name: 'Test Project Alpha', status: 'in-progress' },
    { name: 'Test Project Beta', status: 'completed' },
  ];

  const { error: projectsError } = await supabase
    .from('projects')
    .upsert(projects, { onConflict: 'name' });

  if (projectsError) console.error('Projects seed error:', projectsError);

  // Seed contacts (anonymized)
  const contacts = [
    { name: 'Test User A', email: 'test-a@example.com', company: 'Test Corp' },
    { name: 'Test User B', email: 'test-b@example.com', company: 'Demo Inc' },
  ];

  const { error: contactsError } = await supabase
    .from('contacts')
    .upsert(contacts, { onConflict: 'email' });

  if (contactsError) console.error('Contacts seed error:', contactsError);

  console.log('Staging seed complete!');
}

seedStagingData();
```

**Running the Seed Script:**
```bash
# Set staging environment variables
export STAGING_SUPABASE_URL="https://staging-xxx.supabase.co"
export STAGING_SERVICE_ROLE_KEY="eyJxxx"

# Run seed script
npx ts-node scripts/seed-staging.ts
```

---

## Staging Setup Guide

### Step 1: Create Staging Supabase Project

1. **Log in to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in with the organization account

2. **Create New Project**
   - Click "New Project"
   - Organization: Select your organization
   - Name: `mejohnc-staging`
   - Database Password: Generate and save securely
   - Region: `us-west-1` (same as production)
   - Pricing Plan: Free tier

3. **Apply Database Schema**
   ```bash
   # Link to staging project
   npx supabase link --project-ref <staging-project-ref>

   # Push schema and migrations
   npx supabase db push
   ```

4. **Configure Row Level Security (RLS)**
   - Apply same RLS policies as production
   - Policies are included in migrations

5. **Deploy Edge Functions**
   ```bash
   # Deploy all functions to staging
   npx supabase functions deploy --project-ref <staging-project-ref>
   ```

6. **Record Credentials**
   - Note the project URL: `https://<staging-ref>.supabase.co`
   - Save the `anon` public key
   - Save the `service_role` key (keep secret)

### Step 2: Create Staging Clerk Application

1. **Log in to Clerk Dashboard**
   - Go to https://dashboard.clerk.com
   - Sign in with the organization account

2. **Create New Application**
   - Click "Add application"
   - Name: `MeJohnC Staging`
   - Select authentication methods (match production)

3. **Configure Application**
   - Go to "Domains" settings
   - Add allowed domain: `staging.mejohnc.org`
   - Add localhost for testing: `localhost:5173`

4. **Configure Social Connections** (if applicable)
   - Set up OAuth providers with staging/test credentials
   - Google, GitHub, etc. may have separate test app configs

5. **Create Test Users**
   - Create test accounts for QA:
     - `admin@staging.mejohnc.org` (admin role)
     - `editor@staging.mejohnc.org` (editor role)
     - `viewer@staging.mejohnc.org` (viewer role)

6. **Record Credentials**
   - Note the Publishable Key: `pk_test_staging_xxx`
   - Save the Secret Key: `sk_test_staging_xxx`

### Step 3: Configure Netlify Staging Site

1. **Create New Netlify Site**
   - Go to https://app.netlify.com
   - Click "Add new site" > "Import an existing project"
   - Connect to GitHub repository
   - Configure:
     - Branch to deploy: `staging`
     - Build command: `npm run build`
     - Publish directory: `dist`

2. **Configure Build Settings**
   - Set Node.js version: 20
   - Add environment variables (see Environment Variables section)

3. **Link Repository**
   ```bash
   # In a separate directory or use site linking
   netlify link --name mejohnc-staging
   ```

4. **Set Environment Variables**
   ```bash
   # Set all staging environment variables
   netlify env:set NODE_ENV "staging"
   netlify env:set VITE_CLERK_PUBLISHABLE_KEY "pk_test_staging_xxx"
   netlify env:set VITE_SUPABASE_URL "https://staging-xxx.supabase.co"
   netlify env:set VITE_SUPABASE_ANON_KEY "eyJstaging_xxx"
   netlify env:set VITE_SENTRY_DSN "https://staging-xxx@sentry.io/xxx"
   ```

5. **Configure Build Hooks** (optional)
   - Create build hook for automated staging deployments
   - Use in CI/CD for staging workflow triggers

### Step 4: DNS/Subdomain Setup (staging.mejohnc.org)

1. **Add Subdomain in DNS Provider**
   - Log in to domain registrar (e.g., Cloudflare, Namecheap)
   - Add CNAME record:
     - Name: `staging`
     - Target: `mejohnc-staging.netlify.app`
     - TTL: Auto or 300

2. **Configure Custom Domain in Netlify**
   - Go to Site Settings > Domain management
   - Click "Add custom domain"
   - Enter: `staging.mejohnc.org`
   - Follow verification steps

3. **Enable HTTPS**
   - Netlify automatically provisions SSL certificate
   - Verify HTTPS is working: `https://staging.mejohnc.org`

4. **Verify DNS Propagation**
   ```bash
   # Check DNS resolution
   dig staging.mejohnc.org

   # Or use online tool
   # https://www.whatsmydns.net/#CNAME/staging.mejohnc.org
   ```

---

## Data Management

### Production Data Sanitization for Staging

**IMPORTANT**: Never copy production data directly to staging without sanitization. PII and sensitive data must be anonymized.

**Sanitization Process:**

1. **Export Production Data**
   ```bash
   # Export from production Supabase
   npx supabase db dump --project-ref <prod-ref> -f prod_backup.sql
   ```

2. **Sanitize Data**
   ```sql
   -- Anonymize user data
   UPDATE contacts SET
     email = CONCAT('user_', id, '@example.com'),
     name = CONCAT('Test User ', id),
     phone = NULL,
     address = NULL;

   -- Anonymize any PII fields
   UPDATE users SET
     email = CONCAT('user_', id, '@staging.example.com'),
     first_name = 'Test',
     last_name = CONCAT('User ', id);

   -- Remove sensitive business data
   DELETE FROM api_keys;
   DELETE FROM webhooks;
   DELETE FROM audit_logs;

   -- Reset passwords/tokens
   DELETE FROM sessions;
   DELETE FROM refresh_tokens;
   ```

3. **Import to Staging**
   ```bash
   # Import sanitized data to staging
   psql <staging-connection-string> < sanitized_backup.sql
   ```

**Automated Sanitization Script:**
```typescript
// scripts/sanitize-for-staging.ts
import { createClient } from '@supabase/supabase-js';

async function sanitizeData() {
  const supabase = createClient(
    process.env.STAGING_SUPABASE_URL!,
    process.env.STAGING_SERVICE_ROLE_KEY!
  );

  // Anonymize contacts
  const { data: contacts } = await supabase.from('contacts').select('id');

  for (const contact of contacts || []) {
    await supabase
      .from('contacts')
      .update({
        email: `contact_${contact.id}@example.com`,
        name: `Test Contact ${contact.id}`,
        phone: null,
        notes: 'Sanitized for staging',
      })
      .eq('id', contact.id);
  }

  console.log('Data sanitization complete');
}

sanitizeData();
```

### Synthetic Test Data

For testing specific scenarios, use synthetic data generators:

**Test Data Factories:**
```typescript
// scripts/factories/contact-factory.ts
import { faker } from '@faker-js/faker';

export function createTestContact(overrides = {}) {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email({ provider: 'staging.example.com' }),
    company: faker.company.name(),
    phone: faker.phone.number(),
    status: faker.helpers.arrayElement(['active', 'inactive', 'lead']),
    created_at: faker.date.past(),
    ...overrides,
  };
}

export function createTestContacts(count: number) {
  return Array.from({ length: count }, () => createTestContact());
}
```

**Generating Test Data:**
```bash
# Generate 100 test contacts
npx ts-node scripts/generate-test-data.ts --contacts 100

# Generate full test dataset
npx ts-node scripts/generate-test-data.ts --full
```

**Test Data Categories:**

| Category | Count | Purpose |
|----------|-------|---------|
| Contacts | 100 | CRM testing, search, pagination |
| Projects | 20 | Project management features |
| Apps | 15 | App showcase testing |
| Blog Posts | 30 | Blog listing, search |
| Tasks | 50 | Task system testing |

---

## Access Controls

### Who Can Access Staging

| Role | Staging Access | Actions Allowed |
|------|---------------|-----------------|
| Admin | Full access | All operations, data management |
| Developer | Full access | All operations, debugging |
| QA/Tester | Full access | Testing, bug reporting |
| Designer | Read access | UI review, visual testing |
| Stakeholder | Read access | UAT, feature review |
| External | No access | N/A |

### Staging Authentication

**Clerk Staging Users:**
- Pre-created test accounts for each role
- Passwords stored in team password manager
- No personal accounts on staging

**Test Account Credentials:**
```
Admin:    admin@staging.mejohnc.org    / [stored in password manager]
Editor:   editor@staging.mejohnc.org   / [stored in password manager]
Viewer:   viewer@staging.mejohnc.org   / [stored in password manager]
```

### Access Request Process

1. Request access through team lead
2. Receive Clerk staging test account credentials
3. Receive Netlify team invitation (if deploy access needed)
4. Receive Supabase project invitation (if database access needed)

### Security Considerations

- Staging URL should not be indexed by search engines
- Add `X-Robots-Tag: noindex` header for staging
- Use HTTP Basic Auth for additional protection (optional)
- Rotate staging credentials quarterly
- Monitor staging access logs

**Netlify Header Configuration (`public/_headers`):**
```
# Staging environment
https://staging.mejohnc.org/*
  X-Robots-Tag: noindex, nofollow
```

---

## Staging vs Production Parity

### Parity Goals

Staging should mirror production as closely as possible to catch issues before they reach users.

### Infrastructure Parity

| Component | Production | Staging | Parity |
|-----------|------------|---------|--------|
| Hosting | Netlify | Netlify | Same platform |
| CDN | Netlify Edge | Netlify Edge | Same |
| Database | Supabase | Supabase | Same platform |
| Auth | Clerk | Clerk | Same platform |
| Region | us-west | us-west | Same region |
| Node.js | 20.x | 20.x | Same version |

### Configuration Parity

| Setting | Production | Staging |
|---------|------------|---------|
| Build command | `npm run build` | `npm run build` |
| Node version | 20 | 20 |
| Environment variables | Production values | Staging-specific values |
| Feature flags | Production defaults | May enable test flags |
| Rate limiting | Enabled | Enabled |
| Error tracking | Sentry (prod) | Sentry (staging) |

### Intentional Differences

| Aspect | Production | Staging | Reason |
|--------|------------|---------|--------|
| Data | Real user data | Synthetic/sanitized | Privacy |
| Scale | Full capacity | Reduced | Cost |
| Clerk mode | Live | Test | Free tier, safe testing |
| Ghost CMS | Live blog | Test blog | Content isolation |
| Analytics | Enabled | Disabled/separate | Data integrity |

### Maintaining Parity

**Regular Sync Checklist:**
- [ ] Database schema matches production
- [ ] RLS policies are identical
- [ ] Edge functions are deployed
- [ ] Environment variables are up to date
- [ ] Node.js version matches
- [ ] Build configuration matches

**Automated Parity Checks:**
```bash
# Compare database schemas
npx supabase db diff --project-ref <staging-ref> --schema public

# Compare environment variables
netlify env:list --json > staging-env.json
# Compare with production manually or via script
```

---

## Deployment Workflow

### Standard Flow: Dev -> Staging -> Production

```
Feature Development
        |
        v
   Local Testing
   (localhost:5173)
        |
        v
   Create PR -> main
        |
        v
   Deploy Preview
   (auto-generated URL)
        |
        v
   Code Review
   + CI Checks Pass
        |
        v
   Merge to main
        |
        v
   Auto-deploy to
   Production (mejohnc.org)
```

### Staging-First Flow (Recommended for Major Changes)

```
Feature Development
        |
        v
   Local Testing
   (localhost:5173)
        |
        v
   Create PR -> staging
        |
        v
   Code Review
   + CI Checks Pass
        |
        v
   Merge to staging
        |
        v
   Auto-deploy to
   Staging (staging.mejohnc.org)
        |
        v
   QA Testing
   + UAT Approval
        |
        v
   Create PR: staging -> main
        |
        v
   Final Review
        |
        v
   Merge to main
        |
        v
   Auto-deploy to
   Production (mejohnc.org)
```

### PR Previews

Every pull request automatically gets a preview deployment:

**Preview URL Format:**
- `deploy-preview-<PR#>--mejohnc.netlify.app`

**Using Previews:**
1. Create PR with changes
2. Wait for Netlify to build preview (typically 1-2 minutes)
3. Preview URL is posted as PR comment
4. Share URL with reviewers for visual testing
5. Preview updates automatically with new commits

**Preview Environment:**
- Uses `NODE_ENV=preview`
- May use development/staging backend (configure per needs)
- Isolated from production

### Deployment Commands

**Manual Staging Deployment:**
```bash
# Ensure on staging branch
git checkout staging
git pull origin staging

# Trigger manual deploy
netlify deploy --prod --site mejohnc-staging
```

**Promote Staging to Production:**
```bash
# Create PR from staging to main
gh pr create --base main --head staging \
  --title "Release: Promote staging to production" \
  --body "Staging has been tested and approved for production release."

# After approval and merge, production deploys automatically
```

### Rollback Procedures

**Staging Rollback:**
```bash
# Via Netlify CLI
netlify deploy:list --site mejohnc-staging
netlify deploy --prod --deploy-id=<previous-deploy-id> --site mejohnc-staging

# Or via Git
git checkout staging
git revert HEAD
git push origin staging
```

**Production Rollback:**
See [Deployment Runbook](../runbooks/deployment-runbook.md#rollback-procedures) for detailed production rollback procedures.

---

## Staging Environment Maintenance

### Regular Maintenance Tasks

**Weekly:**
- [ ] Review staging error logs (Sentry)
- [ ] Clear stale test data if needed
- [ ] Verify staging is accessible

**Monthly:**
- [ ] Sync database schema with production
- [ ] Update staging seed data
- [ ] Review and rotate test credentials
- [ ] Check for environment variable drift

**Quarterly:**
- [ ] Full staging environment audit
- [ ] Update Node.js version if needed
- [ ] Review staging costs
- [ ] Refresh synthetic test data

### Database Maintenance

**Reset Staging Database:**
```bash
# Complete reset (use with caution)
npx supabase db reset --project-ref <staging-ref>

# Re-run migrations
npx supabase db push --project-ref <staging-ref>

# Re-seed data
npx ts-node scripts/seed-staging.ts
```

**Sync Schema from Production:**
```bash
# Generate diff
npx supabase db diff --project-ref <prod-ref> --schema public > migration.sql

# Apply to staging
npx supabase db push --project-ref <staging-ref>
```

### Monitoring Staging

**Health Checks:**
```bash
# Basic availability check
curl -I https://staging.mejohnc.org

# API health check (if available)
curl https://staging.mejohnc.org/api/health
```

**Error Monitoring:**
- Sentry staging project receives staging errors
- Review staging errors separately from production
- Set up staging-specific alerts (less urgent than production)

### Troubleshooting Common Issues

**Issue: Staging site not updating after merge**
```bash
# Check Netlify build status
netlify status --site mejohnc-staging

# Trigger manual rebuild
netlify deploy --build --prod --site mejohnc-staging
```

**Issue: Database connection failing**
- Verify `VITE_SUPABASE_URL` is set correctly
- Check Supabase project status
- Verify IP allowlist (if configured)

**Issue: Authentication not working**
- Verify Clerk publishable key is for staging app
- Check allowed domains in Clerk dashboard
- Clear browser cookies and retry

---

## Cost Considerations

### Service Costs by Environment

| Service | Production Cost | Staging Cost | Notes |
|---------|----------------|--------------|-------|
| Netlify | Pro plan ($19/mo) | Free tier | Staging uses separate free site |
| Supabase | Free/Pro tier | Free tier | Free tier has sufficient limits |
| Clerk | Pay-as-you-go | Free tier | Development mode is free |
| Sentry | Team plan | Included | Same plan, separate project |
| Ghost CMS | Starter ($9/mo) | Free tier | Can use free Ghost(Pro) or self-host |
| DNS | Included | $0 | Subdomain on existing domain |

### Cost Optimization Strategies

1. **Use Free Tiers**: Staging workloads typically fit within free tier limits
2. **Shared Resources**: Use same Sentry team plan, same DNS provider
3. **On-Demand Scaling**: Don't over-provision staging resources
4. **Clean Up Unused Previews**: Netlify auto-cleans old deploy previews

### Monthly Cost Estimate

| Item | Cost |
|------|------|
| Netlify Staging Site | $0 (free tier) |
| Supabase Staging Project | $0 (free tier) |
| Clerk Staging Application | $0 (development mode) |
| Additional DNS records | $0 |
| **Total Staging Cost** | **$0/month** |

### Free Tier Limits to Monitor

| Service | Free Tier Limit | Typical Staging Usage |
|---------|-----------------|----------------------|
| Netlify | 300 build minutes/month | ~50-100 minutes |
| Netlify | 100GB bandwidth/month | ~1-5GB |
| Supabase | 500MB database | ~50-100MB |
| Supabase | 2GB bandwidth/month | ~100MB |
| Clerk | 10,000 MAU | ~5-10 users |

---

## Related Documentation

- [Deployment Runbook](../runbooks/deployment-runbook.md) - Detailed deployment procedures
- [Database Migrations](./database-migrations.md) - Database change management
- [Branch Protection](./branch-protection.md) - Branch protection rules
- [Secrets Management](../SECRETS_MANAGEMENT.md) - Environment variable management
- [Developer Onboarding](../DEVELOPER_ONBOARDING.md) - Getting started guide
- [ADR-0005: Deployment Architecture](../adr/0005-deployment-architecture.md) - Deployment decisions

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-20 | Initial documentation created | Claude Code |
