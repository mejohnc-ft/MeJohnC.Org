# ADR-0002: Authentication with Clerk and Supabase Integration

## Status

Accepted

**Date:** 2025-01-20

## Context

The application requires authentication for the admin dashboard while keeping the public portfolio pages accessible to all visitors. Key requirements include:

- Secure authentication for admin users
- Integration with Supabase Row Level Security (RLS) for database access control
- Social login options for convenience
- Session management across browser tabs
- Protection against common auth vulnerabilities (CSRF, session fixation, etc.)

The challenge was integrating a third-party auth provider (Clerk) with Supabase's RLS policies, which expect JWT tokens with specific claims.

## Decision

We chose **Clerk** as the authentication provider with custom JWT integration for Supabase:

### Architecture

1. **Clerk handles all authentication**:
   - User registration, login, and session management
   - Social login providers (Google, GitHub, etc.)
   - MFA and security features
   - Session tokens and refresh

2. **JWT Template for Supabase**:
   - Clerk generates a custom JWT with a "supabase" template
   - The JWT includes the user's email in the payload
   - This token is passed to Supabase for RLS verification

3. **Supabase RLS Integration**:
   - An `is_admin()` function checks the JWT email against an `admin_users` table
   - RLS policies use this function to grant admin access
   - Public policies allow anonymous read access to published content

### Implementation Details

```typescript
// Clerk JWT Template (configured in Clerk Dashboard)
{
  "email": "{{user.primary_email_address}}"
}

// Supabase client with Clerk token
const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => {
    const token = await session.getToken({ template: 'supabase' });
    return token;
  },
});
```

```sql
-- Supabase is_admin() function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Consequences

### Positive

- **Separation of concerns**: Clerk handles auth complexity; Supabase focuses on data
- **Enterprise-grade security**: Clerk provides MFA, session management, and security monitoring
- **Flexible RLS**: Email-based admin verification allows easy admin management via database
- **No password storage**: Credentials are managed by Clerk, reducing security burden
- **Rich auth UI**: Clerk provides pre-built, customizable auth components

### Negative

- **Two services**: Requires maintaining accounts with both Clerk and Supabase
- **Token coordination**: JWT template must be configured correctly in Clerk
- **Cost**: Clerk has usage-based pricing (free tier is generous for small projects)
- **Vendor lock-in**: Auth logic is tied to Clerk's JWT structure

### Neutral

- Admin users must be added to both Clerk and the `admin_users` table
- Token refresh is handled by Clerk's SDK automatically

## Alternatives Considered

### Alternative 1: Supabase Auth Only

Using Supabase's built-in authentication:
- Simpler architecture with fewer services
- However, Clerk provides better auth UI and more auth provider options
- Supabase Auth's React SDK is less mature than Clerk's

### Alternative 2: Auth0

Auth0 was considered as an alternative to Clerk:
- More complex configuration and higher learning curve
- Higher cost for similar features
- Clerk's React SDK provides better developer experience

### Alternative 3: Custom JWT Validation in Edge Functions

Validating Clerk JWTs in Supabase Edge Functions instead of RLS:
- Would require custom middleware for every endpoint
- RLS provides more consistent security guarantees
- Increases complexity without significant benefits

## References

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Supabase Integration Guide](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- `src/lib/auth.tsx` - Auth context provider
- `src/lib/supabase.ts` - Supabase client with Clerk integration
- `supabase/schema.sql` - RLS policies and is_admin() function
