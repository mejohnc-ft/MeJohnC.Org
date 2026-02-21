import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import { KeyboardFocusProvider } from "./lib/keyboard-focus";
import { useReducedMotion } from "./lib/reduced-motion";
import { PWAProvider } from "./lib/pwa";
import { TenantProvider, useTenant } from "./lib/tenant";
import { trackPageView } from "./lib/analytics";
import { SEOProvider } from "./lib/seo";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { renderFeatureRoutes } from "./components/FeatureRoutes";
import { initializeModules } from "./features";

// Eager load critical pages for fast initial render
import Home from "./pages/Home";

// Lazy load heavy pages for code splitting
const Portfolio = lazy(() => import("./pages/Portfolio"));
const About = lazy(() => import("./pages/About"));
const AppDetail = lazy(() => import("./pages/AppDetail"));
const AppSuite = lazy(() => import("./pages/AppSuite"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const TerritoriesProject = lazy(() => import("./pages/TerritoriesProject"));

// Lazy load admin pages (rarely accessed)
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminBlogList = lazy(() => import("./pages/admin/blog/index"));
const BlogEditor = lazy(() => import("./pages/admin/blog/editor"));
const AdminAppsList = lazy(() => import("./pages/admin/apps/index"));
const AppEditor = lazy(() => import("./pages/admin/apps/editor"));
const SuiteEditor = lazy(() => import("./pages/admin/apps/suite-editor"));
const AdminProjectsList = lazy(() => import("./pages/admin/projects/index"));
const ProjectEditor = lazy(() => import("./pages/admin/projects/editor"));
const AdminProfile = lazy(() => import("./pages/admin/Profile"));

// AI Manager page
const AdminAIManager = lazy(() => import("./pages/admin/ai-manager/index"));

// Bookmarks admin page
const AdminBookmarks = lazy(() => import("./pages/admin/bookmarks/index"));

// API Registry admin page
const AdminApiRegistry = lazy(() => import("./pages/admin/ApiRegistry"));

// Prompt Library admin page
const AdminPromptLibrary = lazy(() => import("./pages/admin/PromptLibrary"));

// Command Center admin pages
const AdminSkillsRegistry = lazy(() => import("./pages/admin/SkillsRegistry"));
const AdminInfrastructureMap = lazy(
  () => import("./pages/admin/InfrastructureMap"),
);
const AdminConfigVault = lazy(() => import("./pages/admin/ConfigVault"));
const AdminRunbooks = lazy(() => import("./pages/admin/Runbooks"));

// Site Builder admin pages (will be migrated to feature module)
const SiteBuilderIndex = lazy(() => import("./pages/admin/site-builder/index"));
const SiteBuilderEditor = lazy(
  () => import("./pages/admin/site-builder/editor"),
);

// Public NPS survey page
const PublicSurveyPage = lazy(
  () => import("./features/nps/pages/PublicSurveyPage"),
);

// Desktop OS mode
const DesktopShell = lazy(() => import("./components/desktop/DesktopShell"));

// Agent Platform admin pages
const AdminAgentRegistry = lazy(() => import("./pages/admin/AgentRegistry"));
const AdminWorkflows = lazy(() => import("./pages/admin/Workflows"));
const AdminWorkflowEditor = lazy(() => import("./pages/admin/WorkflowEditor"));
const AdminScheduler = lazy(() => import("./pages/admin/Scheduler"));
const AdminIntegrationHub = lazy(() => import("./pages/admin/IntegrationHub"));
const AdminAuditLog = lazy(() => import("./pages/admin/AuditLog"));

// Note: These routes are now dynamically loaded from feature modules:
// - Tasks (/admin/tasks/*) - from tasks module
// - CRM (/admin/crm/*) - from crm module
// - Metrics (/admin/metrics/*) - from metrics module
// - Style Guide (/admin/style/*) - from style-guide module
// - Generative UI (/admin/generative/*) - from generative-ui module
// - News (/admin/news/*) - from news module
// - NPS (/admin/nps/*) - from nps module

// Marketing admin pages
const AdminMarketing = lazy(() => import("./pages/admin/Marketing"));
const AdminMarketingSubscribers = lazy(
  () => import("./pages/admin/MarketingSubscribers"),
);
const AdminMarketingCampaigns = lazy(
  () => import("./pages/admin/MarketingCampaigns"),
);
const AdminMarketingTemplates = lazy(
  () => import("./pages/admin/MarketingTemplates"),
);
const AdminMarketingNPS = lazy(() => import("./pages/admin/MarketingNPS"));
const SubscriberDetail = lazy(() => import("./pages/admin/SubscriberDetail"));
const CampaignEditor = lazy(() => import("./pages/admin/CampaignEditor"));
const TemplateEditor = lazy(() => import("./pages/admin/TemplateEditor"));
const NPSSurveyDetail = lazy(() => import("./pages/admin/NPSSurveyDetail"));

// Public bookmarks page
const PublicBookmarks = lazy(() => import("./pages/Bookmarks"));

// Public custom pages (site builder)
const PublicPage = lazy(() => import("./pages/PublicPage"));

// Public generative UI panels
const PanelPage = lazy(() => import("./pages/PanelPage"));

// Minimal loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Gate that blocks rendering until tenant is resolved
function TenantGate({ children }: { children: React.ReactNode }) {
  const { status, error } = useTenant();

  if (status === "loading") {
    return <PageLoader />;
  }

  if (status === "not_found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Workspace Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The workspace you're looking for doesn't exist or is no longer
            active.
          </p>
          <a
            href={import.meta.env.VITE_SITE_URL || "/"}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go to Main Site
          </a>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Connection Error
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "Unable to connect to the workspace. Please try again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Route-specific error fallback for admin section
function AdminErrorFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Admin Error</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong in the admin panel. Your data is safe.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/admin"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </a>
          <a
            href="/"
            className="px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
          >
            View Site
          </a>
        </div>
      </div>
    </div>
  );
}

// Route-specific error fallback for public pages
function PublicErrorFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Error</h1>
        <p className="text-muted-foreground mb-6">
          This page encountered an error. Try refreshing or go back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Refresh Page
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}

// Track page views on route changes
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Get page title based on route
    const getPageTitle = (pathname: string): string => {
      if (pathname === "/") return "Home";
      if (pathname === "/portfolio") return "Portfolio";
      if (pathname === "/about") return "About";
      if (pathname.startsWith("/blog/")) return "Blog Post";
      if (pathname.startsWith("/apps/suite/")) return "App Suite";
      if (pathname.startsWith("/apps/")) return "App Detail";
      if (pathname === "/projects/territories") return "Territories";
      return "Page";
    };

    trackPageView(location.pathname, getPageTitle(location.pathname));
  }, [location.pathname]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  // Don't wrap PublicPage in AnimatePresence as it has its own Layout
  if (location.pathname.startsWith("/p/")) {
    return (
      <Routes location={location}>
        <Route
          path="/p/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <PublicPage />
            </Suspense>
          }
        />
      </Routes>
    );
  }

  // Public generative UI panels
  if (location.pathname.startsWith("/panel/")) {
    return (
      <Routes location={location}>
        <Route
          path="/panel/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <PanelPage />
            </Suspense>
          }
        />
      </Routes>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route
          path="/portfolio"
          element={
            <Suspense fallback={<PageLoader />}>
              <Portfolio />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={<PageLoader />}>
              <About />
            </Suspense>
          }
        />
        <Route
          path="/blog/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <BlogPost />
            </Suspense>
          }
        />

        {/* App detail routes (kept for direct linking) */}
        <Route
          path="/apps/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <AppDetail />
            </Suspense>
          }
        />
        <Route
          path="/apps/suite/:slug"
          element={
            <Suspense fallback={<PageLoader />}>
              <AppSuite />
            </Suspense>
          }
        />

        {/* Public bookmarks page */}
        <Route
          path="/bookmarks"
          element={
            <Suspense fallback={<PageLoader />}>
              <PublicBookmarks />
            </Suspense>
          }
        />

        {/* Territories Design System Explorer */}
        <Route
          path="/projects/territories"
          element={
            <Suspense fallback={<PageLoader />}>
              <TerritoriesProject />
            </Suspense>
          }
        />

        {/* Public NPS survey */}
        <Route
          path="/survey/:surveyId"
          element={
            <Suspense fallback={<PageLoader />}>
              <PublicSurveyPage />
            </Suspense>
          }
        />

        {/* Redirects for old routes */}
        <Route path="/work" element={<Navigate to="/portfolio" replace />} />
        <Route path="/apps" element={<Navigate to="/portfolio" replace />} />
        <Route path="/contact" element={<Navigate to="/about" replace />} />
        <Route
          path="/blog"
          element={<Navigate to="/portfolio?tab=content" replace />}
        />
      </Routes>
    </AnimatePresence>
  );
}

