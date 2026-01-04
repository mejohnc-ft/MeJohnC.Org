import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { DownArrowHint } from '@/components/ArrowHints';
import { useAuth } from '@/lib/auth';
import { useKeyboardFocus } from '@/lib/keyboard-focus';
import { useSearchParams } from 'react-router-dom';
import { useSEO, useJsonLd, personSchema } from '@/lib/seo';
import { prefetchTabData } from '@/lib/prefetch';
import { analytics } from '@/lib/analytics';

// Eager load Work tab (most common landing)
import { WorkTab } from '@/components/portfolio';

// Lazy load other tabs for code splitting
const ProjectsTab = lazy(() => import('@/components/portfolio/ProjectsTab'));
const SoftwareTab = lazy(() => import('@/components/portfolio/SoftwareTab'));
const ContentTab = lazy(() => import('@/components/portfolio/ContentTab'));

type TabId = 'work' | 'projects' | 'software' | 'content';

const tabs: { id: TabId; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'projects', label: 'Projects' },
  { id: 'software', label: 'Software' },
  { id: 'content', label: 'Content' },
];

// Tab loading fallback
function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

const Portfolio = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabFromUrl && tabs.some(t => t.id === tabFromUrl) ? tabFromUrl : 'work'
  );
  useAuth(); // Keep auth context active

  useSEO({
    title: 'Portfolio',
    description: 'Explore my work, projects, software, and content. AI automation, Microsoft 365, Azure, and enterprise IT solutions.',
    url: '/portfolio',
  });

  useJsonLd(personSchema);

  // Global keyboard focus context
  const { focusLevel, setFocusLevel } = useKeyboardFocus();

  // Derived focus states
  const tabsFocused = focusLevel === 'tabs';

  // Focus tabs explicitly (via down arrow or tab click)
  const focusTabs = useCallback(() => {
    setFocusLevel('tabs');
  }, [setFocusLevel]);

  // Unfocus tabs (via up arrow - return to main nav level)
  const unfocusTabs = useCallback(() => {
    setFocusLevel('nav');
  }, [setFocusLevel]);

  // Focus timeline (via down arrow from tabs, only on Work tab)
  const focusTimeline = useCallback(() => {
    setFocusLevel('timeline');
  }, [setFocusLevel]);

  // Update URL when tab changes
  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    focusTabs(); // Clicking a tab focuses the tabs
    analytics.trackTabChange(tabId);
    if (tabId === 'work') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  }, [setSearchParams, focusTabs]);

  // Navigate to next/previous tab
  const goToNextTab = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    handleTabChange(tabs[nextIndex].id);
  }, [activeTab, handleTabChange]);

  const goToPrevTab = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    handleTabChange(tabs[prevIndex].id);
  }, [activeTab, handleTabChange]);

  // Keyboard navigation for tabs - only when tabs are explicitly focused
  useEffect(() => {
    if (!tabsFocused) return; // Don't add listener at all if not focused

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.stopImmediatePropagation(); // Prevent Layout from also navigating
        goToNextTab();
      } else if (e.key === 'ArrowLeft') {
        e.stopImmediatePropagation(); // Prevent Layout from also navigating
        goToPrevTab();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopImmediatePropagation();
        unfocusTabs(); // Return to main nav level
      } else if (e.key === 'ArrowDown') {
        // Only go to timeline if on Work tab
        if (activeTab === 'work') {
          e.preventDefault();
          e.stopImmediatePropagation();
          focusTimeline();
        }
      }
    };

    // Use capture phase to handle before Layout
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [goToNextTab, goToPrevTab, tabsFocused, unfocusTabs, activeTab, focusTimeline]);

  // Down arrow to focus tabs (only when at nav level)
  useEffect(() => {
    if (focusLevel !== 'nav') return; // Only listen when at nav level

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusTabs(); // Focus the tab bar
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusLevel, focusTabs]);

  // Swipe gesture handler
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      goToNextTab();
    } else if (info.offset.x > threshold) {
      goToPrevTab();
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Tab Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center mb-12"
          >
            <div role="tablist" aria-label="Portfolio sections" className="flex justify-center items-center gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1}
                  onClick={() => handleTabChange(tab.id)}
                  onMouseEnter={() => tab.id !== 'work' && prefetchTabData(tab.id as 'projects' | 'software' | 'content')}
                  onFocus={() => tab.id !== 'work' && prefetchTabData(tab.id as 'projects' | 'software' | 'content')}
                  className="flex flex-col items-center gap-3 group"
                >
                  {/* Dot indicator */}
                  <motion.div
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-primary scale-125'
                        : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                    }`}
                    style={{
                      filter: activeTab === tab.id && tabsFocused
                        ? 'drop-shadow(0 0 8px hsl(var(--primary))) drop-shadow(0 0 16px hsl(var(--primary)))'
                        : 'none',
                    }}
                    animate={{
                      scale: activeTab === tab.id ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: activeTab === tab.id ? Infinity : 0,
                      repeatDelay: 2,
                    }}
                  />
                  {/* Label */}
                  <span
                    className={`font-mono text-sm uppercase tracking-wider transition-all ${
                      activeTab === tab.id
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                    style={{
                      textShadow: activeTab === tab.id && tabsFocused
                        ? '0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary))'
                        : 'none',
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Down arrow hint below tabs */}
            <DownArrowHint />
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
              {activeTab === 'work' && (
                <WorkTab key="work" onRequestFocusUp={focusTabs} />
              )}
              {activeTab === 'projects' && (
                <Suspense key="projects" fallback={<TabLoader />}>
                  <ProjectsTab />
                </Suspense>
              )}
              {activeTab === 'software' && (
                <Suspense key="software" fallback={<TabLoader />}>
                  <SoftwareTab />
                </Suspense>
              )}
              {activeTab === 'content' && (
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
