import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppWindow, FileText, Plus, ArrowRight, FolderKanban } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import AgentPlatformHealth from '@/components/admin/AgentPlatformHealth';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

interface Stats {
  appsCount: number;
  projectsCount: number;
  blogPostsCount: number;
  draftPostsCount: number;
}

const AdminDashboard = () => {
  useSEO({ title: 'Admin Dashboard', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [stats, setStats] = useState<Stats>({
    appsCount: 0,
    projectsCount: 0,
    blogPostsCount: 0,
    draftPostsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const [appsResult, projectsResult, postsResult, draftsResult] = await Promise.all([
          supabase.from('apps').select('id', { count: 'exact', head: true }),
          supabase.from('projects').select('id', { count: 'exact', head: true }),
          supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        ]);

        setStats({
          appsCount: appsResult.count ?? 0,
          projectsCount: projectsResult.count ?? 0,
          blogPostsCount: postsResult.count ?? 0,
          draftPostsCount: draftsResult.count ?? 0,
        });
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), { context: 'Dashboard.fetchStats' });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();

  }, [supabase]);

  const statCards = [
    {
      label: 'Apps',
      value: stats.appsCount,
      icon: AppWindow,
      href: '/admin/apps',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Projects',
      value: stats.projectsCount,
      icon: FolderKanban,
      href: '/admin/projects',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Published Posts',
      value: stats.blogPostsCount,
      icon: FileText,
      href: '/admin/blog',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Draft Posts',
      value: stats.draftPostsCount,
      icon: FileText,
      href: '/admin/blog?status=draft',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your content.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={stat.href}
                  className="block p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-1">
                        {isLoading ? '—' : stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                to="/admin/apps/new"
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Add New App</h3>
                  <p className="text-sm text-muted-foreground">
                    Showcase a new tool
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Link
                to="/admin/projects/new"
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Add Project</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a portfolio project
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                to="/admin/blog/new"
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">Write New Post</h3>
                  <p className="text-sm text-muted-foreground">
                    Share insights
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Agent Platform + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <AgentPlatformHealth />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <AuditLogViewer limit={10} showFilters={true} />
          </motion.div>
        </div>

        {/* View Site Button */}
        <div className="pt-4">
          <Button asChild variant="outline">
            <Link to="/" className="gap-2">
              View Live Site
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
