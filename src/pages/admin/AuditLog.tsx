import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Activity,
  AlertTriangle,
  Download,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  User,
  Bot,
  Settings,
  Zap,
  Loader2,
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getAuditEvents,
  getAuditStats,
  exportAuditEvents,
  type AuditEventFilters,
} from '@/lib/audit-queries';
import type { AuditLogEntry, AuditLogActorType } from '@/lib/schemas';

// Actor type icons
const actorIcons: Record<AuditLogActorType, typeof User> = {
  user: User,
  agent: Bot,
  system: Settings,
  scheduler: Clock,
};

// Actor type colors
const actorColors: Record<AuditLogActorType, string> = {
  user: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  agent: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  system: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
  scheduler: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
};

// Action category colors (based on action prefix)
const actionColors: Record<string, string> = {
  auth: 'text-blue-500',
  agent: 'text-green-500',
  workflow: 'text-green-500',
  credential: 'text-orange-500',
  error: 'text-red-500',
  failed: 'text-red-500',
  default: 'text-foreground',
};

function getActionColor(action: string): string {
  const prefix = action.split('.')[0] || '';
  if (prefix.includes('error') || prefix.includes('failed')) return actionColors.error;
  if (prefix === 'auth') return actionColors.auth;
  if (prefix === 'agent' || prefix === 'workflow') return actionColors.agent;
  if (prefix === 'credential') return actionColors.credential;
  return actionColors.default;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function truncateId(id: string | null, length = 8): string {
  if (!id) return '-';
  return id.length > length ? `${id.slice(0, length)}...` : id;
}

// Date range presets
const datePresets = [
  { label: 'Last hour', value: 'hour' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Custom', value: 'custom' },
];

function getDateRange(preset: string): { start: string; end: string } | null {
  const now = new Date();
  const end = now.toISOString();

  switch (preset) {
    case 'hour':
      return { start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), end };
    case '24h':
      return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), end };
    case '7d':
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), end };
    case '30d':
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), end };
    default:
      return null;
  }
}

