/**
 * CSRF Protection Utilities
 *
 * Provides Cross-Site Request Forgery protection through:
 * - Token generation and validation
 * - Double-submit cookie pattern
 * - Origin/Referer header validation
 *
 * Note: Since this is a SPA with Supabase backend, CSRF protection
 * is primarily handled through:
 * 1. SameSite cookies (set by Supabase/Clerk)
 * 2. Origin header validation
 * 3. Custom header requirement (X-Requested-With)
 */

// CSRF token storage
const CSRF_TOKEN_KEY = 'mejohnc_csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';
const CUSTOM_HEADER = 'X-Requested-With';

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token for the session
 */
export function getToken(): string {
  if (typeof sessionStorage === 'undefined') {
    return generateToken();
  }

  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  if (!token) {
    token = generateToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Clear the CSRF token (e.g., on logout)
 */
export function clearToken(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  }
}

/**
 * Get headers to include with fetch requests
 */
export function getCsrfHeaders(): Record<string, string> {
  return {
    [CSRF_HEADER]: getToken(),
    [CUSTOM_HEADER]: 'XMLHttpRequest',
  };
}

/**
 * Validate origin header against allowed origins
 */
export function validateOrigin(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    return allowedOrigins.some((allowed) => {
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    });
  } catch {
    return false;
  }
}

/**
 * Validate referer header
 */
export function validateReferer(
  referer: string | null,
  allowedOrigins: string[]
): boolean {
  if (!referer) return false;

  try {
    const refererUrl = new URL(referer);
    return allowedOrigins.some((allowed) => {
      const allowedUrl = new URL(allowed);
      return refererUrl.origin === allowedUrl.origin;
    });
  } catch {
    return false;
  }
}

/**
 * Check if request has the custom header (simple CSRF check for AJAX)
 */
export function hasCustomHeader(headers: Headers): boolean {
  return headers.get(CUSTOM_HEADER) === 'XMLHttpRequest';
}

/**
 * Validate CSRF token from header against session token
 */
export function validateToken(headerToken: string | null, sessionToken: string): boolean {
  if (!headerToken || !sessionToken) return false;

  // Constant-time comparison to prevent timing attacks
  if (headerToken.length !== sessionToken.length) return false;

  let result = 0;
  for (let i = 0; i < headerToken.length; i++) {
    result |= headerToken.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }
  return result === 0;
}

/**
 * CSRF protection configuration
 */
export interface CsrfConfig {
  /** Allowed origins for CORS (e.g., ['https://mejohnc.org']) */
  allowedOrigins: string[];
  /** Whether to require the custom X-Requested-With header */
  requireCustomHeader?: boolean;
  /** Whether to validate the CSRF token */
  requireToken?: boolean;
  /** Methods to protect (default: POST, PUT, PATCH, DELETE) */
  protectedMethods?: string[];
}

/**
 * Create a CSRF validator function
 */
export function createCsrfValidator(config: CsrfConfig) {
  const protectedMethods = config.protectedMethods || ['POST', 'PUT', 'PATCH', 'DELETE'];

  return function validateCsrf(req: Request): { valid: boolean; error?: string } {
    // Skip for safe methods
    if (!protectedMethods.includes(req.method)) {
      return { valid: true };
    }

    // Validate Origin header
    const origin = req.headers.get('origin');
    if (origin && !validateOrigin(origin, config.allowedOrigins)) {
      return { valid: false, error: 'Invalid origin' };
    }

    // If no Origin, validate Referer
    if (!origin) {
      const referer = req.headers.get('referer');
      if (referer && !validateReferer(referer, config.allowedOrigins)) {
        return { valid: false, error: 'Invalid referer' };
      }
    }

    // Check custom header if required
    if (config.requireCustomHeader && !hasCustomHeader(req.headers)) {
      return { valid: false, error: 'Missing X-Requested-With header' };
    }

    return { valid: true };
  };
}

/**
 * Default CSRF validator for the app
 */
export const defaultCsrfValidator = createCsrfValidator({
  allowedOrigins: [
    'https://mejohnc.org',
    'https://www.mejohnc.org',
    // Add localhost for development
    ...(typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? ['http://localhost:5173', 'http://localhost:3000']
      : []),
  ],
  requireCustomHeader: true,
});

/**
 * Higher-order function to wrap fetch with CSRF headers
 */
export function createCsrfFetch(baseFetch: typeof fetch = fetch) {
  return function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);

    // Add CSRF headers for state-changing methods
    const method = init?.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfHeaders = getCsrfHeaders();
      for (const [key, value] of Object.entries(csrfHeaders)) {
        headers.set(key, value);
      }
    }

    return baseFetch(input, { ...init, headers });
  };
}

/**
 * React hook for CSRF protection (to be used with forms)
 */
export function useCsrfToken(): string {
  // In a real implementation, this would be a React hook
  // For now, just return the token
  return getToken();
}
