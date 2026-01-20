/**
 * Auth Module - Backwards Compatibility Re-exports
 *
 * This file re-exports from the new auth adapter module for backwards compatibility.
 * New code should import directly from '@/lib/auth' (the auth/ directory).
 *
 * @deprecated Import from '@/lib/auth' instead for full adapter API
 * @see src/lib/auth/index.ts
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

// Re-export everything from the new auth module
export {
  AuthProvider,
  useAuth,
  SignedIn,
  SignedOut,
  authMode,
  createAuthAdapter,
  createClerkAdapter,
  createDisabledAdapter,
  createPlatformAdapter,
} from './auth/index';

// Re-export types
export type {
  AuthMode,
  AuthUser,
  AuthState,
  AuthActions,
  AuthContextType,
  AuthAdapter,
  AuthAdapterConfig,
  PlatformAdapterConfig,
} from './auth/index';
