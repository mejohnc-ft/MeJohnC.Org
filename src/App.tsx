import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { KeyboardFocusProvider } from './lib/keyboard-focus';
import { useReducedMotion } from './lib/reduced-motion';
import { PWAProvider } from './lib/pwa';
import { trackPageView } from './lib/analytics';
import { SEOProvider } from './lib/seo';
import Layout from './components/Layout';

// Eager load critical pages for fast initial render
import Home from './pages/Home';

// Lazy load heavy pages for code splitting
const Portfolio = lazy(() => import('./pages/Portfolio'));
const About = lazy(() => import('./pages/About'));
const AppDetail = lazy(() => import('./pages/AppDetail'));
const AppSuite = lazy(() => import('./pages/AppSuite'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

// Lazy load admin pages (rarely accessed)
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminBlogList = lazy(() => import('./pages/admin/blog/index'));
const BlogEditor = lazy(() => import('./pages/admin/blog/editor'));
const AdminAppsList = lazy(() => import('./pages/admin/apps/index'));
const AppEditor = lazy(() => import('./pages/admin/apps/editor'));
const SuiteEditor = lazy(() => import('./pages/admin/apps/suite-editor'));
const AdminProjectsList = lazy(() => import('./pages/admin/projects/index'));
const ProjectEditor = lazy(() => import('./pages/admin/projects/editor'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));

// Minimal loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Track page views on route changes
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Get page title based on route
    const getPageTitle = (pathname: string): string => {
      if (pathname === '/') return 'Home';
      if (pathname === '/portfolio') return 'Portfolio';
      if (pathname === '/about') return 'About';
      if (pathname.startsWith('/blog/')) return 'Blog Post';
      if (pathname.startsWith('/apps/suite/')) return 'App Suite';
      if (pathname.startsWith('/apps/')) return 'App Detail';
      return 'Page';
    };

    trackPageView(location.pathname, getPageTitle(location.pathname));
  }, [location.pathname]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

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

        {/* Redirects for old routes */}
        <Route path="/work" element={<Navigate to="/portfolio" replace />} />
        <Route path="/apps" element={<Navigate to="/portfolio" replace />} />
        <Route path="/contact" element={<Navigate to="/about" replace />} />
        <Route path="/blog" element={<Navigate to="/portfolio?tab=content" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function AdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
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
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Don't track admin routes in analytics
  if (isAdminRoute) {
    return <AdminRoutes />;
  }

  return (
    <>
      <RouteTracker />
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </>
  );
}

function App() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <BrowserRouter>
      <MotionConfig reducedMotion={prefersReducedMotion ? 'always' : 'never'}>
        <ThemeProvider>
          <KeyboardFocusProvider>
            <PWAProvider>
              <AuthProvider>
                <SEOProvider>
                  <AppContent />
                </SEOProvider>
              </AuthProvider>
            </PWAProvider>
          </KeyboardFocusProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}

export default App;
