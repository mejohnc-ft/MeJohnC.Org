import { ReactNode, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GeometricBackground from './GeometricBackground';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Work', path: '/work' },
  { label: 'Apps', path: '/apps' },
  { label: 'Blog', path: '/blog' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

// Secret portal state (outside component to persist)
let portalClicks = 0;
let portalLastClick = 0;
let portalListening = false;
let portalBuffer = '';
const PORTAL_CODES = [106, 99, 95, 103, 111, 100]; // change this

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [portalActive, setPortalActive] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();

    if (now - portalLastClick > 2000) {
      portalClicks = 0;
    }

    portalClicks++;
    portalLastClick = now;

    if (portalClicks > 1) {
      e.preventDefault();
    }

    if (portalClicks >= 3 && !portalListening) {
      portalListening = true;
      portalBuffer = '';
      setPortalActive(true);

      const keyHandler = (ke: KeyboardEvent) => {
        if (!portalListening) return;
        if (ke.key.length !== 1) return;

        portalBuffer += ke.key.toLowerCase();

        if (portalBuffer.length > 20) {
          portalBuffer = portalBuffer.slice(-20);
        }

        // Check phrase
        let match = true;
        if (portalBuffer.length >= PORTAL_CODES.length) {
          const check = portalBuffer.slice(-PORTAL_CODES.length);
          for (let i = 0; i < PORTAL_CODES.length; i++) {
            if (check.charCodeAt(i) !== PORTAL_CODES[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            portalListening = false;
            portalClicks = 0;
            setPortalActive(false);
            window.removeEventListener('keydown', keyHandler);
            navigate('/admin/login');
          }
        }
      };

      window.addEventListener('keydown', keyHandler);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        portalListening = false;
        portalClicks = 0;
        portalBuffer = '';
        setPortalActive(false);
        window.removeEventListener('keydown', keyHandler);
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <GeometricBackground />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
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

            {/* Nav links */}
            <div className="flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative"
                >
                  <motion.span
                    className={`text-sm font-mono uppercase tracking-wider transition-colors ${
                      location.pathname === item.path
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    {item.label}
                  </motion.span>
                  {location.pathname === item.path && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <main className="relative z-10 pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-mono text-sm text-muted-foreground">
              jc_ / {new Date().getFullYear()}
            </div>
            <div className="text-sm text-muted-foreground">
              San Diego, CA
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
