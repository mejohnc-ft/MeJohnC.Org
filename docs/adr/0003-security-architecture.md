# ADR-0003: Security Architecture

## Status

Accepted

**Date:** 2025-01-20

## Context

As a portfolio and admin platform handling user authentication and database operations, the application requires comprehensive security measures to protect against common web vulnerabilities:

- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Clickjacking
- Data exposure through API responses
- Unauthorized access to admin functionality
- Rate limiting to prevent abuse

The security architecture must balance protection with usability and developer experience.

## Decision

We implemented a defense-in-depth security architecture with multiple layers:

### 1. HTTP Security Headers (Netlify `_headers`)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: accelerometer=(), camera=(), geolocation=(), ...
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

### 2. Content Security Policy (CSP)

Carefully configured CSP allowing only trusted sources:
- Scripts: Self, inline (for Tailwind), Clerk, Cloudflare challenges
- Styles: Self, inline, Google Fonts
- Connections: Self, Supabase, Clerk, GitHub API, Ghost, Sentry
- Frames: Cloudflare challenges, Clerk (for auth flows)
- Frame ancestors: None (prevents embedding)

### 3. CSRF Protection (`src/lib/csrf.ts`)

- Token-based protection using `X-CSRF-Token` header
- Custom header requirement (`X-Requested-With: XMLHttpRequest`)
- Origin/Referer validation for state-changing requests
- Constant-time token comparison to prevent timing attacks

### 4. Role-Based Access Control (`src/lib/rbac.ts`)

```typescript
type Role = 'admin' | 'editor' | 'author' | 'viewer' | 'guest';
type Action = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'manage';

// Hierarchical permissions by role
// Route-level access control
// Permission guards for UI components
```

### 5. Database Row Level Security (Supabase RLS)

- All tables have RLS enabled
- Public read policies for published content
- Admin-only write policies verified via JWT
- `is_admin()` function checks email against `admin_users` table

### 6. Rate Limiting (Netlify Edge Function)

```typescript
// 60 requests per minute per IP for API routes
const WINDOW_MS = 60000;
const MAX_REQUESTS = 60;
```

### 7. Structured Logging with Correlation IDs (`src/lib/logger.ts`)

- Request tracing across operations
- Sentry integration for error tracking
- No sensitive data in logs

### 8. Input Validation (Zod Schemas in `src/lib/schemas.ts`)

- All user inputs validated with Zod schemas
- DOMPurify for HTML sanitization
- Type-safe validation at runtime

## Consequences

### Positive

- **Defense in depth**: Multiple security layers provide redundancy
- **OWASP compliance**: Addresses OWASP Top 10 vulnerabilities
- **Audit trail**: Structured logging enables security monitoring
- **Least privilege**: RBAC ensures users only access what they need
- **Zero-trust database**: RLS enforces security at the data layer

### Negative

- **Configuration complexity**: CSP and security headers require careful tuning
- **Development friction**: Strict CSP may block legitimate resources during development
- **Performance overhead**: CSRF token generation and validation add minimal latency

### Neutral

- Security headers are managed in Netlify's `_headers` file, not application code
- Rate limiting is per-edge-location (Netlify's distributed architecture)

## Security Checklist

| Control | Implementation |
|---------|---------------|
| HTTPS | Enforced via HSTS header |
| XSS | CSP + DOMPurify + X-XSS-Protection |
| CSRF | Token + Origin validation + Custom header |
| Clickjacking | X-Frame-Options: DENY |
| Auth | Clerk (JWT) + Supabase RLS |
| Authorization | RBAC system + RLS policies |
| Rate Limiting | Netlify Edge Function |
| Input Validation | Zod schemas |
| Error Handling | Sentry + structured logs |
| Secrets | Environment variables only |

## Alternatives Considered

### Alternative 1: Server-Side Sessions

Traditional session-based auth with cookies:
- Would require a backend server
- Clerk handles session management more securely
- JWT approach works better with Supabase RLS

### Alternative 2: WAF (Web Application Firewall)

Using Cloudflare or AWS WAF:
- Adds cost and complexity
- Current security measures are sufficient for the threat model
- Can be added later if needed

### Alternative 3: Helmet.js for Headers

Using Helmet.js middleware:
- Requires a Node.js backend
- Netlify's `_headers` file is simpler for static/SPA deployments

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- `public/_headers` - Security headers configuration
- `src/lib/csrf.ts` - CSRF protection utilities
- `src/lib/rbac.ts` - Role-based access control
- `src/lib/logger.ts` - Structured logging
- `netlify/edge-functions/rate-limit.ts` - Rate limiting
