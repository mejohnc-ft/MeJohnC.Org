import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '@/lib/auth';
import { useSEO } from '@/lib/seo';

const AdminLogin = () => {
  useSEO({ title: 'Admin Login', noIndex: true });
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Login</h1>
          <p className="text-muted-foreground">
            Sign in to access the admin panel
          </p>
        </div>

        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-card border border-border shadow-none',
                headerTitle: 'text-foreground',
                headerSubtitle: 'text-muted-foreground',
                socialButtonsBlockButton: 'bg-muted border-border text-foreground hover:bg-muted/80',
                formFieldLabel: 'text-foreground',
                formFieldInput: 'bg-background border-border text-foreground',
                footerActionLink: 'text-primary hover:text-primary/80',
                formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground',
                identityPreviewText: 'text-foreground',
                identityPreviewEditButton: 'text-primary',
              },
            }}
            redirectUrl="/admin"
            signUpUrl="/admin/login"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Only authorized admins can access this area.
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
