# Troubleshooting Guide

This guide covers common issues and their solutions for MeJohnC.Org.

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Build and Development Issues](#build-and-development-issues)
3. [Deployment Issues](#deployment-issues)
4. [Authentication Issues](#authentication-issues)
5. [Database Issues](#database-issues)
6. [Performance Issues](#performance-issues)
7. [UI and Frontend Issues](#ui-and-frontend-issues)
8. [Third-Party Service Issues](#third-party-service-issues)
9. [Contact and Escalation](#contact-and-escalation)

---

## Quick Diagnostics

### Health Check Commands

```bash
# Check site is responding
curl -I https://mejohnc.org

# Check specific page
curl -s https://mejohnc.org | head -50

# Check sitemap
curl -s https://mejohnc.org/sitemap.xml | head -20

# Check Netlify status
netlify status

# Local development health
npm run dev -- --open
```

### Status Pages

| Service | Status URL |
|---------|------------|
| Netlify | netlifystatus.com |
| Supabase | status.supabase.com |
| Clerk | status.clerk.com |
| GitHub | githubstatus.com |

---

## Build and Development Issues

### Issue: `npm install` Fails

**Symptoms**: Dependency installation errors, package conflicts

**Solutions**:

1. **Clear npm cache**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version**
   ```bash
   node --version  # Should be 20.x
   # If wrong version, use nvm
   nvm use 20
   npm install
   ```

3. **Check for conflicting global packages**
   ```bash
   npm list -g --depth=0
   ```

### Issue: Build Fails with TypeScript Errors

**Symptoms**: Type errors during `npm run build`

**Solutions**:

1. **Run type check to see all errors**
   ```bash
   npm run typecheck
   ```

2. **Check for missing type definitions**
   ```bash
   npm install -D @types/missing-package
   ```

3. **Verify tsconfig settings**
   - Check `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

### Issue: Vite Dev Server Won't Start

**Symptoms**: Port already in use, server crash

**Solutions**:

1. **Kill process on port 5173**
   ```bash
   # macOS/Linux
   lsof -ti:5173 | xargs kill -9

   # Windows
   netstat -ano | findstr :5173
   taskkill /PID <pid> /F
   ```

2. **Use different port**
   ```bash
   npm run dev -- --port 3000
   ```

3. **Clear Vite cache**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### Issue: ESLint Errors Blocking Build

**Symptoms**: Lint errors preventing commit or build

**Solutions**:

1. **Auto-fix lint errors**
   ```bash
   npm run lint:fix
   ```

2. **Check specific files**
   ```bash
   npx eslint src/path/to/file.tsx --fix
   ```

3. **Temporarily bypass (not recommended)**
   ```bash
   # For commits only (will still fail CI)
   git commit --no-verify
   ```

---

## Deployment Issues

### Issue: Netlify Deploy Fails

**Symptoms**: Build failure in Netlify dashboard, deployment error

**Solutions**:

1. **Check build logs in Netlify dashboard**
   - Navigate to: Site > Deploys > Failed deploy > Logs

2. **Verify environment variables**
   - Check: Site Settings > Environment Variables
   - Ensure all required vars are set:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_CLERK_PUBLISHABLE_KEY`

3. **Test build locally with same env**
   ```bash
   export VITE_SUPABASE_URL="xxx"
   export VITE_SUPABASE_ANON_KEY="xxx"
   export VITE_CLERK_PUBLISHABLE_KEY="xxx"
   npm run build
   ```

4. **Clear Netlify build cache**
   - Deploy > Trigger deploy > Clear cache and deploy site

### Issue: Preview Deploy Not Working

**Symptoms**: PR preview URL shows error or old content

**Solutions**:

1. **Check preview deploy status in PR comments**

2. **Verify branch has been pushed**
   ```bash
   git push origin feature-branch
   ```

3. **Check Netlify build context**
   - Ensure `netlify.toml` has correct preview settings

### Issue: Deployment Succeeded but Site Shows Old Content

**Symptoms**: Changes not visible after successful deploy

**Solutions**:

1. **Clear browser cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

2. **Check CDN propagation**
   - Wait 2-5 minutes for CDN cache invalidation

3. **Verify correct deploy is published**
   ```bash
   netlify deploy:list
   # Ensure latest deploy has "Published" status
   ```

4. **Check for client-side caching**
   - Service worker may cache old assets
   - Clear site data in browser DevTools

---

## Authentication Issues

### Issue: Users Cannot Sign In

**Symptoms**: Sign-in button not working, redirect loops

**Solutions**:

1. **Check Clerk dashboard**
   - Verify application is active
   - Check for rate limiting or blocks

2. **Verify environment variable**
   ```bash
   # In browser console
   console.log(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
   ```

3. **Check allowed domains in Clerk**
   - Dashboard > Settings > Allowed Domains
   - Ensure `mejohnc.org` and `localhost:5173` are listed

4. **Clear auth cookies**
   - DevTools > Application > Cookies > Clear all

### Issue: Sign Out Not Working

**Symptoms**: User stays logged in after sign out

**Solutions**:

1. **Check for JavaScript errors in console**

2. **Manually clear session**
   ```javascript
   // In browser console
   window.Clerk.signOut()
   ```

3. **Clear all site data**
   - DevTools > Application > Storage > Clear site data

### Issue: Admin Access Not Working

**Symptoms**: Authenticated user cannot access admin features

**Solutions**:

1. **Verify user is in admin_users table**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM admin_users WHERE email = 'user@email.com';
   ```

2. **Add user to admin_users if missing**
   ```sql
   INSERT INTO admin_users (email) VALUES ('user@email.com');
   ```

3. **Check RLS policies**
   ```sql
   SELECT * FROM pg_policies WHERE policyname LIKE '%admin%';
   ```

4. **Verify Clerk JWT contains correct email**
   - Check Clerk dashboard for user's email
   - Ensure email matches exactly (case-sensitive)

---

## Database Issues

### Issue: "Failed to Fetch" Errors

**Symptoms**: Data not loading, network errors in console

**Solutions**:

1. **Check Supabase status**
   - Visit status.supabase.com

2. **Verify environment variables**
   ```bash
   # Check URL is correct
   echo $VITE_SUPABASE_URL

   # Test connection
   curl -I $VITE_SUPABASE_URL
   ```

3. **Check RLS policies allow access**
   ```sql
   -- Temporarily test without RLS (be careful!)
   SELECT * FROM apps LIMIT 1;
   ```

4. **Check for CORS issues**
   - Browser DevTools > Network > Check for CORS errors
   - Supabase handles CORS, but custom functions may not

### Issue: Database Query Timeout

**Symptoms**: Queries take too long, timeout errors

**Solutions**:

1. **Identify slow query**
   ```sql
   SELECT * FROM pg_stat_activity
   WHERE state = 'active'
   AND query NOT LIKE '%pg_stat_activity%';
   ```

2. **Check for missing indexes**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM apps WHERE slug = 'test-app';
   -- Look for "Seq Scan" which indicates missing index
   ```

3. **Add missing index**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
   ```

4. **Optimize query**
   - Select only needed columns
   - Add pagination
   - Use proper WHERE clauses

### Issue: RLS Policy Blocking Access

**Symptoms**: Empty results when data exists, permission denied

**Solutions**:

1. **Check which policies apply**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'affected_table';
   ```

2. **Test as different roles**
   ```sql
   -- Test as anon
   SET ROLE anon;
   SELECT * FROM apps;

   -- Test as authenticated
   SET ROLE authenticated;
   SELECT * FROM apps;

   -- Reset
   RESET ROLE;
   ```

3. **Debug is_admin() function**
   ```sql
   SELECT auth.jwt() ->> 'email' AS jwt_email;
   SELECT * FROM admin_users;
   SELECT is_admin();
   ```

---

## Performance Issues

### Issue: Slow Page Load

**Symptoms**: High load times, poor Lighthouse scores

**Solutions**:

1. **Run Lighthouse audit**
   ```bash
   npm run lighthouse
   ```

2. **Analyze bundle size**
   ```bash
   npm run analyze
   # Check dist/stats.html
   ```

3. **Check for large images**
   - Use optimized formats (WebP)
   - Implement lazy loading
   - Use appropriate sizes

4. **Enable code splitting**
   - Ensure routes use `React.lazy()`
   - Check `vite.config.ts` for chunk settings

### Issue: Slow Database Queries

**Symptoms**: API responses slow, high latency

**Solutions**:

1. **Identify slow queries in Supabase logs**
   - Dashboard > Logs > Postgres

2. **Check query execution plan**
   ```sql
   EXPLAIN ANALYZE <your query>;
   ```

3. **Add appropriate indexes**
   ```sql
   -- Check existing indexes
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename = 'your_table';

   -- Add index
   CREATE INDEX idx_column ON your_table(column);
   ```

4. **Optimize data access patterns**
   - Reduce SELECT *
   - Add pagination
   - Use appropriate batch sizes

### Issue: Memory Leaks in Development

**Symptoms**: Browser tab using excessive memory, crashes

**Solutions**:

1. **Check for React useEffect cleanup**
   ```typescript
   useEffect(() => {
     const subscription = subscribe();
     return () => subscription.unsubscribe(); // Cleanup!
   }, []);
   ```

2. **Check for Supabase subscription leaks**
   ```typescript
   useEffect(() => {
     const channel = supabase.channel('room')
       .subscribe();
     return () => supabase.removeChannel(channel);
   }, []);
   ```

3. **Use React DevTools Profiler**
   - Check for unnecessary re-renders
   - Identify memory-heavy components

---

## UI and Frontend Issues

### Issue: Styles Not Loading

**Symptoms**: Unstyled content, missing Tailwind classes

**Solutions**:

1. **Check Tailwind configuration**
   - Verify `tailwind.config.js` includes correct content paths
   ```javascript
   content: [
     "./index.html",
     "./src/**/*.{js,ts,jsx,tsx}",
   ]
   ```

2. **Restart dev server**
   ```bash
   # Kill and restart
   npm run dev
   ```

3. **Check for CSS import**
   - Verify `main.tsx` imports global CSS

4. **Clear PostCSS cache**
   ```bash
   rm -rf node_modules/.cache
   npm run dev
   ```

### Issue: Component Not Rendering

**Symptoms**: Blank area where component should be

**Solutions**:

1. **Check browser console for errors**

2. **Verify component is exported correctly**
   ```typescript
   // Named export
   export function MyComponent() {}
   // or
   export { MyComponent }

   // Default export
   export default MyComponent
   ```

3. **Check for conditional rendering issues**
   ```typescript
   // This returns undefined (renders nothing)
   {condition && <Component />}

   // Ensure condition is boolean
   {Boolean(condition) && <Component />}
   ```

4. **Add error boundary**
   ```typescript
   <ErrorBoundary fallback={<p>Error</p>}>
     <Component />
   </ErrorBoundary>
   ```

### Issue: Hydration Mismatch

**Symptoms**: Console warning about hydration, flickering

**Solutions**:

1. **Check for browser-only code**
   ```typescript
   // Wrong
   const width = window.innerWidth;

   // Correct
   const [width, setWidth] = useState(0);
   useEffect(() => {
     setWidth(window.innerWidth);
   }, []);
   ```

2. **Check for date/time rendering**
   - Use consistent timezone
   - Format dates on client side only

3. **Check for random values**
   - Move randomization to useEffect

---

## Third-Party Service Issues

### Issue: Ghost CMS Not Loading Blog Posts

**Symptoms**: Blog section empty, no posts

**Solutions**:

1. **Check Ghost API credentials**
   ```bash
   echo $VITE_GHOST_URL
   echo $VITE_GHOST_CONTENT_API_KEY
   ```

2. **Test Ghost API directly**
   ```bash
   curl "$VITE_GHOST_URL/ghost/api/content/posts/?key=$VITE_GHOST_CONTENT_API_KEY"
   ```

3. **Check Ghost dashboard**
   - Verify posts are published
   - Check API key permissions

### Issue: Sentry Not Capturing Errors

**Symptoms**: No errors in Sentry dashboard

**Solutions**:

1. **Verify DSN is correct**
   ```bash
   echo $VITE_SENTRY_DSN
   ```

2. **Check Sentry initialization**
   - Verify `Sentry.init()` is called in main.tsx

3. **Test with manual error**
   ```javascript
   // In browser console
   Sentry.captureException(new Error('Test error'));
   ```

4. **Check Sentry project settings**
   - Verify project is active
   - Check rate limits

### Issue: Edge Functions Not Working

**Symptoms**: Rate limiting not working, function errors

**Solutions**:

1. **Check Netlify Edge Function logs**
   ```bash
   netlify logs:function rate-limit
   ```

2. **Test function locally**
   ```bash
   netlify dev
   # Test: curl http://localhost:8888/api/test
   ```

3. **Verify function deployment**
   - Check netlify.toml configuration
   - Verify function file exists in `netlify/edge-functions/`

---

## Contact and Escalation

### Getting Help

1. **Check this troubleshooting guide first**
2. **Search existing GitHub issues**
3. **Ask in team Slack channel**
4. **Create new GitHub issue with:**
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots/logs

### Primary Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| Site Owner | [NAME] | [EMAIL] | [HOURS] |
| DevOps Lead | [NAME] | [EMAIL] | [HOURS] |
| Frontend Lead | [NAME] | [EMAIL] | [HOURS] |

### Escalation Path

For issues you cannot resolve:

1. **Level 1**: Post in #mejohnc-dev Slack channel
2. **Level 2**: Create GitHub issue with `needs-help` label
3. **Level 3**: Contact DevOps lead directly

---

## Related Documentation

- [deployment-runbook.md](./deployment-runbook.md) - Deployment issues
- [database-runbook.md](./database-runbook.md) - Database issues
- [incident-response.md](./incident-response.md) - Critical issues
- [DEVELOPER_ONBOARDING.md](../DEVELOPER_ONBOARDING.md) - Setup issues
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) - Credential issues
