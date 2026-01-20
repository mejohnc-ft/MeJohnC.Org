# ADR-0005: Deployment Architecture

## Status

Accepted

**Date:** 2025-01-20

## Context

The application needs a deployment strategy that provides:

- Automatic deployments on code changes
- Preview deployments for pull requests
- Edge distribution for fast global performance
- Serverless functions for API endpoints
- SSL certificates and custom domain support
- Integration with GitHub for CI/CD
- Cost-effective for a personal project

## Decision

We chose **Netlify** as the deployment platform with the following architecture:

### Deployment Flow

```
GitHub (main branch)
        |
        v
    Netlify Build
        |
        ├── ESLint + TypeScript checks
        ├── Vite production build
        ├── Sitemap generation
        └── Bundle analysis
        |
        v
    Netlify CDN (Global Edge)
        |
        ├── Static assets (immutable cache)
        ├── HTML (no-cache for SPA routing)
        └── Edge Functions (rate limiting)
```

### Netlify Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"

# SPA routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Edge Functions
[[edge_functions]]
  function = "rate-limit"
  path = "/api/*"

# Context-specific settings
[context.production]
  environment = { NODE_ENV = "production" }

[context.deploy-preview]
  environment = { NODE_ENV = "preview" }
```

### Edge Functions

Rate limiting is implemented as a Netlify Edge Function:
- Runs at the edge before requests reach the origin
- In-memory store per edge location
- 60 requests per minute per IP for `/api/*` routes

### Static Asset Strategy

Defined in `public/_headers`:

| Path | Cache Policy | Rationale |
|------|--------------|-----------|
| `/assets/*` | `max-age=31536000, immutable` | Vite hashes filenames; safe to cache forever |
| `/*.png/jpg/svg/webp` | `max-age=86400` | Images change rarely |
| `/*.html` | `no-cache, no-store` | SPA needs fresh index.html for routing |
| `/sw.js` | `no-cache, no-store` | Service worker must be fresh |

### Environment Variables

Managed via Netlify dashboard and `netlify.toml`:
- `VITE_*` variables are embedded at build time
- Sensitive keys are stored as Netlify environment variables
- Different values for production, preview, and local development

### Code Splitting (Vite)

Bundle optimization via manual chunks:

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-framer': ['framer-motion'],
  'vendor-auth': ['@clerk/clerk-react'],
  'vendor-supabase': ['@supabase/supabase-js'],
  // ...
}
```

## Consequences

### Positive

- **Zero-config deployment**: Push to main triggers automatic deployment
- **Preview URLs**: Every PR gets a unique preview URL for testing
- **Global CDN**: Assets served from edge locations worldwide
- **Free tier**: Generous free tier covers personal project needs
- **Atomic deploys**: New versions are deployed atomically; no partial states
- **Instant rollbacks**: Previous deploys can be restored instantly

### Negative

- **Build time limits**: Free tier has 300 build minutes/month (sufficient for this project)
- **Function limits**: Edge functions have execution time limits
- **Vendor lock-in**: `netlify.toml` and Edge Functions are Netlify-specific

### Neutral

- Source maps are generated as `hidden` (available for Sentry but not in browser)
- Lighthouse CI plugin runs during builds to track performance

## CI/CD Integration

### GitHub Actions (Optional Enhancement)

While Netlify handles primary deployment, GitHub Actions can be added for:
- Running tests before merge
- Lighthouse performance audits
- Security scanning

### Branch Strategy

| Branch | Deployment |
|--------|------------|
| `main` | Production (mejohnc.org) |
| PR branches | Preview URLs |
| `feature/*` | Preview URLs |

## Alternatives Considered

### Alternative 1: Vercel

Vercel was considered as a competitor to Netlify:
- Very similar feature set
- Netlify's Edge Functions syntax was preferred
- Existing familiarity with Netlify

### Alternative 2: AWS S3 + CloudFront

Static hosting on AWS:
- More complex setup and configuration
- Requires managing multiple AWS services
- No built-in preview deployments
- Higher operational overhead

### Alternative 3: GitHub Pages

GitHub's built-in static hosting:
- No serverless functions
- No edge functions for rate limiting
- Limited configuration options
- No preview deployments

### Alternative 4: Cloudflare Pages

Cloudflare's Jamstack platform:
- Strong competitor with Workers for edge computing
- Netlify was chosen due to existing workflow familiarity
- Could be a future migration target

## Performance Optimizations

1. **Asset hashing**: Vite adds content hashes to filenames for cache busting
2. **Immutable caching**: Hashed assets cached for 1 year
3. **Brotli compression**: Netlify automatically compresses responses
4. **Tree shaking**: Unused code eliminated during build
5. **Code splitting**: Lazy loading for non-critical routes

## References

- [Netlify Documentation](https://docs.netlify.com)
- [Netlify Edge Functions](https://docs.netlify.com/edge-functions/overview/)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- `netlify.toml` - Netlify configuration
- `public/_headers` - HTTP headers configuration
- `vite.config.ts` - Build configuration
- `netlify/edge-functions/rate-limit.ts` - Rate limiting implementation
