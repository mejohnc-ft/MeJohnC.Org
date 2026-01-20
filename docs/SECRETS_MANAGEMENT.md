# Secrets Management Guide

This document outlines best practices for managing secrets in MeJohnC.Org.

## Current Architecture

### Environment Variables

Secrets are currently managed through environment variables:

| Environment | Storage |
|-------------|---------|
| Local Development | `.env` file (git-ignored) |
| Netlify (Production) | Netlify Environment Variables |
| Supabase Functions | Supabase Secrets |
| GitHub Actions | GitHub Secrets |

### Required Secrets

```bash
# Authentication (Clerk)
VITE_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# Database (Supabase)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Blog (Ghost CMS)
VITE_GHOST_URL=https://xxx.ghost.io
VITE_GHOST_CONTENT_API_KEY=xxx

# Monitoring (Sentry)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Email (optional)
RESEND_API_KEY=re_xxx
SENDGRID_API_KEY=SG.xxx

# AI (optional)
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Security Best Practices

### 1. Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
```

### 2. Use Different Keys Per Environment

| Secret | Development | Staging | Production |
|--------|-------------|---------|------------|
| Clerk | Test keys | Test keys | Live keys |
| Supabase | Dev project | Staging project | Prod project |
| Sentry | Dev DSN | Staging DSN | Prod DSN |

### 3. Rotate Keys Regularly

- API keys: Every 90 days
- Service keys: Every 180 days
- After any suspected compromise: Immediately

### 4. Principle of Least Privilege

- Use `anon` keys for client-side where possible
- Reserve `service_role` keys for server-side only
- Create scoped API tokens when available

## Recommended: Secrets Manager Migration

For enhanced security, consider migrating to a dedicated secrets manager:

### Option 1: Doppler (Recommended)

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Login and setup
doppler login
doppler setup

# Run with secrets injected
doppler run -- npm run dev
```

**Doppler Configuration:**

```yaml
# doppler.yaml
setup:
  project: mejohnc-org
  config: dev

environments:
  - dev
  - staging
  - prod
```

### Option 2: HashiCorp Vault

```bash
# Access secrets
vault kv get secret/mejohnc/production

# Inject into environment
eval $(vault kv get -format=json secret/mejohnc/production | jq -r '.data.data | to_entries | .[] | "export \(.key)=\(.value)"')
```

### Option 3: AWS Secrets Manager

```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-west-2" });

async function getSecret(secretName) {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString);
}
```

### Option 4: 1Password (for Teams)

```bash
# Install 1Password CLI
brew install 1password-cli

# Inject secrets
op run --env-file=.env.1password -- npm run dev
```

## Netlify Configuration

### Setting Environment Variables

```bash
# Via Netlify CLI
netlify env:set CLERK_SECRET_KEY "sk_xxx"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJxxx"

# Or via Netlify Dashboard:
# Site Settings > Environment Variables
```

### Context-Specific Variables

```toml
# netlify.toml
[context.production.environment]
  NODE_ENV = "production"

[context.deploy-preview.environment]
  NODE_ENV = "preview"

[context.branch-deploy.environment]
  NODE_ENV = "staging"
```

## Supabase Edge Functions

### Setting Secrets

```bash
# Via Supabase CLI
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
supabase secrets set RESEND_API_KEY=re_xxx

# List secrets
supabase secrets list
```

### Accessing in Functions

```typescript
// In edge function
Deno.env.get('ANTHROPIC_API_KEY')
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  // Auto-injected
```

## GitHub Actions

### Setting Repository Secrets

1. Go to Repository Settings > Secrets and variables > Actions
2. Add secrets:
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_REF`

### Using in Workflows

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        run: netlify deploy --prod
```

## Audit and Monitoring

### Secret Access Logging

1. **Netlify**: Deploy logs show env var access
2. **Supabase**: Edge function logs
3. **GitHub**: Actions audit log

### Alerts to Configure

- Failed authentication attempts
- Unusual API key usage patterns
- Secret rotation reminders

## Incident Response

### If a Secret is Compromised

1. **Immediately rotate** the compromised secret
2. **Review access logs** for unauthorized usage
3. **Update all environments** with new secrets
4. **Notify stakeholders** if user data may be affected
5. **Document the incident** for post-mortem

### Secret Rotation Checklist

```markdown
- [ ] Generate new secret in provider dashboard
- [ ] Update local .env file
- [ ] Update Netlify environment variables
- [ ] Update Supabase secrets (if applicable)
- [ ] Update GitHub secrets (if applicable)
- [ ] Verify all deployments work
- [ ] Revoke old secret
- [ ] Document rotation date
```

## Resources

- [Doppler Documentation](https://docs.doppler.com/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