function AdminRoutes() {
  // Initialize feature modules on mount
  useEffect(() => {
    initializeModules();
  }, []);

  return (
    <ErrorBoundary fallback={<AdminErrorFallback />}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Desktop OS mode (must be before other admin routes) */}
          <Route path="/admin/desktop/*" element={<DesktopShell />} />

          {/* Core admin routes (not from feature modules) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/blog" element={<AdminBlogList />} />
          <Route path="/admin/blog/new" element={<BlogEditor />} />
          <Route path="/admin/blog/:id/edit" element={<BlogEditor />} />
          <Route path="/admin/apps" element={<AdminAppsList />} />
          <Route path="/admin/apps/new" element={<AppEditor />} />
          <Route path="/admin/apps/new-suite" element={<SuiteEditor />} />
          <Route path="/admin/apps/:id/edit" element={<AppEditor />} />
          <Route path="/admin/apps/suite/:id/edit" element={<SuiteEditor />} />
          <Route path="/admin/projects" element={<AdminProjectsList />} />
          <Route path="/admin/projects/new" element={<ProjectEditor />} />
          <Route path="/admin/projects/:id/edit" element={<ProjectEditor />} />
          {/* AI Manager route */}
          <Route path="/admin/ai-manager" element={<AdminAIManager />} />
          {/* Bookmarks route */}
          <Route path="/admin/bookmarks" element={<AdminBookmarks />} />
          {/* API Registry route */}
          <Route path="/admin/apis" element={<AdminApiRegistry />} />
          {/* Prompt Library route */}
          <Route path="/admin/prompts" element={<AdminPromptLibrary />} />
          {/* Command Center routes */}
          <Route path="/admin/skills" element={<AdminSkillsRegistry />} />
          <Route
            path="/admin/infrastructure"
            element={<AdminInfrastructureMap />}
          />
          <Route path="/admin/configs" element={<AdminConfigVault />} />
          <Route path="/admin/runbooks" element={<AdminRunbooks />} />
          {/* Marketing routes (legacy - will be migrated to feature module) */}
          <Route path="/admin/marketing" element={<AdminMarketing />} />
          <Route
            path="/admin/marketing/subscribers"
            element={<AdminMarketingSubscribers />}
          />
          <Route
            path="/admin/marketing/subscribers/:id"
            element={<SubscriberDetail />}
          />
          <Route
            path="/admin/marketing/campaigns"
            element={<AdminMarketingCampaigns />}
          />
          <Route
            path="/admin/marketing/campaigns/:id"
            element={<CampaignEditor />}
          />
          <Route
            path="/admin/marketing/templates"
            element={<AdminMarketingTemplates />}
          />
          <Route
            path="/admin/marketing/templates/:id"
            element={<TemplateEditor />}
          />
          <Route
            path="/admin/marketing/templates/:id/preview"
            element={<TemplateEditor />}
          />
          <Route path="/admin/marketing/nps" element={<AdminMarketingNPS />} />
          <Route
            path="/admin/marketing/nps/:id"
            element={<NPSSurveyDetail />}
          />
          {/* Site Builder routes (legacy - will be migrated to feature module) */}
          <Route path="/admin/site-builder" element={<SiteBuilderIndex />} />
          <Route
            path="/admin/site-builder/:pageId"
            element={<SiteBuilderEditor />}
          />
          {/* Agent Platform routes */}
          <Route path="/admin/agents" element={<AdminAgentRegistry />} />
          <Route path="/admin/workflows" element={<AdminWorkflows />} />
          <Route
            path="/admin/workflows/:id"
            element={<AdminWorkflowEditor />}
          />
          <Route path="/admin/scheduler" element={<AdminScheduler />} />
          <Route path="/admin/integrations" element={<AdminIntegrationHub />} />
          <Route path="/admin/audit" element={<AdminAuditLog />} />

          {/* Dynamic feature module routes */}
          {renderFeatureRoutes()}
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isCustomPage = location.pathname.startsWith("/p/");
  const isPanelPage = location.pathname.startsWith("/panel/");

  // Don't track admin routes in analytics
  if (isAdminRoute) {
    return <AdminRoutes />;
  }

  // Custom pages (site builder) and panels don't need the default Layout
  if (isCustomPage || isPanelPage) {
    return (
      <ErrorBoundary fallback={<PublicErrorFallback />}>
        <RouteTracker />
        <AnimatedRoutes />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={<PublicErrorFallback />}>
      <RouteTracker />
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </ErrorBoundary>
  );
}

function App() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <BrowserRouter>
      <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
        <ThemeProvider>
          <KeyboardFocusProvider>
            <PWAProvider>
              <TenantProvider>
                <TenantGate>
                  <AuthProvider>
                    <SEOProvider>
                      <AppContent />
                      <Toaster
                        position="bottom-right"
                        theme="dark"
                        richColors
                        closeButton
                      />
                    </SEOProvider>
                  </AuthProvider>
                </TenantGate>
              </TenantProvider>
            </PWAProvider>
          </KeyboardFocusProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}

export default App;
