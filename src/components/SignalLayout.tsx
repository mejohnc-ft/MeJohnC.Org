import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Eye,
  Radio,
  Zap,
  Calendar,
  Shield,
  BookOpen,
  Settings,
  ArrowLeft,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggleMinimal } from "./ThemeToggle";
import { BREAKPOINTS } from "@/lib/constants";

interface SignalLayoutProps {
  children: ReactNode;
  alertCount?: number;
}

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const pinnedItem: NavItem = {
  label: "Dashboard",
  path: "/signal",
  icon: LayoutDashboard,
};

const navSections: NavSection[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    items: [
      { label: "Holdings", path: "/signal/portfolio", icon: Briefcase },
      { label: "Watchlist", path: "/signal/watchlist", icon: Eye },
      { label: "Catalysts", path: "/signal/catalysts", icon: Calendar },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { label: "Signals", path: "/signal/signals", icon: Radio },
      { label: "Firings", path: "/signal/firings", icon: Zap },
    ],
  },
  {
    id: "discipline",
    label: "Discipline",
    items: [
      { label: "Rules", path: "/signal/discipline", icon: Shield },
      { label: "Journal", path: "/signal/journal", icon: BookOpen },
    ],
  },
];

const SIDEBAR_WIDTH = 220;
const SIGNAL_SIDEBAR_KEY = "signal_sidebar_collapsed";
const SIGNAL_SECTIONS_KEY = "signal_sidebar_sections";

const spring = { type: "spring" as const, stiffness: 400, damping: 40 };

function loadSections(): Record<string, boolean> {
  try {
    const s = localStorage.getItem(SIGNAL_SECTIONS_KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return Object.fromEntries(navSections.map((s) => [s.id, true]));
}

function NavLink({
  item,
  active,
  onClick,
  badge,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-colors duration-150 whitespace-nowrap ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-xs font-medium">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[10px] font-mono bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({
  location,
  onNavClick,
  expanded,
  toggleSection,
  alertCount,
}: {
  location: ReturnType<typeof useLocation>;
  onNavClick: () => void;
  expanded: Record<string, boolean>;
  toggleSection: (id: string) => void;
  alertCount?: number;
}) {
  const isActive = (path: string) =>
    path === "/signal"
      ? location.pathname === "/signal"
      : location.pathname.startsWith(path);

  return (
    <>
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        <NavLink
          item={pinnedItem}
          active={isActive("/signal")}
          onClick={onNavClick}
        />

        <div className="pt-2" />

        {navSections.map((section) => {
          const isExpanded = expanded[section.id] ?? true;
          return (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                aria-expanded={isExpanded}
              >
                <span>{section.label}</span>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 pb-1">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.path}
                          item={item}
                          active={isActive(item.path)}
                          onClick={onNavClick}
                          badge={
                            item.path === "/signal/firings"
                              ? alertCount
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="border-t border-border my-2" />

        <NavLink
          item={{ label: "Settings", path: "/signal/settings", icon: Settings }}
          active={isActive("/signal/settings")}
          onClick={onNavClick}
        />
      </nav>

      <div className="px-2 py-3 border-t border-border flex-shrink-0">
        <Link
          to="/admin"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs font-medium">Admin panel</span>
        </Link>
      </div>
    </>
  );
}

export default function SignalLayout({
  children,
  alertCount,
}: SignalLayoutProps) {
  const location = useLocation();
  const { user, isSignedIn, isLoaded } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SIGNAL_SIDEBAR_KEY);
    if (stored !== null) return stored !== "true";
    return window.innerWidth >= BREAKPOINTS.md;
  });

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < BREAKPOINTS.md,
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIGNAL_SIDEBAR_KEY, (!next).toString());
      return next;
    });
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(
        () => setIsMobile(window.innerWidth < BREAKPOINTS.md),
        100,
      );
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (isMobile && sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const [expandedSections, setExpandedSections] =
    useState<Record<string, boolean>>(loadSections);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(SIGNAL_SECTIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const desktopVariants = prefersReducedMotion
    ? {
        open: { width: SIDEBAR_WIDTH, opacity: 1 },
        closed: { width: 0, opacity: 0 },
      }
    : {
        open: { width: SIDEBAR_WIDTH, opacity: 1, transition: spring },
        closed: { width: 0, opacity: 0, transition: spring },
      };

  const mobileVariants = prefersReducedMotion
    ? { open: { x: 0, opacity: 1 }, closed: { x: -SIDEBAR_WIDTH, opacity: 0 } }
    : {
        open: { x: 0, opacity: 1, transition: spring },
        closed: { x: -SIDEBAR_WIDTH, opacity: 0, transition: spring },
      };

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
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 h-12 bg-card border-b border-border z-50">
        <div className="h-full flex items-center justify-between px-4">
          <button
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="flex items-center gap-2 font-mono text-sm text-foreground hover:text-primary transition-colors"
          >
            <span className="md:hidden">
              {sidebarOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </span>
            <span className="hidden md:inline">signal_</span>
          </button>

          <div className="flex items-center gap-3">
            {alertCount !== undefined && alertCount > 0 && (
              <Link
                to="/signal/firings"
                className="relative p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={`${alertCount} active firings`}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full" />
              </Link>
            )}
            <ThemeToggleMinimal />
          </div>
        </div>
      </header>

      <div className="pt-12 flex min-h-screen">
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 top-12 bg-black/50 z-40 md:hidden"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.aside
              initial="closed"
              animate="open"
              exit="closed"
              variants={mobileVariants}
              style={{ width: SIDEBAR_WIDTH }}
              className="fixed top-12 left-0 bottom-0 bg-card border-r border-border flex flex-col z-40 md:hidden overflow-hidden"
            >
              <SidebarContent
                location={location}
                onNavClick={handleNavClick}
                expanded={expandedSections}
                toggleSection={toggleSection}
                alertCount={alertCount}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        <motion.aside
          initial={false}
          animate={sidebarOpen ? "open" : "closed"}
          variants={desktopVariants}
          className="hidden md:flex sticky top-12 h-[calc(100vh-3rem)] bg-card border-r border-border flex-col flex-shrink-0 overflow-hidden will-change-[width]"
        >
          <div
            className="h-full flex flex-col"
            style={{ width: SIDEBAR_WIDTH }}
          >
            <SidebarContent
              location={location}
              onNavClick={handleNavClick}
              expanded={expandedSections}
              toggleSection={toggleSection}
              alertCount={alertCount}
            />
          </div>
        </motion.aside>

        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
