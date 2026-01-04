/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode } from 'react';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useUser,
  useClerk,
  useAuth as useClerkAuth,
} from '@clerk/clerk-react';

// Get publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface AuthContextType {
  user: ReturnType<typeof useUser>['user'];
  isSignedIn: boolean;
  isLoaded: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { isSignedIn } = useClerkAuth();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isSignedIn: isSignedIn ?? false,
        isLoaded,
        signOut: async () => {
          await signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    // If no Clerk key, show a message for development
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-4">Clerk Not Configured</h2>
          <p className="text-muted-foreground mb-4">
            Add your Clerk publishable key to <code className="text-primary">.env</code>:
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
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/admin"
      signUpFallbackRedirectUrl="/admin"
    >
      <AuthContextProvider>{children}</AuthContextProvider>
    </ClerkProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export Clerk components for convenience
export { SignedIn, SignedOut };
