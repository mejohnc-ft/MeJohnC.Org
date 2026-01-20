/**
 * Platform Auth Adapter (Stub)
 *
 * Future adapter for CentrexAI platform integration.
 * This will validate platform JWTs and extract user identity from the platform context.
 *
 * Current status: Stub implementation that throws on use
 * Implementation will be completed when platform JWT validation is needed.
 *
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthAdapter, AuthContextType, AuthUser } from './types';

/**
 * Internal context for platform auth state
 */
const PlatformAuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Configuration for platform adapter
 */
export interface PlatformAdapterConfig {
  /** Platform API URL for token validation */
  apiUrl: string;
  /** Header name containing the JWT (default: Authorization) */
  tokenHeader?: string;
}

/**
 * Create a platform auth adapter
 *
 * NOTE: This is a stub implementation. Full implementation pending
 * platform JWT validation requirements.
 */
export function createPlatformAdapter(config: PlatformAdapterConfig): AuthAdapter {
  const { apiUrl, tokenHeader = 'Authorization' } = config;

  /**
   * Provider component for platform mode
   */
  function PlatformAuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState<AuthContextType>({
      user: null,
      isSignedIn: false,
      isLoaded: false,
      signOut: async () => {
        // Platform mode: redirect to platform logout
        console.log('[PlatformAdapter] Redirecting to platform logout');
        // TODO: Implement platform logout redirect
        setAuthState((prev) => ({ ...prev, user: null, isSignedIn: false }));
      },
      getToken: async () => {
        // TODO: Return the platform JWT from context
        return null;
      },
    });

    useEffect(() => {
      // TODO: Implement platform JWT validation
      // 1. Check for JWT in Authorization header or cookie
      // 2. Validate JWT with platform API
      // 3. Extract user identity from JWT claims
      // 4. Set auth state

      const validatePlatformToken = async () => {
        try {
          // Stub: For now, just mark as loaded with no user
          console.log(
            `[PlatformAdapter] Platform auth not yet implemented (apiUrl: ${apiUrl}, tokenHeader: ${tokenHeader})`
          );

          setAuthState((prev) => ({
            ...prev,
            isLoaded: true,
            isSignedIn: false,
            user: null,
          }));
        } catch (error) {
          console.error('[PlatformAdapter] Token validation error:', error);
          setAuthState((prev) => ({
            ...prev,
            isLoaded: true,
            isSignedIn: false,
            user: null,
          }));
        }
      };

      validatePlatformToken();
    }, []);

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

/**
 * Decode and validate a platform JWT
 * NOTE: Stub - implementation pending
 */
export async function validatePlatformJwt(
  token: string,
  apiUrl: string
): Promise<AuthUser | null> {
  // TODO: Implement JWT validation
  // 1. Decode JWT header to check algorithm
  // 2. Call platform API to validate signature
  // 3. Check expiration and claims
  // 4. Return normalized user or null
  console.log(`[PlatformAdapter] JWT validation not implemented (token length: ${token.length}, apiUrl: ${apiUrl})`);
  return null;
}
