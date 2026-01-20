/**
 * Auth Adapter Module
 *
 * Provides a unified authentication interface that supports multiple auth modes:
 * - clerk: Production mode using Clerk authentication
 * - platform: Future CentrexAI platform integration (validates platform JWT)
 * - disabled: Testing/development mode (mock user, no auth)
 *
 * Usage:
 * ```tsx
 * // The adapter is automatically created based on VITE_AUTH_MODE env var
 * import { AuthProvider, useAuth, SignedIn, SignedOut } from '@/lib/auth';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <SignedIn>
 *         <Dashboard />
 *       </SignedIn>
 *       <SignedOut>
 *         <LoginPage />
 *       </SignedOut>
 *     </AuthProvider>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { user, signOut } = useAuth();
 *   return <div>Hello, {user?.fullName}</div>;
 * }
 * ```
 *
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

// Re-export types
export type {
  AuthMode,
  AuthUser,
  AuthState,
  AuthActions,
  AuthContextType,
  AuthAdapter,
  AuthAdapterConfig,
} from './types';

// Re-export adapter factories for advanced use cases
export { createClerkAdapter } from './clerk-adapter';
export { createDisabledAdapter } from './disabled-adapter';
export { createPlatformAdapter, type PlatformAdapterConfig } from './platform-adapter';

import type { AuthMode, AuthAdapter, AuthAdapterConfig } from './types';
import { createClerkAdapter } from './clerk-adapter';
import { createDisabledAdapter } from './disabled-adapter';
import { createPlatformAdapter } from './platform-adapter';

/**
 * Get the auth mode from environment
 */
function getAuthMode(): AuthMode {
  const mode = import.meta.env.VITE_AUTH_MODE;
  if (mode === 'clerk' || mode === 'platform' || mode === 'disabled') {
    return mode;
  }
  // Default to clerk for production, disabled if no Clerk key
  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return hasClerkKey ? 'clerk' : 'disabled';
}

/**
 * Create an auth adapter based on configuration
 */
export function createAuthAdapter(config?: AuthAdapterConfig): AuthAdapter {
  const mode = getAuthMode();

  switch (mode) {
    case 'clerk': {
      const key = config?.clerkPublishableKey ?? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
      return createClerkAdapter(key);
    }

    case 'platform': {
      const apiUrl = config?.platformApiUrl ?? import.meta.env.VITE_PLATFORM_API_URL ?? '';
      if (!apiUrl) {
        console.warn('[Auth] Platform mode requires VITE_PLATFORM_API_URL');
      }
      return createPlatformAdapter({ apiUrl });
    }

    case 'disabled': {
      return createDisabledAdapter(config?.mockUser);
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = mode;
      throw new Error(`Unknown auth mode: ${_exhaustive}`);
    }
  }
}

// Create the default adapter instance
const defaultAdapter = createAuthAdapter();

/**
 * Default auth provider component
 * Wraps children with the appropriate auth provider based on AUTH_MODE
 */
export const AuthProvider = defaultAdapter.Provider;

/**
 * Hook to access auth state and actions
 * Must be used within AuthProvider
 */
export const useAuth = defaultAdapter.useAuth;

/**
 * Component that renders children only when user is signed in
 */
export const SignedIn = defaultAdapter.SignedIn;

/**
 * Component that renders children only when user is signed out
 */
export const SignedOut = defaultAdapter.SignedOut;

/**
 * The current auth mode being used
 */
export const authMode = defaultAdapter.mode;
