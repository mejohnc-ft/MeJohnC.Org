/**
 * Shared CORS origin for all edge functions.
 *
 * Set ALLOWED_ORIGIN env var to override (e.g., "http://localhost:5173" for dev).
 * Defaults to production domain.
 */
export const CORS_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://mejohnc.org'
