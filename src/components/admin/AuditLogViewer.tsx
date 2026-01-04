import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Plus, Pencil, Trash2, ExternalLink, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getRecentAuditLogs,
  formatAuditAction,
  formatTableName,
  getChangeSummary,
  type AuditLog,
} from '@/lib/audit';
import { captureException } from '@/lib/sentry';
import { DEFAULT_AUDIT_LOG_LIMIT, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY, ANIMATION } from '@/lib/constants';

interface AuditLogViewerProps {
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

export default function AuditLogViewer({
  limit = DEFAULT_AUDIT_LOG_LIMIT,
  showFilters = true,
  compact = false,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'create' | 'update' | 'delete'>('all');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await getRecentAuditLogs(limit);
        setLogs(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          context: 'AuditLogViewer.fetchLogs',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [limit]);

  const filteredLogs = filter === 'all' ? logs : logs.filter((log) => log.action === filter);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'update':
        return <Pencil className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'update':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'delete':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRecordLink = (log: AuditLog) => {
    if (log.action === 'delete') return null;
    switch (log.table_name) {
      case 'blog_posts':
        return `/admin/blog/${log.record_id}/edit`;
      case 'apps':
        return `/admin/apps/${log.record_id}/edit`;
      case 'projects':
        return `/admin/projects/${log.record_id}/edit`;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
    const diffHours = Math.floor(diffMs / MS_PER_HOUR);
    const diffDays = Math.floor(diffMs / MS_PER_DAY);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>

        {showFilters && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {(['all', 'create', 'update', 'delete'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
                className="h-7 px-2 text-xs capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        )}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No activity to show
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, index) => {
            const link = getRecordLink(log);

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * ANIMATION.staggerDelay }}
                className={`flex items-start gap-3 ${compact ? 'py-2' : 'p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors'}`}
              >
                <div className={`p-2 rounded-full ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={getActionColor(log.action)}>
                      {formatAuditAction(log.action)}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {formatTableName(log.table_name)}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {getChangeSummary(log)}
                  </p>

                  {!compact && log.user_email && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {log.user_email}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </span>
                  {link && (
                    <Link to={link} className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
