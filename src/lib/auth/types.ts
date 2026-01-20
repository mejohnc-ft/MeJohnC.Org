/**
 * Auth Adapter Types
 *
 * Defines the interface for auth adapters that support multiple authentication modes:
 * - clerk: Current production (Clerk authentication)
 * - platform: Future CentrexAI integration (validates platform JWT)
 * - disabled: Testing/development (returns mock user)
 *
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

import type { ReactNode } from 'react';

/**
 * Authentication modes supported by the app
 */
export type AuthMode = 'clerk' | 'platform' | 'disabled';

/**
 * User information normalized across all auth adapters
 */
export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Auth state returned by adapters
 */
export interface AuthState {
  /** Current authenticated user, or null if not authenticated */
  user: AuthUser | null;
  /** Whether the user is signed in */
  isSignedIn: boolean;
  /** Whether the auth state has finished loading */
  isLoaded: boolean;
}

/**
 * Auth actions available through adapters
 */
export interface AuthActions {
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Get the current auth token (for API calls) */
  getToken: () => Promise<string | null>;
}

/**
 * Combined auth context type
 */
export interface AuthContextType extends AuthState, AuthActions {}

/**
 * Auth adapter interface
 *
 * Each adapter implements this interface to provide a consistent
 * authentication API regardless of the underlying auth provider.
 */
export interface AuthAdapter {
  /** The auth mode this adapter implements */
  mode: AuthMode;

  /**
   * Provider component that wraps the app with auth context
   */
  Provider: React.ComponentType<{ children: ReactNode }>;

  /**
   * Hook to access auth state and actions
   * Must be used within the Provider
   */
  useAuth: () => AuthContextType;

  /**
   * Component that renders children only when user is signed in
   */
  SignedIn: React.ComponentType<{ children: ReactNode }>;

  /**
   * Component that renders children only when user is signed out
   */
  SignedOut: React.ComponentType<{ children: ReactNode }>;
}

/**
 * Configuration for creating auth adapters
 */
export interface AuthAdapterConfig {
  /** Clerk publishable key (for clerk mode) */
  clerkPublishableKey?: string;
  /** Platform API URL (for platform mode) */
  platformApiUrl?: string;
  /** Mock user for disabled mode */
  mockUser?: Partial<AuthUser>;
}
