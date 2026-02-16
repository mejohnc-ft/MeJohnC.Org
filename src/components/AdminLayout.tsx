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
  Bookmark,
  BarChart3,
  Users,
  Palette,
  CheckSquare,
  Sparkles,
  Cable,
  BookText,
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
  { label: 'Generative UI', path: '/admin/generative', icon: Sparkles },
  { label: 'Profile', path: '/admin/profile', icon: User },
  { label: 'Tasks', path: '/admin/tasks', icon: CheckSquare },
  { label: 'News', path: '/admin/news', icon: Newspaper },
  { label: 'Bookmarks', path: '/admin/bookmarks', icon: Bookmark },
  { label: 'CRM', path: '/admin/crm', icon: Users },
  { label: 'Metrics', path: '/admin/metrics', icon: BarChart3 },
  { label: 'Style Guide', path: '/admin/style', icon: Palette },
  { label: 'Prompts', path: '/admin/prompts', icon: BookText },
  { label: 'APIs', path: '/admin/apis', icon: Cable },
  { label: 'Apps', path: '/admin/apps', icon: AppWindow },
  { label: 'Projects', path: '/admin/projects', icon: FolderKanban },
  { label: 'Blog', path: '/admin/blog', icon: FileText },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const SIDEBAR_WIDTH = 256;

// Spring config for smooth, snappy animations
const springConfig = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 40,
};

// Desktop: animate width for smooth content reflow
const desktopSidebarVariants = {
  open: {
    width: SIDEBAR_WIDTH,
    opacity: 1,
    transition: springConfig,
  },
  closed: {
    width: 0,
    opacity: 0,
    transition: springConfig,
  },
};

// Mobile: slide in from left (overlay style)
const mobileSidebarVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: springConfig,
  },
  closed: {
    x: -SIDEBAR_WIDTH,
    opacity: 0,
    transition: springConfig,
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
const reducedDesktopVariants = {
  open: { width: SIDEBAR_WIDTH, opacity: 1 },
  closed: { width: 0, opacity: 0 },
};

const reducedMobileVariants = {
  open: { x: 0, opacity: 1 },
  closed: { x: -SIDEBAR_WIDTH, opacity: 0 },
};

// Extracted sidebar content for reuse in mobile and desktop
interface SidebarContentProps {
  location: ReturnType<typeof useLocation>;
  handleNavClick: () => void;
  user: ReturnType<typeof useAuth>['user'];
  signOut: ReturnType<typeof useAuth>['signOut'];
}

const SidebarContent = ({ location, handleNavClick, user, signOut }: SidebarContentProps) => (
  <>
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
              transition-colors duration-150 whitespace-nowrap
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
        <span className="text-sm text-muted-foreground truncate whitespace-nowrap">
          {user?.primaryEmailAddress?.emailAddress}
        </span>
      </div>

      <Link
        to="/"
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 whitespace-nowrap"
      >
        <Home className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">View Site</span>
      </Link>
      <Button
        variant="ghost"
        onClick={() => signOut()}
        className="w-full justify-start gap-3 px-4 py-2.5 text-muted-foreground hover:text-foreground whitespace-nowrap"
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">Sign Out</span>
      </Button>
    </div>
  </>
);

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

  // Select appropriate variants based on device and motion preference
  const desktopVariants = prefersReducedMotion ? reducedDesktopVariants : desktopSidebarVariants;
  const mobileVariants = prefersReducedMotion ? reducedMobileVariants : mobileSidebarVariants;

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
        {/* Mobile: Sidebar backdrop overlay */}
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

        {/* Mobile: Sliding sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.aside
              id="admin-sidebar-mobile"
              initial="closed"
              animate="open"
              exit="closed"
              variants={mobileVariants}
              className="fixed top-16 left-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40 will-change-transform md:hidden"
              aria-label="Admin navigation"
            >
              <SidebarContent
                location={location}
                handleNavClick={handleNavClick}
                user={user}
                signOut={signOut}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Desktop: Width-animated sidebar (always in DOM for smooth reflow) */}
        <motion.aside
          id="admin-sidebar"
          initial={false}
          animate={sidebarOpen ? 'open' : 'closed'}
          variants={desktopVariants}
          className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)] bg-card border-r border-border flex-col flex-shrink-0 overflow-hidden will-change-[width]"
          aria-label="Admin navigation"
          aria-hidden={!sidebarOpen}
        >
          <div className="w-64 h-full flex flex-col">
            <SidebarContent
              location={location}
              handleNavClick={handleNavClick}
              user={user}
              signOut={signOut}
            />
          </div>
        </motion.aside>

        {/* Main content */}
        <main
          id="admin-main-content"
          className="flex-1 min-w-0 overflow-auto"
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
