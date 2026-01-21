import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  RefreshCw,
  FileText,
  Users,
  Bookmark,
  AppWindow,
  FolderKanban,
  Newspaper,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { getSupabaseTableStats, type SupabaseTableStats } from '@/lib/metrics-queries';
import { MetricsBarChart } from '@/components/admin/charts';
import { captureException } from '@/lib/sentry';

interface SupabaseStatsCardProps {
  showChart?: boolean;
}

const TABLE_CONFIG: Record<string, { label: string; icon: typeof Database; color: string }> = {
  apps: { label: 'Apps', icon: AppWindow, color: 'text-blue-500' },
  projects: { label: 'Projects', icon: FolderKanban, color: 'text-purple-500' },
  blog_posts: { label: 'Blog Posts', icon: FileText, color: 'text-green-500' },
  contacts: { label: 'Contacts', icon: Users, color: 'text-orange-500' },
  bookmarks: { label: 'Bookmarks', icon: Bookmark, color: 'text-pink-500' },
  news_articles: { label: 'News', icon: Newspaper, color: 'text-cyan-500' },
};

export default function SupabaseStatsCard({ showChart = true }: SupabaseStatsCardProps) {
  const { supabase } = useAuthenticatedSupabase();
  const [stats, setStats] = useState<SupabaseTableStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!supabase) return;

    try {
      const data = await getSupabaseTableStats(supabase);
      setStats(data);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'SupabaseStatsCard.fetchStats',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  const totalRows = stats.reduce((sum, s) => sum + s.count, 0);

  const chartData = stats.map((s) => ({
    label: TABLE_CONFIG[s.table]?.label || s.table,
    value: s.count,
  }));

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Database className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Supabase Database</h3>
            <p className="text-xs text-muted-foreground">
              {totalRows.toLocaleString()} total rows
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((stat, index) => {
          const config = TABLE_CONFIG[stat.table] || {
            label: stat.table,
            icon: Database,
            color: 'text-gray-500',
          };
          const Icon = config.icon;

          return (
            <motion.div
              key={stat.table}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="text-center p-3 rounded-lg bg-muted/50"
            >
              <div className={`flex justify-center mb-1 ${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {stat.count.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">{config.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Bar Chart */}
      {showChart && chartData.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Row Distribution</h4>
          <MetricsBarChart
            data={chartData}
            dataKey="value"
            height={200}
            showGrid={false}
            color="hsl(var(--primary))"
          />
        </div>
      )}
    </Card>
  );
}
