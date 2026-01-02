import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './lib/auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Work from './pages/Work';
import About from './pages/About';
import Contact from './pages/Contact';
import Apps from './pages/Apps';
import AppDetail from './pages/AppDetail';
import AppSuite from './pages/AppSuite';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminBlogList from './pages/admin/blog/index';
import BlogEditor from './pages/admin/blog/editor';
import AdminAppsList from './pages/admin/apps/index';
import AppEditor from './pages/admin/apps/editor';
import SuiteEditor from './pages/admin/apps/suite-editor';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Work />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/apps" element={<Apps />} />
        <Route path="/apps/:slug" element={<AppDetail />} />
        <Route path="/apps/suite/:slug" element={<AppSuite />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </AnimatePresence>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/blog" element={<AdminBlogList />} />
      <Route path="/admin/blog/new" element={<BlogEditor />} />
      <Route path="/admin/blog/:id/edit" element={<BlogEditor />} />
      <Route path="/admin/apps" element={<AdminAppsList />} />
      <Route path="/admin/apps/new" element={<AppEditor />} />
      <Route path="/admin/apps/new-suite" element={<SuiteEditor />} />
      <Route path="/admin/apps/:id/edit" element={<AppEditor />} />
      <Route path="/admin/apps/suite/:id/edit" element={<SuiteEditor />} />
    </Routes>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminRoutes />;
  }

  return (
    <Layout>
      <AnimatedRoutes />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
