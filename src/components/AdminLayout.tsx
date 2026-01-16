import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { ThemeToggleMinimal } from './ThemeToggle';
import AdminSearch from './admin/AdminSearch';
import { BREAKPOINTS, STORAGE_KEYS } from '@/lib/constants';

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

// Animation variants for smooth transitions
const sidebarVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  closed: {
    x: -256,
    opacity: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

const overlayVariants = {
  open: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  closed: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Reduced motion variants (instant transitions)
const reducedMotionVariants = {
  open: { x: 0, opacity: 1 },
  closed: { x: -256, opacity: 0 },
};

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Initialize sidebar state from localStorage or responsive default
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;

    // Check localStorage for user preference
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (stored !== null) {
      return stored !== 'true'; // stored is 'true' when collapsed
    }

    // Default: open on desktop, closed on mobile
    return window.innerWidth >= BREAKPOINTS.md;
  });

  // Track if we're on mobile for behavior differences
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < BREAKPOINTS.md
  );

  // Persist sidebar state to localStorage
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, (!newState).toString());
      return newState;
    });
  }, []);

  // Handle window resize
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce resize events
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const nowMobile = window.innerWidth < BREAKPOINTS.md;
        const wasMobile = isMobile;

        setIsMobile(nowMobile);

        // Only auto-adjust if crossing the breakpoint AND no user preference stored
        const hasStoredPreference = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) !== null;

        if (wasMobile !== nowMobile && !hasStoredPreference) {
          // Crossing breakpoint without stored preference: apply responsive default
          setSidebarOpen(!nowMobile);
        } else if (wasMobile && !nowMobile && !sidebarOpen) {
          // Going from mobile to desktop with sidebar closed: open it
          // (unless user explicitly collapsed it)
          if (!hasStoredPreference) {
            setSidebarOpen(true);
          }
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isMobile, sidebarOpen]);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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

  const handleNavClick = () => {
    // Only close on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const variants = prefersReducedMotion ? reducedMotionVariants : sidebarVariants;

  return (
    <div className="min-h-screen bg-background">
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

      {/* Header - fixed across entire top */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              className="flex items-center gap-2 font-mono text-lg text-foreground hover:text-primary transition-colors"
            >
              <span className="md:hidden">
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </span>
              <span className="hidden md:inline">jc_</span>
              <span className="hidden md:inline text-muted-foreground">admin</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <AdminSearch />
            <ThemeToggleMinimal />
          </div>
        </div>
      </header>

      {/* Main layout container */}
      <div className="pt-16 flex min-h-screen">
        {/* Sidebar backdrop (mobile only) */}
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={overlayVariants}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 top-16 bg-black/50 z-40 md:hidden"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              id="admin-sidebar"
              initial="closed"
              animate="open"
              exit="closed"
              variants={variants}
              className={`
                fixed md:sticky top-16 left-0 bottom-0 md:bottom-auto
                w-64 h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]
                bg-card border-r border-border
                flex flex-col z-40
                will-change-transform
              `}
              aria-label="Admin navigation"
            >
              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/admin' && location.pathname.startsWith(item.path));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-lg
                        transition-colors duration-150
                        ${isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
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
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
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
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Spacer for desktop when sidebar is closed */}
        {!sidebarOpen && !isMobile && (
          <div className="w-0 flex-shrink-0" />
        )}

        {/* Main content */}
        <main
          id="admin-main-content"
          className={`
            flex-1 min-w-0 overflow-auto
            transition-[margin] duration-200 ease-out
          `}
        >
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
