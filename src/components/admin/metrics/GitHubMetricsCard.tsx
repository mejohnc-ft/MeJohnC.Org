import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  Star,
  GitFork,
  CircleDot,
  GitPullRequest,
  Users,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getAllGitHubMetrics,
  getCommitsPerWeek,
  type GitHubMetrics,
} from '@/lib/github-metrics';
import { MetricsAreaChart } from '@/components/admin/charts';
import { captureException } from '@/lib/sentry';

interface GitHubMetricsCardProps {
  owner: string;
  repo: string;
  token?: string;
  showChart?: boolean;
}

export default function GitHubMetricsCard({
  owner,
  repo,
  token,
  showChart = true,
}: GitHubMetricsCardProps) {
  const [metrics, setMetrics] = useState<GitHubMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const data = await getAllGitHubMetrics(owner, repo, token);
      setMetrics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch GitHub metrics';
      setError(message);
      captureException(err instanceof Error ? err : new Error(message), {
        context: 'GitHubMetricsCard.fetchMetrics',
        extra: { owner, repo },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [owner, repo, token]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMetrics();
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

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!metrics) return null;

  const commitChartData = getCommitsPerWeek(metrics.commitActivity).map((d) => ({
    timestamp: d.date,
    value: d.commits,
  }));

  const stats = [
    { label: 'Stars', value: metrics.repo.stargazers_count, icon: Star, color: 'text-yellow-500' },
    { label: 'Forks', value: metrics.repo.forks_count, icon: GitFork, color: 'text-blue-500' },
    { label: 'Open Issues', value: metrics.openIssues.length, icon: CircleDot, color: 'text-green-500' },
    { label: 'Open PRs', value: metrics.openPullRequests.length, icon: GitPullRequest, color: 'text-purple-500' },
    { label: 'Contributors', value: metrics.contributors.length, icon: Users, color: 'text-orange-500' },
  ];

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Github className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{metrics.repo.full_name}</h3>
            <p className="text-xs text-muted-foreground">
              Last push: {new Date(metrics.repo.pushed_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <a
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="text-center"
          >
            <div className={`flex justify-center mb-1 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold text-foreground">{stat.value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Commit Activity Chart */}
      {showChart && commitChartData.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Weekly Commit Activity</h4>
          <MetricsAreaChart
            data={commitChartData}
            dataKey="value"
            height={150}
            showGrid={false}
            color="hsl(var(--primary))"
          />
        </div>
      )}

      {/* Recent Activity */}
      {metrics.recentCommits.length > 0 && (
        <div className="pt-4 border-t border-border mt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Recent Commits</h4>
          <div className="space-y-2">
            {metrics.recentCommits.slice(0, 5).map((commit) => (
              <div
                key={commit.sha}
                className="flex items-start gap-2 text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0">
                  {commit.author?.avatar_url ? (
                    <img
                      src={commit.author.avatar_url}
                      alt={commit.author.login}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      ?
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground truncate">
                    {commit.commit.message.split('\n')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {commit.author?.login || commit.commit.author.name} •{' '}
                    {new Date(commit.commit.author.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open PRs */}
      {metrics.openPullRequests.length > 0 && (
        <div className="pt-4 border-t border-border mt-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Open Pull Requests</h4>
          <div className="space-y-2">
            {metrics.openPullRequests.slice(0, 3).map((pr) => (
              <div
                key={pr.id}
                className="flex items-center gap-2 text-sm"
              >
                <GitPullRequest className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-muted-foreground">#{pr.number}</span>
                <span className="text-foreground truncate flex-1">{pr.title}</span>
                <Badge variant="outline" className="text-xs">
                  {pr.user.login}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
