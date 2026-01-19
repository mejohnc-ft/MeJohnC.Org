import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Users, Send, TrendingUp, Star, FileText, Sparkles } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getMarketingStats } from '@/lib/marketing-queries';
import type { MarketingStats } from '@/lib/schemas';

const Marketing = () => {
  useSEO({ title: 'Marketing Dashboard', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getMarketingStats(supabase);
        setStats(data);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'Marketing.fetchStats',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [supabase]);

  const statCards = [
    {
      label: 'Active Subscribers',
      value: stats?.active_subscribers ?? 0,
      total: stats?.total_subscribers ?? 0,
      icon: Users,
      href: '/admin/marketing/subscribers',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Campaigns Sent',
      value: stats?.sent_campaigns ?? 0,
      total: stats?.total_campaigns ?? 0,
      icon: Send,
      href: '/admin/marketing/campaigns',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Avg Open Rate',
      value: `${stats?.avg_open_rate.toFixed(1) ?? '0.0'}%`,
      icon: Mail,
      href: '/admin/marketing/campaigns',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'NPS Score',
      value: stats?.nps_score?.toFixed(0) ?? 'N/A',
      icon: TrendingUp,
      href: '/admin/marketing/nps',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const quickActions = [
    {
      title: 'Create Campaign',
      description: 'Send email to subscribers',
      icon: Mail,
      href: '/admin/marketing/campaigns/new',
      color: 'text-blue-500',
    },
    {
      title: 'Email Templates',
      description: 'Manage email templates',
      icon: FileText,
      href: '/admin/marketing/templates',
      color: 'text-purple-500',
    },
    {
      title: 'AI Content Helper',
      description: 'Generate marketing copy',
      icon: Sparkles,
      href: '/admin/marketing/ai-suggestions',
      color: 'text-pink-500',
    },
    {
      title: 'NPS Surveys',
      description: 'Collect customer feedback',
      icon: Star,
      href: '/admin/marketing/nps',
      color: 'text-yellow-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketing Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage email campaigns, subscribers, and customer feedback.
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {isLoading ? '—' : stat.value}
                  </p>
                  {'total' in stat && (
                    <p className="text-sm text-muted-foreground mt-1">
                      of {stat.total} total
                    </p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Link
                    to={action.href}
                    className="block p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
                  >
                    <div className={`p-3 rounded-lg bg-${action.color.replace('text-', '')}/10 inline-block mb-3`}>
                      <Icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                    <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Section (placeholder for now) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Campaign Activity</h2>
          <p className="text-muted-foreground text-sm">
            Campaign analytics and recent activity will appear here.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to="/admin/marketing/campaigns">View All Campaigns</Link>
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Marketing;
