/**
 * Platform Auth Adapter
 *
 * Adapter for CentrexAI platform integration.
 * Validates platform JWTs and extracts user identity from the platform context.
 *
 * Token sources (checked in order):
 * 1. URL query parameter `?token=` (for initial redirect from platform)
 * 2. Cookie `platform_token` (for persistence across page refreshes)
 *
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { AuthAdapter, AuthContextType, AuthUser } from './types';

// ============================================
// Configuration
// ============================================

/**
 * Configuration for platform adapter
 */
export interface PlatformAdapterConfig {
  /** Platform API URL for token validation */
  apiUrl: string;
  /** URL to redirect to on logout */
  logoutUrl?: string;
  /** URL for refreshing tokens */
  tokenRefreshUrl?: string;
  /** Cookie name for storing token (default: platform_token) */
  tokenCookieName?: string;
  /** Buffer time in seconds before expiration to trigger refresh (default: 300 = 5 min) */
  refreshBufferSeconds?: number;
}

// ============================================
// JWT Types
// ============================================

/**
 * Standard JWT payload claims
 */
interface JwtPayload {
  /** Subject - typically user ID */
  sub: string;
  /** Email address */
  email?: string;
  /** Full name */
  name?: string;
  /** First name */
  given_name?: string;
  /** Last name */
  family_name?: string;
  /** Profile picture URL */
  picture?: string;
  /** Expiration time (Unix timestamp) */
  exp?: number;
  /** Issued at time (Unix timestamp) */
  iat?: number;
  /** Additional custom claims */
  [key: string]: unknown;
}

// ============================================
// JWT Utilities
// ============================================

/**
 * Decode JWT payload without verification
 * Used for client-side claim extraction (validation done server-side)
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[PlatformAdapter] Invalid JWT format');
      return null;
    }

    // Base64url decode the payload
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JwtPayload;
  } catch (error) {
    console.error('[PlatformAdapter] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired (with optional buffer)
 */
function isTokenExpired(payload: JwtPayload, bufferSeconds = 0): boolean {
  if (!payload.exp) {
    // No expiration claim - treat as not expired
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp - bufferSeconds <= now;
}

/**
 * Extract AuthUser from JWT payload
 */
function extractUserFromPayload(payload: JwtPayload): AuthUser {
  const firstName = payload.given_name ?? null;
  const lastName = payload.family_name ?? null;

  // Build full name from parts or use name claim
  let fullName: string | null = payload.name ?? null;
  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(' ');
  }

  return {
    id: payload.sub,
    email: payload.email ?? null,
    firstName,
    lastName,
    fullName,
    imageUrl: payload.picture ?? null,
    metadata: {
      exp: payload.exp,
      iat: payload.iat,
    },
  };
}

// ============================================
// Token Storage Utilities
// ============================================

/**
 * Get token from URL query parameter
 */
function getTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

/**
 * Get token from cookie
 */
