/**
 * Disabled Auth Adapter
 *
 * A mock auth adapter for testing and development.
 * Always returns a mock user without requiring any authentication.
 *
 * Usage:
 * - Set AUTH_MODE=disabled in .env
 * - Optionally configure mock user details
 *
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { AuthAdapter, AuthContextType, AuthUser } from './types';

/**
 * Default mock user for disabled mode
 */
const DEFAULT_MOCK_USER: AuthUser = {
  id: 'dev-user-001',
  email: 'dev@localhost',
  firstName: 'Dev',
  lastName: 'User',
  fullName: 'Dev User',
  imageUrl: null,
  metadata: { role: 'admin' },
};

/**
 * Internal context for disabled auth state
 */
const DisabledAuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Create a disabled auth adapter with optional mock user
 */
export function createDisabledAdapter(mockUser?: Partial<AuthUser>): AuthAdapter {
  const user: AuthUser = {
    ...DEFAULT_MOCK_USER,
    ...mockUser,
  };

  const authState: AuthContextType = {
    user,
    isSignedIn: true,
    isLoaded: true,
    signOut: async () => {
      // No-op in disabled mode
      console.log('[DisabledAdapter] signOut called (no-op)');
    },
    getToken: async () => {
      // Return a mock token for testing
      return 'mock-token-disabled-mode';
    },
  };

  /**
   * Provider component for disabled mode
   */
  function DisabledAuthProvider({ children }: { children: ReactNode }) {
    return (
      <DisabledAuthContext.Provider value={authState}>{children}</DisabledAuthContext.Provider>
    );
  }

  /**
   * Hook to access auth state
   */
  function useAuth(): AuthContextType {
    const context = useContext(DisabledAuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within DisabledAuthProvider');
    }
    return context;
  }

  /**
   * Always renders children since user is always "signed in"
   */
  function SignedIn({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  /**
   * Never renders children since user is always "signed in"
   */
  function SignedOut({ children }: { children: ReactNode }) {
    // In disabled mode, user is always signed in
    void children;
    return null;
  }

  return {
    mode: 'disabled',
    Provider: DisabledAuthProvider,
    useAuth,
    SignedIn,
    SignedOut,
  };
}
