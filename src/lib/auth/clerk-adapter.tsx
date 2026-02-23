/**
 * Clerk Auth Adapter
 *
 * Wraps Clerk authentication hooks into the AuthAdapter interface.
 * This is the production adapter used when AUTH_MODE=clerk.
 *
 * @see docs/modular-app-design-spec.md Section 4.2
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/104
 */

/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useUser,
  useClerk,
  useAuth as useClerkAuth,
  useOrganization,
} from "@clerk/clerk-react";
import type { AuthAdapter, AuthContextType, AuthUser } from "./types";

/**
 * Convert Clerk user to normalized AuthUser
 */
function clerkUserToAuthUser(
  user: ReturnType<typeof useUser>["user"],
  orgRole?: string | null,
): AuthUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    imageUrl: user.imageUrl,
    metadata: user.publicMetadata,
    orgRole: orgRole ?? null,
  };
}

/**
 * Internal context for Clerk auth state
 */
const ClerkAuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Internal hook that bridges Clerk hooks to AuthContextType
 */
function useClerkAuthBridge(): AuthContextType {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn, getToken } = useClerkAuth();
  const { membership } = useOrganization();

  return {
    user: clerkUserToAuthUser(user, membership?.role ?? null),
    isSignedIn: isSignedIn ?? false,
    isLoaded,
    signOut: async () => {
      await signOut();
    },
    getToken: async () => {
      return getToken();
    },
  };
}

/**
 * Internal provider that sets up the auth context within ClerkProvider
 */
function ClerkAuthContextProvider({ children }: { children: ReactNode }) {
  const auth = useClerkAuthBridge();

  return (
    <ClerkAuthContext.Provider value={auth}>
      {children}
    </ClerkAuthContext.Provider>
  );
}

/**
 * Create a Clerk auth adapter
 */
export function createClerkAdapter(publishableKey: string): AuthAdapter {
  /**
   * Provider component that wraps with ClerkProvider
   */
  function ClerkAuthProvider({ children }: { children: ReactNode }) {
    if (!publishableKey) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Clerk Not Configured
            </h2>
            <p className="text-muted-foreground mb-4">
              Add your Clerk publishable key to{" "}
              <code className="text-primary">.env</code>:
            </p>
            <pre className="bg-card border border-border rounded p-4 text-left text-sm overflow-x-auto">
              VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
            </pre>
          </div>
        </div>
      );
    }

    return (
      <ClerkProvider
        publishableKey={publishableKey}
        signInFallbackRedirectUrl="/admin"
        signUpFallbackRedirectUrl="/admin"
      >
        <ClerkAuthContextProvider>{children}</ClerkAuthContextProvider>
      </ClerkProvider>
    );
  }

  /**
   * Hook to access auth state
   */
  function useAuth(): AuthContextType {
    const context = useContext(ClerkAuthContext);
    if (context === undefined) {
      throw new Error("useAuth must be used within ClerkAuthProvider");
    }
    return context;
  }

  return {
    mode: "clerk",
    Provider: ClerkAuthProvider,
    useAuth,
    SignedIn,
    SignedOut,
  };
}