function getTokenFromCookie(cookieName: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Set token in cookie
 */
function setTokenCookie(cookieName: string, token: string, expiresAt?: number): void {
  if (typeof document === 'undefined') return;

  let cookie = `${cookieName}=${encodeURIComponent(token)}; path=/; SameSite=Strict`;

  if (expiresAt) {
    const expires = new Date(expiresAt * 1000);
    cookie += `; expires=${expires.toUTCString()}`;
  }

  // Add Secure flag in production
  if (window.location.protocol === 'https:') {
    cookie += '; Secure';
  }

  document.cookie = cookie;
}

/**
 * Clear token cookie
 */
function clearTokenCookie(cookieName: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Remove token from URL without page reload
 */
function clearTokenFromUrl(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (url.searchParams.has('token')) {
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.toString());
  }
}

// ============================================
// Platform Auth Context
// ============================================

const PlatformAuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Platform Auth Adapter Factory
// ============================================

/**
 * Create a platform auth adapter
 */
export function createPlatformAdapter(config: PlatformAdapterConfig): AuthAdapter {
  const {
    apiUrl,
    logoutUrl,
    tokenRefreshUrl,
    tokenCookieName = 'platform_token',
    refreshBufferSeconds = 300,
  } = config;

  /**
   * Provider component for platform mode
   */
  function PlatformAuthProvider({ children }: { children: ReactNode }) {
    // Store token in ref to avoid re-renders on token updates
    const tokenRef = useRef<string | null>(null);
    const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [authState, setAuthState] = useState<AuthContextType>({
      user: null,
      isSignedIn: false,
      isLoaded: false,
      signOut: async () => {
        // Clear token
        tokenRef.current = null;
        clearTokenCookie(tokenCookieName);

        // Update state
        setAuthState((prev) => ({ ...prev, user: null, isSignedIn: false }));

        // Redirect to platform logout if URL provided
        if (logoutUrl) {
          window.location.href = logoutUrl;
        }
      },
      getToken: async () => {
        return tokenRef.current;
      },
    });

    /**
     * Schedule token refresh before expiration
     * Uses a ref for the refresh function to break circular dependency
     */
    const refreshTokenRef = useRef<() => Promise<void>>();

    const scheduleTokenRefresh = useCallback((payload: JwtPayload) => {
      // Clear existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (!payload.exp || !tokenRefreshUrl) return;

      const now = Math.floor(Date.now() / 1000);
      const refreshAt = payload.exp - refreshBufferSeconds;
      const delayMs = Math.max(0, (refreshAt - now) * 1000);

      if (delayMs > 0) {
        console.log(`[PlatformAdapter] Scheduling token refresh in ${Math.round(delayMs / 1000)}s`);
        refreshTimeoutRef.current = setTimeout(() => {
          refreshTokenRef.current?.();
        }, delayMs);
      }
    }, []);

    /**
     * Refresh the token before expiration
     */
    const refreshToken = useCallback(async () => {
      if (!tokenRefreshUrl || !tokenRef.current) return;

      try {
        const response = await fetch(tokenRefreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenRef.current}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.status}`);
        }

        const data = await response.json();
        const newToken = data.token || data.access_token;

        if (newToken) {
          tokenRef.current = newToken;
          const payload = decodeJwtPayload(newToken);
          if (payload) {
            setTokenCookie(tokenCookieName, newToken, payload.exp);
            scheduleTokenRefresh(payload);
          }
        }
      } catch (error) {
        console.error('[PlatformAdapter] Token refresh failed:', error);
        // Clear auth on refresh failure
        tokenRef.current = null;
        clearTokenCookie(tokenCookieName);
        setAuthState((prev) => ({
          ...prev,
          user: null,
          isSignedIn: false,
        }));
      }
    }, [scheduleTokenRefresh]);

    // Keep refreshTokenRef in sync
    refreshTokenRef.current = refreshToken;

    /**
     * Validate token with platform API
     */
    const validateToken = useCallback(
      async (token: string): Promise<AuthUser | null> => {
        // First decode to check expiration client-side
        const payload = decodeJwtPayload(token);
        if (!payload) {
          return null;
        }

        if (isTokenExpired(payload)) {
          console.warn('[PlatformAdapter] Token is expired');
          return null;
        }

        // Validate with platform API
        try {
          const response = await fetch(`${apiUrl}/auth/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.warn(`[PlatformAdapter] Token validation failed: ${response.status}`);
            return null;
          }

          // Token is valid - extract user from payload
          const user = extractUserFromPayload(payload);

          // Schedule refresh
          scheduleTokenRefresh(payload);

          return user;
        } catch (error) {
          console.error('[PlatformAdapter] Token validation error:', error);
          return null;
        }
      },
      [scheduleTokenRefresh]
    );

    // Initialize auth state
    useEffect(() => {
      const initAuth = async () => {
        // Check for token in URL first (takes priority)
        let token = getTokenFromUrl();
        let tokenSource = 'url';

        // Fall back to cookie
        if (!token) {
          token = getTokenFromCookie(tokenCookieName);
          tokenSource = 'cookie';
        }

        if (!token) {
          console.log('[PlatformAdapter] No token found');
          setAuthState((prev) => ({
            ...prev,
            isLoaded: true,
            isSignedIn: false,
            user: null,
          }));
          return;
        }

        console.log(`[PlatformAdapter] Found token from ${tokenSource}`);

        // Validate the token
        const user = await validateToken(token);

        if (user) {
          // Store token
          tokenRef.current = token;

          // If token came from URL, store in cookie and clean URL
          if (tokenSource === 'url') {
            const payload = decodeJwtPayload(token);
            setTokenCookie(tokenCookieName, token, payload?.exp);
            clearTokenFromUrl();
          }

          setAuthState((prev) => ({
            ...prev,
            isLoaded: true,
            isSignedIn: true,
            user,
          }));
        } else {
          // Invalid token - clear it
          clearTokenCookie(tokenCookieName);
          if (tokenSource === 'url') {
            clearTokenFromUrl();
          }

          setAuthState((prev) => ({
            ...prev,
            isLoaded: true,
            isSignedIn: false,
            user: null,
          }));
        }
      };

      initAuth();

      // Cleanup refresh timeout on unmount
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }, [validateToken]);

    return (
      <PlatformAuthContext.Provider value={authState}>{children}</PlatformAuthContext.Provider>
    );
  }

  /**
   * Hook to access auth state
   */
  function useAuth(): AuthContextType {
    const context = useContext(PlatformAuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within PlatformAuthProvider');
    }
    return context;
  }

  /**
   * Renders children only when user is signed in
   */
  function SignedIn({ children }: { children: ReactNode }) {
    const { isSignedIn, isLoaded } = useAuth();
    if (!isLoaded || !isSignedIn) return null;
    return <>{children}</>;
  }

  /**
   * Renders children only when user is signed out
   */
  function SignedOut({ children }: { children: ReactNode }) {
    const { isSignedIn, isLoaded } = useAuth();
    if (!isLoaded || isSignedIn) return null;
    return <>{children}</>;
  }

  return {
    mode: 'platform',
    Provider: PlatformAuthProvider,
    useAuth,
    SignedIn,
    SignedOut,
  };
}

// ============================================
// Standalone Validation Function
// ============================================

/**
 * Decode and validate a platform JWT
 * Can be used outside of React context for server-side validation
 */
export async function validatePlatformJwt(
  token: string,
  apiUrl: string
): Promise<AuthUser | null> {
  // Decode payload
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  // Check expiration
  if (isTokenExpired(payload)) {
    console.warn('[PlatformAdapter] Token is expired');
    return null;
  }

  // Validate with platform API
  try {
    const response = await fetch(`${apiUrl}/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`[PlatformAdapter] Token validation failed: ${response.status}`);
      return null;
    }

    return extractUserFromPayload(payload);
  } catch (error) {
    console.error('[PlatformAdapter] Token validation error:', error);
    return null;
  }
}
