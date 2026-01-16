import { ReactNode, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import GeometricBackground from './GeometricBackground';
import { ThemeToggleMinimal } from './ThemeToggle';
import { LeftArrowHint, RightArrowHint } from './ArrowHints';
import { useKeyboardFocus } from '@/lib/keyboard-focus';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Collab', path: '/about' },
];

// Secret portal codes
const PORTAL_CODES = [106, 119, 99]; // jwc

// Portal state type
interface PortalState {
  clicks: number;
  lastClick: number;
  listening: boolean;
  buffer: string;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [portalActive, setPortalActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { focusLevel, setFocusLevel } = useKeyboardFocus();

  // Portal state in a ref to persist across renders without causing re-renders
  const portalStateRef = useRef<PortalState>({
    clicks: 0,
    lastClick: 0,
    listening: false,
    buffer: '',
  });

  // Get current nav index based on location
  const getCurrentNavIndex = useCallback(() => {
    const index = navItems.findIndex(item =>
      location.pathname === item.path ||
      (item.path === '/portfolio' && location.pathname.startsWith('/portfolio'))
    );
    return index >= 0 ? index : 0;
  }, [location.pathname]);

  // Navigate to adjacent page
  const navigateToPage = useCallback((direction: 'next' | 'prev') => {
    const currentIndex = getCurrentNavIndex();
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % navItems.length;
    } else {
      newIndex = (currentIndex - 1 + navItems.length) % navItems.length;
    }
    navigate(navItems[newIndex].path);
  }, [getCurrentNavIndex, navigate]);

  // Keyboard navigation for navbar (only when focused on nav)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only handle left/right for page navigation when focused on nav
      if (focusLevel === 'nav') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateToPage('next');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateToPage('prev');
        } else if (e.key === 'ArrowDown') {
          // Arrow down from nav enters page content
          e.preventDefault();
          // On About/Collab page, focus contact cards
          if (location.pathname === '/about') {
            setFocusLevel('contactCards');
          } else if (location.pathname === '/portfolio') {
            setFocusLevel('tabs');
          }
        }
      }

      // Arrow up from any sub-level returns to nav
      if (focusLevel !== 'nav' && e.key === 'ArrowUp') {
        // Let the specific component handle it first if it wants to
        // This is a fallback - components can prevent this by stopping propagation
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToPage, focusLevel, location.pathname, setFocusLevel]);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const portal = portalStateRef.current;

    if (now - portal.lastClick > 2000) {
      portal.clicks = 0;
    }

    portal.clicks++;
    portal.lastClick = now;

    if (portal.clicks > 1) {
      e.preventDefault();
    }

    if (portal.clicks >= 3 && !portal.listening) {
      portal.listening = true;
      portal.buffer = '';
      setPortalActive(true);

      const keyHandler = (ke: KeyboardEvent) => {
        if (!portal.listening) return;
        if (ke.key.length !== 1) return;

        portal.buffer += ke.key.toLowerCase();

        if (portal.buffer.length > 20) {
          portal.buffer = portal.buffer.slice(-20);
        }

        // Check phrase
        let match = true;
        if (portal.buffer.length >= PORTAL_CODES.length) {
          const check = portal.buffer.slice(-PORTAL_CODES.length);
          for (let i = 0; i < PORTAL_CODES.length; i++) {
            if (check.charCodeAt(i) !== PORTAL_CODES[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            portal.listening = false;
            portal.clicks = 0;
            setPortalActive(false);
            window.removeEventListener('keydown', keyHandler);
            setShowSettings(true);
          }
        }
      };

      window.addEventListener('keydown', keyHandler);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        portal.listening = false;
        portal.clicks = 0;
        portal.buffer = '';
        setPortalActive(false);
        window.removeEventListener('keydown', keyHandler);
      }, 5000);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground relative flex flex-col overflow-hidden">
      <GeometricBackground />

      {/* Skip to main content link - visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:font-mono focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <motion.nav
        aria-label="Main navigation"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
      >
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo - left edge */}
          <Link
            to="/"
            onClick={handleLogoClick}
            className={`font-mono text-lg transition-colors select-none ${
              portalActive
                ? 'text-primary animate-pulse'
                : 'text-foreground hover:text-primary'
            }`}
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              jc_
            </motion.span>
          </Link>

          {/* Nav links - centered with arrow hints */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
            <LeftArrowHint />
            <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path === '/portfolio' && location.pathname.startsWith('/portfolio'));
              const isGlowing = isActive && focusLevel === 'nav';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setFocusLevel('nav')}
                  className="relative"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <motion.span
                    className={`text-sm font-mono uppercase tracking-wider transition-all ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    style={{
                      textShadow: isGlowing
                        ? '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary))'
                        : 'none',
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              );
            })}
            </div>
            <RightArrowHint />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            <ThemeToggleMinimal />
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <Link to="/admin/login">
                    <motion.div
                      className="text-muted-foreground hover:text-primary transition-colors"
                      whileHover={{ rotate: 90 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Settings className="w-5 h-5" />
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <main id="main-content" className="relative z-10 pt-16 flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
