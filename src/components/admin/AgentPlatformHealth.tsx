import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, GitBranch, Plug, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { getAgentPlatformStats, type AgentPlatformStats } from '@/lib/agent-platform-queries';
import { captureException } from '@/lib/sentry';

export default function AgentPlatformHealth() {
  const { supabase } = useAuthenticatedSupabase();
  const [stats, setStats] = useState<AgentPlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getAgentPlatformStats(supabase);
        setStats(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: 'AgentPlatformHealth.fetchStats',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [supabase]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Agent Platform</h3>
        </div>
        <p className="text-sm text-muted-foreground">Unable to load platform stats.</p>
      </Card>
    );
  }

  const items = [
    {
      label: 'Agents',
      value: `${stats.activeAgents}/${stats.totalAgents}`,
      sub: 'active',
      icon: Bot,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/admin/agents',
    },
    {
      label: 'Workflows',
      value: `${stats.activeWorkflows}/${stats.totalWorkflows}`,
      sub: 'active',
      icon: GitBranch,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      href: '/admin/workflows',
    },
    {
      label: 'Integrations',
      value: String(stats.integrations),
      sub: 'connected',
      icon: Plug,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/admin/integrations',
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Agent Platform</h3>
        </div>
        <Link
          to="/admin/agents"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.href}
                className="block p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded ${item.bgColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          Runs (24h): <span className="text-foreground font-medium">{stats.recentRuns}</span>
        </span>
        {stats.failedRuns > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {stats.failedRuns} failed
          </Badge>
        )}
      </div>
    </Card>
  );
}
