import {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Loader2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/lib/auth";
import { useKeyboardFocus } from "@/lib/keyboard-focus";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  useSEO,
  useJsonLd,
  personSchema,
  websiteSchema,
  occupationSchema,
  softwareSchema,
  RECRUITING_KEYWORDS,
} from "@/lib/seo";
import { prefetchTabData } from "@/lib/prefetch";
import { analytics } from "@/lib/analytics";

// Eager load Work tab (most common landing)
import { WorkTab } from "@/components/portfolio";

// Lazy load other tabs for code splitting
const ProjectsTab = lazy(() => import("@/components/portfolio/ProjectsTab"));
const SoftwareTab = lazy(() => import("@/components/portfolio/SoftwareTab"));
const ContentTab = lazy(() => import("@/components/portfolio/ContentTab"));

type TabId = "work" | "projects" | "software" | "content";

const TAB_PATHS: Record<TabId, string> = {
  work: "/work",
  projects: "/projects",
  software: "/products",
  content: "/speaking",
};

const tabs: { id: TabId; label: string }[] = [
  { id: "work", label: "Career" },
  { id: "projects", label: "Projects" },
  { id: "software", label: "Products" },
  { id: "content", label: "Speaking" },
];

// Tab loading fallback
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

interface PortfolioProps {
  initialTab?: TabId;
}

const Portfolio = ({ initialTab = "work" }: PortfolioProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabFromUrl && tabs.some((t) => t.id === tabFromUrl)
      ? tabFromUrl
      : initialTab,
  );
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    work: null,
    projects: null,
    software: null,
    content: null,
  });
  useAuth(); // Keep auth context active

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    setActiveTab(
      nextTab && tabs.some((tab) => tab.id === nextTab)
        ? (nextTab as TabId)
        : initialTab,
    );
  }, [initialTab, searchParams]);

  const seoForTab = (() => {
    if (activeTab === "content") {
      return {
        title: "Speaking & Writing",
        description:
          "Writing, timestamped talks, and curated AI news from Jonathan Christensen — AI automation, governed agents, and IT operations.",
        url: "/speaking",
        keywords: RECRUITING_KEYWORDS,
      };
    }
    if (activeTab === "software") {
      return {
        title: "AI Products & Software",
        description:
          "Products and software Jonathan Christensen has led or shipped: governed enterprise AI, service-delivery automation, application platforms, and public builds.",
        url: "/products",
        keywords: RECRUITING_KEYWORDS,
      };
    }
    if (activeTab === "projects") {
      return {
        title: "Side Projects",
        description:
          "Side projects and public builds from Jonathan Christensen, alongside the professional AI automation portfolio.",
        url: "/projects",
        keywords: RECRUITING_KEYWORDS,
      };
    }
    return {
      title: "AI Automation Experience",
      description:
        "Jonathan Christensen's forward-deployed engineering impact: operational transformation, governed AI automation, product strategy, measurable time returned, and cross-department delivery.",
      url: "/work",
      keywords: RECRUITING_KEYWORDS,
    };
  })();

  useSEO(seoForTab);

  useJsonLd([personSchema, websiteSchema, occupationSchema, softwareSchema]);

  // Global keyboard focus context
  const { focusLevel, setFocusLevel } = useKeyboardFocus();

  // Derived focus states
  const tabsFocused = focusLevel === "tabs";

  // Focus tabs explicitly (via down arrow or tab click)
  const focusTabs = useCallback(
    (tabId: TabId = activeTab) => {
      setFocusLevel("tabs");
      tabRefs.current[tabId]?.focus();
    },
    [activeTab, setFocusLevel],
  );

  // Unfocus tabs (via up arrow - return to main nav level)
  const unfocusTabs = useCallback(() => {
    setFocusLevel("nav");
  }, [setFocusLevel]);

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tabId: TabId) => {
      setActiveTab(tabId);
      focusTabs(tabId);
      analytics.trackTabChange(tabId);
      if (location.pathname === "/portfolio") {
        if (tabId === "work") {
          setSearchParams({});
        } else {
          setSearchParams({ tab: tabId });
        }
      } else {
        navigate(TAB_PATHS[tabId]);
      }
    },
    [focusTabs, location.pathname, navigate, setSearchParams],
  );

  // Navigate to next/previous tab
  const goToNextTab = useCallback(() => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTab = tabs[nextIndex].id;
    handleTabChange(nextTab);
    tabRefs.current[nextTab]?.focus();
  }, [activeTab, handleTabChange]);

  const goToPrevTab = useCallback(() => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    const previousTab = tabs[prevIndex].id;
    handleTabChange(previousTab);
    tabRefs.current[previousTab]?.focus();
  }, [activeTab, handleTabChange]);

  // Keyboard navigation for tabs - only when tabs are explicitly focused
  useEffect(() => {
    if (!tabsFocused) return; // Don't add listener at all if not focused

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopImmediatePropagation(); // Prevent Layout from also navigating
        goToNextTab();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopImmediatePropagation(); // Prevent Layout from also navigating
        goToPrevTab();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation();
        unfocusTabs(); // Return to main nav level
      }
    };

    // Use capture phase to handle before Layout
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [goToNextTab, goToPrevTab, tabsFocused, unfocusTabs]);

  // Down arrow to focus tabs (only when at nav level)
  useEffect(() => {
    if (focusLevel !== "nav") return; // Only listen when at nav level

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusTabs();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusLevel, focusTabs]);

  // Swipe gesture handler
  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      goToNextTab();
    } else if (info.offset.x > threshold) {
      goToPrevTab();
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] px-6 pb-10 pt-4">
        <div className="max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10 border-b border-border/70"
          >
            <div
              role="tablist"
              aria-label="Portfolio sections"
              className="flex items-center justify-center gap-5 sm:gap-8"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  ref={(element) => {
                    tabRefs.current[tab.id] = element;
                  }}
                  onClick={() => handleTabChange(tab.id)}
                  onMouseEnter={() =>
                    tab.id !== "work" &&
                    prefetchTabData(
                      tab.id as "projects" | "software" | "content",
                    )
                  }
                  onFocus={() =>
                    tab.id !== "work" &&
                    prefetchTabData(
                      tab.id as "projects" | "software" | "content",
                    )
                  }
                  className={`relative px-1 pb-3 pt-2 font-mono text-xs tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-px h-px bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content with slide animation and swipe support */}
          <motion.div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="min-h-[75vh] relative overflow-hidden touch-pan-y"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
          >
            <AnimatePresence mode="wait">
              {activeTab === "work" && <WorkTab key="work" />}
              {activeTab === "projects" && (
                <Suspense key="projects" fallback={<TabLoader />}>
                  <ProjectsTab />
                </Suspense>
              )}
              {activeTab === "software" && (
                <Suspense key="software" fallback={<TabLoader />}>
                  <SoftwareTab />
                </Suspense>
              )}
              {activeTab === "content" && (
                <Suspense key="content" fallback={<TabLoader />}>
                  <ContentTab />
                </Suspense>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Portfolio;