export default function AuditLog() {
  useSEO({ title: 'Audit Log', noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [actorTypeFilter, setActorTypeFilter] = useState<AuditLogActorType | ''>('');
  const [dateRangePreset, setDateRangePreset] = useState('24h');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  // Data state
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hasNewEvents, setHasNewEvents] = useState(false);

  // Infinite scroll state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Build filter object
  const buildFilters = useCallback((): AuditEventFilters => {
    const filters: AuditEventFilters = {};

    if (actorTypeFilter) {
      filters.actor_type = actorTypeFilter;
    }

    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    // Date range
    if (dateRangePreset === 'custom' && customDateStart && customDateEnd) {
      filters.date_range = {
        start: new Date(customDateStart).toISOString(),
        end: new Date(customDateEnd).toISOString(),
      };
    } else if (dateRangePreset !== 'custom') {
      const range = getDateRange(dateRangePreset);
      if (range) {
        filters.date_range = range;
      }
    }

    return filters;
  }, [actorTypeFilter, searchQuery, dateRangePreset, customDateStart, customDateEnd]);

  // Load events
  const loadEvents = useCallback(
    async (reset = false) => {
      if (!supabase) return;

      try {
        setLoading(true);
        const filters = buildFilters();
        const currentOffset = reset ? 0 : offset;

        const data = await getAuditEvents(
          { ...filters, limit: 50, offset: currentOffset },
          supabase
        );

        if (reset) {
          setEvents(data);
          setOffset(data.length);
          setHasMore(data.length === 50);
        } else {
          setEvents((prev) => [...prev, ...data]);
          setOffset((prev) => prev + data.length);
          setHasMore(data.length === 50);
        }

        setTotalCount((prev) => (reset ? data.length : prev + data.length));
        setHasNewEvents(false);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)));
        console.error('Failed to load audit events:', error);
      } finally {
        setLoading(false);
      }
    },
    [supabase, buildFilters, offset]
  );

  // Initial load and filter changes
  useEffect(() => {
    loadEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, actorTypeFilter, searchQuery, dateRangePreset, customDateStart, customDateEnd]);

  // Real-time subscription for new events indicator
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('audit_log_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, () => {
        setHasNewEvents(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadEvents(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loading, hasMore, loadEvents]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setActorTypeFilter('');
    setDateRangePreset('24h');
    setCustomDateStart('');
    setCustomDateEnd('');
  };

  const hasFilters =
    searchQuery || actorTypeFilter || dateRangePreset !== '24h' || customDateStart || customDateEnd;

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Set correlation filter
  const filterByCorrelation = (correlationId: string) => {
    setSearchQuery('');
    setActorTypeFilter('');
    setDateRangePreset('24h');
    setCustomDateStart('');
    setCustomDateEnd('');
    // Use search filter for correlation ID
    setSearchQuery(correlationId);
  };

  // Export JSON
  const handleExportJSON = async () => {
    if (!supabase) return;

    try {
      const filters = buildFilters();
      const data = await exportAuditEvents(filters, supabase);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)));
      console.error('Failed to export audit events:', error);
    }
  };

  if (authLoading || !supabase) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Audit Log</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {totalCount > 0 ? `${totalCount} events` : 'Platform activity and security events'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasNewEvents && (
              <Button variant="outline" size="sm" onClick={() => loadEvents(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                New events
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportJSON} disabled={events.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-4 bg-card border-border rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Filters</h2>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search action, resource type, or resource ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Actor Type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Actor Type</label>
                <select
                  value={actorTypeFilter}
                  onChange={(e) => setActorTypeFilter(e.target.value as AuditLogActorType | '')}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                >
                  <option value="">All</option>
                  <option value="user">User</option>
                  <option value="agent">Agent</option>
                  <option value="system">System</option>
                  <option value="scheduler">Scheduler</option>
                </select>
              </div>

              {/* Date Range Preset */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Date Range</label>
                <select
                  value={dateRangePreset}
                  onChange={(e) => setDateRangePreset(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                >
                  {datePresets.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom date inputs (shown when custom is selected) */}
              {dateRangePreset === 'custom' && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Start Date</label>
                    <input
                      type="datetime-local"
                      value={customDateStart}
                      onChange={(e) => setCustomDateStart(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">End Date</label>
                    <input
                      type="datetime-local"
                      value={customDateEnd}
                      onChange={(e) => setCustomDateEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Preset Filter Chips */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('auth');
                  setDateRangePreset('24h');
                }}
                className="text-xs"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Auth failures (24h)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('credential');
                }}
                className="text-xs"
              >
                <Shield className="w-3 h-3 mr-1" />
                Credential access
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('error');
                }}
                className="text-xs"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Workflow errors
              </Button>
            </div>
          </div>
        </Card>

        {/* Events Table */}
        <Card className="bg-card border-border rounded-lg overflow-hidden">
          {loading && events.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events found</h3>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? 'Try adjusting your filters' : 'Audit events will appear here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Timestamp
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Actor
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Action
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Resource
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Details
                      </th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <AnimatePresence>
                      {events.map((event, index) => {
                        const isExpanded = expandedRows.has(event.id);
                        const ActorIcon = actorIcons[event.actor_type];

                        return (
                          <motion.tr
                            key={event.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td colSpan={6} className="p-0">
                              <div>
                                {/* Main row */}
                                <div className="flex items-center px-4 py-3">
                                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                                    {/* Timestamp */}
                                    <div className="group relative">
                                      <div className="text-sm text-foreground font-medium">
                                        {getRelativeTime(event.timestamp)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatTimestamp(event.timestamp)}
                                      </div>
                                    </div>

                                    {/* Actor */}
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={actorColors[event.actor_type]}>
                                        <ActorIcon className="w-3 h-3 mr-1" />
                                        {event.actor_type}
                                      </Badge>
                                      {event.actor_id && (
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {truncateId(event.actor_id)}
                                        </span>
                                      )}
                                    </div>

                                    {/* Action */}
                                    <div className={`text-sm font-medium ${getActionColor(event.action)}`}>
                                      {event.action}
                                    </div>

                                    {/* Resource */}
                                    <div>
                                      {event.resource_type && (
                                        <>
                                          <div className="text-sm text-muted-foreground">
                                            {event.resource_type}
                                          </div>
                                          {event.resource_id && (
                                            <div className="text-xs text-muted-foreground font-mono">
                                              {truncateId(event.resource_id)}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>

                                    {/* Preview */}
                                    <div className="text-xs text-muted-foreground">
                                      {event.details && Object.keys(event.details).length > 0 ? (
                                        <span>{Object.keys(event.details).length} fields</span>
                                      ) : (
                                        <span>-</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Expand button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRow(event.id)}
                                    className="ml-2 p-1 h-auto"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>

                                {/* Expanded details panel */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-4 border-t border-border bg-muted/30">
                                        <div className="pt-4 space-y-4">
                                          {/* Metadata */}
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {event.correlation_id && (
                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">
                                                  Correlation ID
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    onClick={() => filterByCorrelation(event.correlation_id!)}
                                                    className="text-xs font-mono text-primary hover:underline"
                                                    title="Filter by this correlation ID"
                                                  >
                                                    {truncateId(event.correlation_id, 12)}
                                                  </button>
                                                  <button
                                                    onClick={() => copyToClipboard(event.correlation_id!)}
                                                    className="p-1 hover:bg-background rounded transition-colors"
                                                  >
                                                    <Copy className="w-3 h-3" />
                                                  </button>
                                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                                </div>
                                              </div>
                                            )}

                                            {event.ip_address && (
                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">IP Address</div>
                                                <div className="text-xs font-mono">{event.ip_address}</div>
                                              </div>
                                            )}

                                            {event.user_agent && (
                                              <div className="col-span-2">
                                                <div className="text-xs text-muted-foreground mb-1">User Agent</div>
                                                <div className="text-xs font-mono truncate" title={event.user_agent}>
                                                  {event.user_agent}
                                                </div>
                                              </div>
                                            )}

                                            <div>
                                              <div className="text-xs text-muted-foreground mb-1">Event ID</div>
                                              <div className="flex items-center gap-1">
                                                <span className="text-xs font-mono">{truncateId(event.id, 12)}</span>
                                                <button
                                                  onClick={() => copyToClipboard(event.id)}
                                                  className="p-1 hover:bg-background rounded transition-colors"
                                                  title="Copy event ID"
                                                >
                                                  <Copy className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          {/* JSON Details */}
                                          {event.details && Object.keys(event.details).length > 0 && (
                                            <div>
                                              <div className="text-xs text-muted-foreground mb-2 font-semibold">
                                                Full Details
                                              </div>
                                              <pre className="text-xs bg-background border border-border rounded-lg p-4 overflow-auto max-h-64 font-mono">
                                                {JSON.stringify(event.details, null, 2)}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Infinite scroll loader */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex items-center justify-center py-6 border-t border-border">
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <span className="text-sm text-muted-foreground">Scroll to load more...</span>
                  )}
                </div>
              )}

              {!hasMore && events.length > 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground border-t border-border">
                  No more events to load
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
