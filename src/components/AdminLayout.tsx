import { ReactNode, useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  AppWindow,
  FileText,
  LogOut,
  Home,
  Loader2,
  Settings,
  FolderKanban,
  User,
  Newspaper,
  Bot,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ThemeToggleMinimal } from './ThemeToggle';
import AdminSearch from './admin/AdminSearch';

interface AdminLayoutProps {
  children: ReactNode;
}

const sidebarItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'AI Manager', path: '/admin/ai-manager', icon: Bot },
  { label: 'Profile', path: '/admin/profile', icon: User },
  { label: 'News', path: '/admin/news', icon: Newspaper },
  { label: 'Apps', path: '/admin/apps', icon: AppWindow },
  { label: 'Projects', path: '/admin/projects', icon: FolderKanban },
  { label: 'Blog', path: '/admin/blog', icon: FileText },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  // Open by default on desktop (768px+), collapsed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  const SidebarContent = () => (
    <>
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/admin' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {/* User info with Clerk UserButton */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              }
            }}
          />
          <span className="text-sm text-muted-foreground truncate">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        </div>

        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">View Site</span>
        </Link>
        <Button
          variant="ghost"
          onClick={() => signOut()}
          className="w-full justify-start gap-3 px-4 py-2.5 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip navigation links for keyboard users */}
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:font-mono focus:text-sm"
      >
        Skip to main content
      </a>
      <a
        href="#admin-sidebar"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-40 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:font-mono focus:text-sm"
      >
        Skip to navigation
      </a>

      {/* Header - logo toggles sidebar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="font-mono text-lg text-foreground hover:text-primary transition-colors"
        >
          jc_ <span className="text-muted-foreground">admin</span>
        </button>
        <div className="flex items-center gap-3">
          <AdminSearch />
          <ThemeToggleMinimal />
        </div>
      </div>

      <div className="flex flex-1 pt-16">
        {/* Sidebar overlay (mobile only) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              id="admin-sidebar"
              initial={{ x: -256, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -256, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed md:relative left-0 top-16 bottom-0 w-64 bg-card border-r border-border flex flex-col z-50"
              aria-label="Admin navigation"
            >
              <SidebarContent />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main id="admin-main-content" className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
